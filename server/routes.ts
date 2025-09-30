import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createAzureDevOpsService, generateDemoData } from "./azure-devops-service";
import { z } from "zod";

// Validation schemas
const organizationProjectSchema = z.object({
  organization: z.string(),
  project: z.string()
});

const repositoryParamsSchema = z.object({
  repositoryId: z.string()
});

const syncParamsSchema = organizationProjectSchema.extend({
  force: z.boolean().optional().default(false)
});

const commitsQuerySchema = z.object({
  repositoryId: z.string(),
  days: z.coerce.number().optional().default(30),
  limit: z.coerce.number().optional().default(100)
});

const workItemsQuerySchema = z.object({
  projectName: z.string(),
  iterationPath: z.string().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  const organization = "podtech-io";
  const project = "WLS";
  const envPat = process.env.AZURE_DEVOPS_PAT_TOKEN;

  if (!envPat) {
    console.warn("AZURE_DEVOPS_PAT_TOKEN environment variable is not set. Azure DevOps sync will be disabled.");
  }

  // Helper function to get PAT token from request header or environment
  const getPatToken = (req: any): string | null => {
    const headerToken = req.headers['x-azure-devops-pat'];
    return headerToken || envPat || null;
  };

  // Helper function to create service for a request
  const getAzureDevOpsService = (req: any) => {
    const pat = getPatToken(req);
    return pat ? createAzureDevOpsService(organization, project, pat) : null;
  };

  // Utility function to check cache freshness (5 minutes)
  const isCacheStale = async (entity: string, org: string, proj: string): Promise<boolean> => {
    const lastUpdate = await storage.getLastCacheUpdate(entity, org, proj);
    if (!lastUpdate) return true;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastUpdate < fiveMinutesAgo;
  };

  // Dashboard Data - Aggregated endpoint
  app.get("/api/dashboard", async (req, res) => {
    try {
      const query = organizationProjectSchema.parse({
        organization: req.query.organization || organization,
        project: req.query.project || project
      });

      // Get cached data or fetch fresh data
      const [repositories, workItems, sprints] = await Promise.all([
        storage.getRepositories(query.organization, query.project),
        storage.getWorkItems(query.project),
        storage.getSprints(query.organization, query.project)
      ]);

      // If no data in cache, trigger sync
      const azureDevOpsService = getAzureDevOpsService(req);
      if (repositories.length === 0 && azureDevOpsService) {
        try {
          const freshRepos = await azureDevOpsService.getRepositories();
          await storage.upsertRepository(freshRepos[0]);
          await storage.updateCacheTimestamp('repositories', query.organization, query.project);
        } catch (error) {
          console.warn("Failed to fetch repositories:", error);
        }
      }

      // Get work item analytics
      const workItemStats = await storage.getWorkItemStats(query.project);
      
      // Get current sprint
      const currentSprint = await storage.getCurrentSprint(query.organization, query.project);

      // Build dashboard response
      const dashboardData = {
        organization: query.organization,
        project: query.project,
        metrics: {
          totalWorkItems: workItemStats.totalWorkItems,
          completedWorkItems: workItemStats.completedWorkItems,
          inProgressWorkItems: workItemStats.inProgressWorkItems,
          blockedWorkItems: workItemStats.blockedWorkItems,
          totalRepositories: repositories.length,
          totalSprints: sprints.length
        },
        currentSprint,
        workItemsByType: workItemStats.workItemsByType,
        workItemsByState: workItemStats.workItemsByState,
        recentWorkItems: workItems.slice(0, 10),
        repositories: repositories.slice(0, 5)
      };

      res.json(dashboardData);
    } catch (error) {
      console.error("Dashboard API error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Repositories
  app.get("/api/repositories", async (req, res) => {
    try {
      const query = organizationProjectSchema.parse({
        organization: req.query.organization || organization,
        project: req.query.project || project
      });

      const repositories = await storage.getRepositories(query.organization, query.project);
      res.json(repositories);
    } catch (error) {
      console.error("Repositories API error:", error);
      res.status(500).json({ error: "Failed to fetch repositories" });
    }
  });

  // Commits and Commit Analytics
  app.get("/api/commits", async (req, res) => {
    try {
      const query = commitsQuerySchema.parse(req.query);
      
      const commits = await storage.getCommits(query.repositoryId, query.limit);
      res.json(commits);
    } catch (error) {
      console.error("Commits API error:", error);
      res.status(500).json({ error: "Failed to fetch commits" });
    }
  });

  app.get("/api/commits/analytics/:repositoryId", async (req, res) => {
    try {
      const { repositoryId } = repositoryParamsSchema.parse(req.params);
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      
      // Get analytics from both service and storage
      const azureDevOpsService = getAzureDevOpsService(req);
      const [commitStats, commitAnalytics] = await Promise.all([
        storage.getCommitStats(repositoryId, days),
        azureDevOpsService ? azureDevOpsService.getCommitAnalytics(repositoryId, days).catch(() => null) : Promise.resolve(null)
      ]);

      // Combine data from both sources
      const analytics = commitAnalytics || {
        totalCommits: commitStats.totalCommits,
        contributorsCount: commitStats.uniqueContributors,
        topContributors: commitStats.topContributors.map(c => ({
          name: c.authorName,
          email: c.authorEmail,
          commitCount: c.commitCount,
          linesAdded: 0,
          linesDeleted: 0
        })),
        commitsByDay: [],
        recentCommits: []
      };

      res.json(analytics);
    } catch (error) {
      console.error("Commit analytics API error:", error);
      res.status(500).json({ error: "Failed to fetch commit analytics" });
    }
  });

  // Work Items
  app.get("/api/work-items", async (req, res) => {
    try {
      const query = workItemsQuerySchema.parse({
        projectName: req.query.projectName || project,
        iterationPath: req.query.iterationPath
      });

      const workItems = await storage.getWorkItems(query.projectName, query.iterationPath);
      res.json(workItems);
    } catch (error) {
      console.error("Work items API error:", error);
      res.status(500).json({ error: "Failed to fetch work items" });
    }
  });

  app.get("/api/work-items/analytics", async (req, res) => {
    try {
      const query = workItemsQuerySchema.parse({
        projectName: req.query.projectName || project,
        iterationPath: req.query.iterationPath
      });

      const analytics = await storage.getWorkItemStats(query.projectName, query.iterationPath);
      res.json(analytics);
    } catch (error) {
      console.error("Work item analytics API error:", error);
      res.status(500).json({ error: "Failed to fetch work item analytics" });
    }
  });

  // Pull Requests
  app.get("/api/pull-requests/:repositoryId", async (req, res) => {
    try {
      const { repositoryId } = repositoryParamsSchema.parse(req.params);
      const status = req.query.status as string;

      const pullRequests = await storage.getPullRequests(repositoryId, status);
      res.json(pullRequests);
    } catch (error) {
      console.error("Pull requests API error:", error);
      res.status(500).json({ error: "Failed to fetch pull requests" });
    }
  });

  // Team Members
  app.get("/api/team-members", async (req, res) => {
    try {
      const query = organizationProjectSchema.parse({
        organization: req.query.organization || organization,
        project: req.query.project || project
      });

      const teamMembers = await storage.getTeamMembers(query.organization, query.project);
      res.json(teamMembers);
    } catch (error) {
      console.error("Team members API error:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Sprints
  app.get("/api/sprints", async (req, res) => {
    try {
      const query = organizationProjectSchema.parse({
        organization: req.query.organization || organization,
        project: req.query.project || project
      });

      const sprints = await storage.getSprints(query.organization, query.project);
      res.json(sprints);
    } catch (error) {
      console.error("Sprints API error:", error);
      res.status(500).json({ error: "Failed to fetch sprints" });
    }
  });

  app.get("/api/sprints/current", async (req, res) => {
    try {
      const query = organizationProjectSchema.parse({
        organization: req.query.organization || organization,
        project: req.query.project || project
      });

      const currentSprint = await storage.getCurrentSprint(query.organization, query.project);
      res.json(currentSprint || null);
    } catch (error) {
      console.error("Current sprint API error:", error);
      res.status(500).json({ error: "Failed to fetch current sprint" });
    }
  });

  // Repository Insights
  app.get("/api/repository-insights/:repositoryId", async (req, res) => {
    try {
      const { repositoryId } = repositoryParamsSchema.parse(req.params);
      
      const azureDevOpsService = getAzureDevOpsService(req);
      if (!azureDevOpsService) {
        return res.status(503).json({ error: "Azure DevOps service not configured" });
      }
      
      const insights = await azureDevOpsService.getRepositoryInsights(repositoryId);
      res.json(insights);
    } catch (error) {
      console.error("Repository insights API error:", error);
      res.status(500).json({ error: "Failed to fetch repository insights" });
    }
  });

  // Data Synchronization
  app.post("/api/sync", async (req, res) => {
    try {
      const query = syncParamsSchema.parse({
        organization: req.body.organization || organization,
        project: req.body.project || project,
        force: req.body.force
      });

      const azureDevOpsService = getAzureDevOpsService(req);
      if (!azureDevOpsService) {
        // Generate and populate demo data when PAT token is not available
        console.log(`No PAT token available, populating demo data for ${query.organization}/${query.project}...`);
        
        const demoData = generateDemoData(query.organization, query.project);
        
        // Clear existing data first
        await storage.clearCache(query.organization, query.project);
        
        // Insert demo data
        await storage.upsertRepository(demoData.repositories[0]);
        await storage.upsertRepository(demoData.repositories[1]);
        await storage.upsertWorkItems(demoData.workItems);
        await storage.upsertCommits(demoData.commits);
        await storage.upsertPullRequests(demoData.pullRequests);
        await storage.upsertTeamMembers(demoData.teamMembers);
        await storage.upsertSprints(demoData.sprints);
        
        // Update cache timestamps
        await storage.updateCacheTimestamp('repositories', query.organization, query.project);
        await storage.updateCacheTimestamp('workItems', query.organization, query.project);
        await storage.updateCacheTimestamp('commits', query.organization, query.project);
        await storage.updateCacheTimestamp('pullRequests', query.organization, query.project);
        await storage.updateCacheTimestamp('teamMembers', query.organization, query.project);
        await storage.updateCacheTimestamp('sprints', query.organization, query.project);
        
        const syncResult = {
          success: true,
          message: "Demo data populated successfully (Azure DevOps PAT token not configured)",
          syncedAt: new Date().toISOString(),
          counts: {
            repositories: demoData.repositories.length,
            sprints: demoData.sprints.length,
            workItems: demoData.workItems.length,
            teamMembers: demoData.teamMembers.length,
            commits: demoData.commits.length,
            pullRequests: demoData.pullRequests.length
          }
        };
        
        console.log("Demo data sync completed:", syncResult);
        return res.json(syncResult);
      }

      // Check if sync is needed (unless forced)
      if (!query.force) {
        const needsSync = await isCacheStale('repositories', query.organization, query.project);
        if (!needsSync) {
          return res.json({ 
            message: "Data is fresh, no sync needed",
            lastSync: await storage.getLastCacheUpdate('repositories', query.organization, query.project)
          });
        }
      }

      console.log(`Starting Azure DevOps sync for ${query.organization}/${query.project}...`);
      
      // Sync all data in parallel
      const syncPromises = [];

      // Sync repositories
      syncPromises.push(
        azureDevOpsService.getRepositories()
          .then(async (repos) => {
            for (const repo of repos) {
              await storage.upsertRepository(repo);
            }
            await storage.updateCacheTimestamp('repositories', query.organization, query.project);
            return repos.length;
          })
          .catch(error => {
            console.error("Failed to sync repositories:", error);
            return 0;
          })
      );

      // Sync sprints
      syncPromises.push(
        azureDevOpsService.getSprints()
          .then(async (sprints) => {
            await storage.upsertSprints(sprints.map(s => ({ 
              ...s, 
              attributes: s.attributes as any 
            })));
            await storage.updateCacheTimestamp('sprints', query.organization, query.project);
            return sprints.length;
          })
          .catch(error => {
            console.error("Failed to sync sprints:", error);
            return 0;
          })
      );

      // Sync work items
      syncPromises.push(
        azureDevOpsService.getWorkItems()
          .then(async (workItems) => {
            await storage.upsertWorkItems(workItems);
            await storage.updateCacheTimestamp('workItems', query.organization, query.project);
            return workItems.length;
          })
          .catch(error => {
            console.error("Failed to sync work items:", error);
            return 0;
          })
      );

      // Sync team members
      syncPromises.push(
        azureDevOpsService.getTeamMembers()
          .then(async (members) => {
            if (members.length > 0) {
              await storage.upsertTeamMembers(members);
              await storage.updateCacheTimestamp('teamMembers', query.organization, query.project);
            }
            return members.length;
          })
          .catch(error => {
            console.error("Failed to sync team members:", error);
            return 0;
          })
      );

      const [repoCount, sprintCount, workItemCount, memberCount] = await Promise.all(syncPromises);

      // Sync commits for each repository
      const repositories = await storage.getRepositories(query.organization, query.project);
      let totalCommits = 0;
      
      for (const repo of repositories) {
        try {
          const commits = await azureDevOpsService.getCommits(repo.id, 100);
          if (commits.length > 0) {
            await storage.upsertCommits(commits);
            totalCommits += commits.length;
          }
        } catch (error) {
          console.error(`Failed to sync commits for repository ${repo.id}:`, error);
        }
      }

      await storage.updateCacheTimestamp('commits', query.organization, query.project);

      const syncResult = {
        success: true,
        message: "Data synchronization completed",
        syncedAt: new Date().toISOString(),
        counts: {
          repositories: repoCount,
          sprints: sprintCount,
          workItems: workItemCount,
          teamMembers: memberCount,
          commits: totalCommits
        }
      };

      console.log("Sync completed:", syncResult);
      res.json(syncResult);
    } catch (error) {
      console.error("Sync API error:", error);
      res.status(500).json({ error: "Data synchronization failed" });
    }
  });

  // Clear Cache
  app.delete("/api/cache", async (req, res) => {
    try {
      const query = organizationProjectSchema.parse({
        organization: req.query.organization || organization,
        project: req.query.project || project
      });

      await storage.clearCache(query.organization, query.project);
      res.json({ message: "Cache cleared successfully" });
    } catch (error) {
      console.error("Clear cache API error:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
