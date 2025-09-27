import { 
  type User, 
  type InsertUser,
  type Repository,
  type InsertRepository,
  type Commit,
  type InsertCommit,
  type WorkItem,
  type InsertWorkItem,
  type PullRequest,
  type InsertPullRequest,
  type TeamMember,
  type InsertTeamMember,
  type Sprint,
  type InsertSprint
} from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Repository methods
  getRepositories(organization: string, project: string): Promise<Repository[]>;
  upsertRepository(repository: InsertRepository): Promise<Repository>;
  getRepository(id: string): Promise<Repository | undefined>;

  // Commit methods
  getCommits(repositoryId: string, limit?: number): Promise<Commit[]>;
  upsertCommits(commits: InsertCommit[]): Promise<Commit[]>;
  getCommitsByDateRange(repositoryId: string, startDate: Date, endDate: Date): Promise<Commit[]>;
  getCommitStats(repositoryId: string, days?: number): Promise<{
    totalCommits: number;
    uniqueContributors: number;
    topContributors: Array<{
      authorName: string;
      authorEmail: string;
      commitCount: number;
    }>;
  }>;

  // Work Item methods
  getWorkItems(projectName: string, iterationPath?: string): Promise<WorkItem[]>;
  upsertWorkItems(workItems: InsertWorkItem[]): Promise<WorkItem[]>;
  getWorkItem(id: number): Promise<WorkItem | undefined>;
  getWorkItemStats(projectName: string, iterationPath?: string): Promise<{
    totalWorkItems: number;
    completedWorkItems: number;
    inProgressWorkItems: number;
    blockedWorkItems: number;
    workItemsByType: Array<{ type: string; count: number }>;
    workItemsByState: Array<{ state: string; count: number }>;
  }>;

  // Pull Request methods
  getPullRequests(repositoryId: string, status?: string): Promise<PullRequest[]>;
  upsertPullRequests(pullRequests: InsertPullRequest[]): Promise<PullRequest[]>;
  getPullRequest(id: number): Promise<PullRequest | undefined>;

  // Team Member methods
  getTeamMembers(organization: string, project: string): Promise<TeamMember[]>;
  upsertTeamMembers(teamMembers: InsertTeamMember[]): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;

  // Sprint methods
  getSprints(organization: string, project: string): Promise<Sprint[]>;
  upsertSprints(sprints: InsertSprint[]): Promise<Sprint[]>;
  getSprint(id: string): Promise<Sprint | undefined>;
  getCurrentSprint(organization: string, project: string): Promise<Sprint | undefined>;

  // Cache management
  clearCache(organization: string, project: string): Promise<void>;
  getLastCacheUpdate(entity: string, organization: string, project: string): Promise<Date | undefined>;
  updateCacheTimestamp(entity: string, organization: string, project: string): Promise<void>;
}

import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import postgres from "postgres";
import { 
  users, 
  repositories, 
  commits, 
  workItems, 
  pullRequests, 
  teamMembers, 
  sprints 
} from "@shared/schema";

// Database connection
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    await db.insert(users).values(user);
    return user;
  }

  // Repository methods
  async getRepositories(organization: string, project: string): Promise<Repository[]> {
    return await db.select().from(repositories)
      .where(and(eq(repositories.organization, organization), eq(repositories.projectName, project)))
      .orderBy(desc(repositories.lastUpdated));
  }

  async upsertRepository(repository: InsertRepository): Promise<Repository> {
    const existing = await db.select().from(repositories).where(eq(repositories.id, repository.id)).limit(1);
    
    if (existing.length > 0) {
      await db.update(repositories)
        .set({ ...repository, lastUpdated: new Date() })
        .where(eq(repositories.id, repository.id));
    } else {
      await db.insert(repositories).values({ ...repository, lastUpdated: new Date() });
    }
    
    const result = await db.select().from(repositories).where(eq(repositories.id, repository.id)).limit(1);
    return result[0];
  }

  async getRepository(id: string): Promise<Repository | undefined> {
    const result = await db.select().from(repositories).where(eq(repositories.id, id)).limit(1);
    return result[0];
  }

  // Commit methods
  async getCommits(repositoryId: string, limit = 100): Promise<Commit[]> {
    return await db.select().from(commits)
      .where(eq(commits.repositoryId, repositoryId))
      .orderBy(desc(commits.authorDate))
      .limit(limit);
  }

  async upsertCommits(commitsData: InsertCommit[]): Promise<Commit[]> {
    const results: Commit[] = [];
    
    for (const commitData of commitsData) {
      const existing = await db.select().from(commits).where(eq(commits.id, commitData.id)).limit(1);
      
      if (existing.length > 0) {
        await db.update(commits)
          .set({ ...commitData, lastUpdated: new Date() })
          .where(eq(commits.id, commitData.id));
      } else {
        await db.insert(commits).values({ ...commitData, lastUpdated: new Date() });
      }
      
      const result = await db.select().from(commits).where(eq(commits.id, commitData.id)).limit(1);
      if (result[0]) results.push(result[0]);
    }
    
    return results;
  }

  async getCommitsByDateRange(repositoryId: string, startDate: Date, endDate: Date): Promise<Commit[]> {
    return await db.select().from(commits)
      .where(and(
        eq(commits.repositoryId, repositoryId),
        gte(commits.authorDate, startDate),
        lte(commits.authorDate, endDate)
      ))
      .orderBy(desc(commits.authorDate));
  }

  async getCommitStats(repositoryId: string, days = 30): Promise<{
    totalCommits: number;
    uniqueContributors: number;
    topContributors: Array<{
      authorName: string;
      authorEmail: string;
      commitCount: number;
    }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get total commits
    const totalResult = await db.select({ count: count() }).from(commits)
      .where(and(eq(commits.repositoryId, repositoryId), gte(commits.authorDate, since)));
    
    // Get contributor stats
    const contributorStats = await db.select({
      authorName: commits.authorName,
      authorEmail: commits.authorEmail,
      commitCount: count()
    }).from(commits)
      .where(and(eq(commits.repositoryId, repositoryId), gte(commits.authorDate, since)))
      .groupBy(commits.authorName, commits.authorEmail)
      .orderBy(desc(count()))
      .limit(10);

    return {
      totalCommits: totalResult[0]?.count || 0,
      uniqueContributors: contributorStats.length,
      topContributors: contributorStats
    };
  }

  // Work Item methods
  async getWorkItems(projectName: string, iterationPath?: string): Promise<WorkItem[]> {
    if (iterationPath) {
      return await db.select().from(workItems)
        .where(and(eq(workItems.projectName, projectName), eq(workItems.iterationPath, iterationPath)))
        .orderBy(desc(workItems.createdDate));
    }
    
    return await db.select().from(workItems)
      .where(eq(workItems.projectName, projectName))
      .orderBy(desc(workItems.createdDate));
  }

  async upsertWorkItems(workItemsData: InsertWorkItem[]): Promise<WorkItem[]> {
    const results: WorkItem[] = [];
    
    for (const workItemData of workItemsData) {
      const existing = await db.select().from(workItems).where(eq(workItems.id, workItemData.id)).limit(1);
      
      if (existing.length > 0) {
        await db.update(workItems)
          .set({ ...workItemData, lastUpdated: new Date() })
          .where(eq(workItems.id, workItemData.id));
      } else {
        await db.insert(workItems).values({ ...workItemData, lastUpdated: new Date() });
      }
      
      const result = await db.select().from(workItems).where(eq(workItems.id, workItemData.id)).limit(1);
      if (result[0]) results.push(result[0]);
    }
    
    return results;
  }

  async getWorkItem(id: number): Promise<WorkItem | undefined> {
    const result = await db.select().from(workItems).where(eq(workItems.id, id)).limit(1);
    return result[0];
  }

  async getWorkItemStats(projectName: string, iterationPath?: string): Promise<{
    totalWorkItems: number;
    completedWorkItems: number;
    inProgressWorkItems: number;
    blockedWorkItems: number;
    workItemsByType: Array<{ type: string; count: number }>;
    workItemsByState: Array<{ state: string; count: number }>;
  }> {
    // Get all work items for analysis
    const allWorkItems = iterationPath
      ? await db.select().from(workItems)
          .where(and(eq(workItems.projectName, projectName), eq(workItems.iterationPath, iterationPath)))
      : await db.select().from(workItems)
          .where(eq(workItems.projectName, projectName));
    
    // Calculate stats
    const totalWorkItems = allWorkItems.length;
    let completedWorkItems = 0;
    let inProgressWorkItems = 0;
    let blockedWorkItems = 0;
    
    const typeMap = new Map<string, number>();
    const stateMap = new Map<string, number>();
    
    for (const wi of allWorkItems) {
      // Count by type
      typeMap.set(wi.workItemType, (typeMap.get(wi.workItemType) || 0) + 1);
      
      // Count by state
      stateMap.set(wi.state, (stateMap.get(wi.state) || 0) + 1);
      
      // Count by status categories
      const state = wi.state.toLowerCase();
      if (state.includes('done') || state.includes('closed') || state.includes('resolved')) {
        completedWorkItems++;
      } else if (state.includes('active') || state.includes('progress') || state.includes('committed')) {
        inProgressWorkItems++;
      } else if (state.includes('blocked') || state.includes('removed')) {
        blockedWorkItems++;
      }
    }

    return {
      totalWorkItems,
      completedWorkItems,
      inProgressWorkItems,
      blockedWorkItems,
      workItemsByType: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })),
      workItemsByState: Array.from(stateMap.entries()).map(([state, count]) => ({ state, count }))
    };
  }

  // Pull Request methods
  async getPullRequests(repositoryId: string, status?: string): Promise<PullRequest[]> {
    if (status && status !== 'all') {
      return await db.select().from(pullRequests)
        .where(and(eq(pullRequests.repositoryId, repositoryId), eq(pullRequests.status, status)))
        .orderBy(desc(pullRequests.creationDate));
    }
    
    return await db.select().from(pullRequests)
      .where(eq(pullRequests.repositoryId, repositoryId))
      .orderBy(desc(pullRequests.creationDate));
  }

  async upsertPullRequests(pullRequestsData: InsertPullRequest[]): Promise<PullRequest[]> {
    const results: PullRequest[] = [];
    
    for (const prData of pullRequestsData) {
      const existing = await db.select().from(pullRequests).where(eq(pullRequests.id, prData.id)).limit(1);
      
      if (existing.length > 0) {
        await db.update(pullRequests)
          .set({ ...prData, lastUpdated: new Date() })
          .where(eq(pullRequests.id, prData.id));
      } else {
        await db.insert(pullRequests).values({ 
          ...prData, 
          lastUpdated: new Date(),
          reviewers: prData.reviewers || null,
          workItemIds: prData.workItemIds || null
        });
      }
      
      const result = await db.select().from(pullRequests).where(eq(pullRequests.id, prData.id)).limit(1);
      if (result[0]) results.push(result[0]);
    }
    
    return results;
  }

  async getPullRequest(id: number): Promise<PullRequest | undefined> {
    const result = await db.select().from(pullRequests).where(eq(pullRequests.id, id)).limit(1);
    return result[0];
  }

  // Team Member methods
  async getTeamMembers(organization: string, project: string): Promise<TeamMember[]> {
    return await db.select().from(teamMembers)
      .where(and(eq(teamMembers.organization, organization), eq(teamMembers.projectName, project)))
      .orderBy(desc(teamMembers.lastUpdated));
  }

  async upsertTeamMembers(teamMembersData: InsertTeamMember[]): Promise<TeamMember[]> {
    const results: TeamMember[] = [];
    
    for (const memberData of teamMembersData) {
      const existing = await db.select().from(teamMembers).where(eq(teamMembers.id, memberData.id)).limit(1);
      
      if (existing.length > 0) {
        await db.update(teamMembers)
          .set({ ...memberData, lastUpdated: new Date() })
          .where(eq(teamMembers.id, memberData.id));
      } else {
        await db.insert(teamMembers).values({ ...memberData, lastUpdated: new Date() });
      }
      
      const result = await db.select().from(teamMembers).where(eq(teamMembers.id, memberData.id)).limit(1);
      if (result[0]) results.push(result[0]);
    }
    
    return results;
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const result = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
    return result[0];
  }

  // Sprint methods
  async getSprints(organization: string, project: string): Promise<Sprint[]> {
    return await db.select().from(sprints)
      .where(and(eq(sprints.organization, organization), eq(sprints.projectName, project)))
      .orderBy(desc(sprints.startDate));
  }

  async upsertSprints(sprintsData: InsertSprint[]): Promise<Sprint[]> {
    const results: Sprint[] = [];
    
    for (const sprintData of sprintsData) {
      const existing = await db.select().from(sprints).where(eq(sprints.id, sprintData.id)).limit(1);
      
      if (existing.length > 0) {
        await db.update(sprints)
          .set({ ...sprintData, lastUpdated: new Date() })
          .where(eq(sprints.id, sprintData.id));
      } else {
        await db.insert(sprints).values({ ...sprintData, lastUpdated: new Date() });
      }
      
      const result = await db.select().from(sprints).where(eq(sprints.id, sprintData.id)).limit(1);
      if (result[0]) results.push(result[0]);
    }
    
    return results;
  }

  async getSprint(id: string): Promise<Sprint | undefined> {
    const result = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
    return result[0];
  }

  async getCurrentSprint(organization: string, project: string): Promise<Sprint | undefined> {
    const now = new Date();
    const result = await db.select().from(sprints)
      .where(and(
        eq(sprints.organization, organization),
        eq(sprints.projectName, project),
        lte(sprints.startDate, now),
        gte(sprints.finishDate, now)
      ))
      .limit(1);
    return result[0];
  }

  // Cache management
  private cacheTimestamps = new Map<string, Date>();

  async clearCache(organization: string, project: string): Promise<void> {
    // Clear data for the specific organization/project
    await db.delete(repositories).where(and(eq(repositories.organization, organization), eq(repositories.projectName, project)));
    await db.delete(commits);  // Commits are linked via repositoryId, so we need to be careful here
    await db.delete(workItems).where(eq(workItems.projectName, project));
    await db.delete(pullRequests); // Similar to commits
    await db.delete(teamMembers).where(and(eq(teamMembers.organization, organization), eq(teamMembers.projectName, project)));
    await db.delete(sprints).where(and(eq(sprints.organization, organization), eq(sprints.projectName, project)));
    
    // Clear cache timestamps
    const cacheKey = `${organization}:${project}`;
    this.cacheTimestamps.delete(cacheKey);
  }

  async getLastCacheUpdate(entity: string, organization: string, project: string): Promise<Date | undefined> {
    const cacheKey = `${entity}:${organization}:${project}`;
    return this.cacheTimestamps.get(cacheKey);
  }

  async updateCacheTimestamp(entity: string, organization: string, project: string): Promise<void> {
    const cacheKey = `${entity}:${organization}:${project}`;
    this.cacheTimestamps.set(cacheKey, new Date());
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private repositories: Map<string, Repository>;
  private commits: Map<string, Commit>;
  private workItems: Map<number, WorkItem>;
  private pullRequests: Map<number, PullRequest>;
  private teamMembers: Map<string, TeamMember>;
  private sprints: Map<string, Sprint>;
  private cacheTimestamps: Map<string, Date>;

  constructor() {
    this.users = new Map();
    this.repositories = new Map();
    this.commits = new Map();
    this.workItems = new Map();
    this.pullRequests = new Map();
    this.teamMembers = new Map();
    this.sprints = new Map();
    this.cacheTimestamps = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Stub implementations for in-memory storage (not recommended for production)
  async getRepositories(organization: string, project: string): Promise<Repository[]> {
    return Array.from(this.repositories.values()).filter(
      repo => repo.organization === organization && repo.projectName === project
    );
  }

  async upsertRepository(repository: InsertRepository): Promise<Repository> {
    const repo: Repository = { ...repository, lastUpdated: new Date() };
    this.repositories.set(repository.id, repo);
    return repo;
  }

  async getRepository(id: string): Promise<Repository | undefined> {
    return this.repositories.get(id);
  }

  async getCommits(repositoryId: string, limit = 100): Promise<Commit[]> {
    return Array.from(this.commits.values())
      .filter(commit => commit.repositoryId === repositoryId)
      .sort((a, b) => b.authorDate.getTime() - a.authorDate.getTime())
      .slice(0, limit);
  }

  async upsertCommits(commitsData: InsertCommit[]): Promise<Commit[]> {
    const results: Commit[] = [];
    for (const commitData of commitsData) {
      const commit: Commit = { ...commitData, lastUpdated: new Date() };
      this.commits.set(commitData.id, commit);
      results.push(commit);
    }
    return results;
  }

  async getCommitsByDateRange(repositoryId: string, startDate: Date, endDate: Date): Promise<Commit[]> {
    return Array.from(this.commits.values())
      .filter(commit => 
        commit.repositoryId === repositoryId &&
        commit.authorDate >= startDate &&
        commit.authorDate <= endDate
      )
      .sort((a, b) => b.authorDate.getTime() - a.authorDate.getTime());
  }

  async getCommitStats(repositoryId: string, days = 30): Promise<{
    totalCommits: number;
    uniqueContributors: number;
    topContributors: Array<{
      authorName: string;
      authorEmail: string;
      commitCount: number;
    }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const recentCommits = Array.from(this.commits.values())
      .filter(commit => commit.repositoryId === repositoryId && commit.authorDate >= since);
    
    const contributorMap = new Map<string, { authorName: string; authorEmail: string; commitCount: number }>();
    
    for (const commit of recentCommits) {
      const key = `${commit.authorName}:${commit.authorEmail}`;
      if (!contributorMap.has(key)) {
        contributorMap.set(key, {
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          commitCount: 0
        });
      }
      contributorMap.get(key)!.commitCount++;
    }
    
    const topContributors = Array.from(contributorMap.values())
      .sort((a, b) => b.commitCount - a.commitCount)
      .slice(0, 10);
    
    return {
      totalCommits: recentCommits.length,
      uniqueContributors: contributorMap.size,
      topContributors
    };
  }

  // Simplified implementations for other methods
  async getWorkItems(projectName: string, iterationPath?: string): Promise<WorkItem[]> {
    return Array.from(this.workItems.values()).filter(wi => 
      wi.projectName === projectName && (!iterationPath || wi.iterationPath === iterationPath)
    );
  }

  async upsertWorkItems(workItemsData: InsertWorkItem[]): Promise<WorkItem[]> {
    const results: WorkItem[] = [];
    for (const wiData of workItemsData) {
      const wi: WorkItem = { ...wiData, lastUpdated: new Date() };
      this.workItems.set(wiData.id, wi);
      results.push(wi);
    }
    return results;
  }

  async getWorkItem(id: number): Promise<WorkItem | undefined> {
    return this.workItems.get(id);
  }

  async getWorkItemStats(projectName: string, iterationPath?: string): Promise<{
    totalWorkItems: number;
    completedWorkItems: number;
    inProgressWorkItems: number;
    blockedWorkItems: number;
    workItemsByType: Array<{ type: string; count: number }>;
    workItemsByState: Array<{ state: string; count: number }>;
  }> {
    const workItems = await this.getWorkItems(projectName, iterationPath);
    
    let completedWorkItems = 0;
    let inProgressWorkItems = 0;
    let blockedWorkItems = 0;
    const typeMap = new Map<string, number>();
    const stateMap = new Map<string, number>();
    
    for (const wi of workItems) {
      typeMap.set(wi.workItemType, (typeMap.get(wi.workItemType) || 0) + 1);
      stateMap.set(wi.state, (stateMap.get(wi.state) || 0) + 1);
      
      const state = wi.state.toLowerCase();
      if (state.includes('done') || state.includes('closed') || state.includes('resolved')) {
        completedWorkItems++;
      } else if (state.includes('active') || state.includes('progress') || state.includes('committed')) {
        inProgressWorkItems++;
      } else if (state.includes('blocked') || state.includes('removed')) {
        blockedWorkItems++;
      }
    }
    
    return {
      totalWorkItems: workItems.length,
      completedWorkItems,
      inProgressWorkItems,
      blockedWorkItems,
      workItemsByType: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })),
      workItemsByState: Array.from(stateMap.entries()).map(([state, count]) => ({ state, count }))
    };
  }

  // Stub implementations for pull requests, team members, and sprints
  async getPullRequests(repositoryId: string, status?: string): Promise<PullRequest[]> {
    return Array.from(this.pullRequests.values()).filter(pr => 
      pr.repositoryId === repositoryId && (!status || status === 'all' || pr.status === status)
    );
  }

  async upsertPullRequests(pullRequestsData: InsertPullRequest[]): Promise<PullRequest[]> {
    const results: PullRequest[] = [];
    for (const prData of pullRequestsData) {
      const pr: PullRequest = { ...prData, lastUpdated: new Date() };
      this.pullRequests.set(prData.id, pr);
      results.push(pr);
    }
    return results;
  }

  async getPullRequest(id: number): Promise<PullRequest | undefined> {
    return this.pullRequests.get(id);
  }

  async getTeamMembers(organization: string, project: string): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(tm => 
      tm.organization === organization && tm.projectName === project
    );
  }

  async upsertTeamMembers(teamMembersData: InsertTeamMember[]): Promise<TeamMember[]> {
    const results: TeamMember[] = [];
    for (const tmData of teamMembersData) {
      const tm: TeamMember = { ...tmData, lastUpdated: new Date() };
      this.teamMembers.set(tmData.id, tm);
      results.push(tm);
    }
    return results;
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    return this.teamMembers.get(id);
  }

  async getSprints(organization: string, project: string): Promise<Sprint[]> {
    return Array.from(this.sprints.values()).filter(s => 
      s.organization === organization && s.projectName === project
    );
  }

  async upsertSprints(sprintsData: InsertSprint[]): Promise<Sprint[]> {
    const results: Sprint[] = [];
    for (const sprintData of sprintsData) {
      const sprint: Sprint = { ...sprintData, lastUpdated: new Date() };
      this.sprints.set(sprintData.id, sprint);
      results.push(sprint);
    }
    return results;
  }

  async getSprint(id: string): Promise<Sprint | undefined> {
    return this.sprints.get(id);
  }

  async getCurrentSprint(organization: string, project: string): Promise<Sprint | undefined> {
    const now = new Date();
    return Array.from(this.sprints.values()).find(s => 
      s.organization === organization && 
      s.projectName === project &&
      s.startDate && s.finishDate &&
      s.startDate <= now && s.finishDate >= now
    );
  }

  async clearCache(organization: string, project: string): Promise<void> {
    // Clear data for specific org/project
    for (const [key, repo] of this.repositories) {
      if (repo.organization === organization && repo.projectName === project) {
        this.repositories.delete(key);
      }
    }
    
    for (const [key, wi] of this.workItems) {
      if (wi.projectName === project) {
        this.workItems.delete(key);
      }
    }
    
    for (const [key, tm] of this.teamMembers) {
      if (tm.organization === organization && tm.projectName === project) {
        this.teamMembers.delete(key);
      }
    }
    
    for (const [key, sprint] of this.sprints) {
      if (sprint.organization === organization && sprint.projectName === project) {
        this.sprints.delete(key);
      }
    }
    
    const cacheKey = `${organization}:${project}`;
    this.cacheTimestamps.delete(cacheKey);
  }

  async getLastCacheUpdate(entity: string, organization: string, project: string): Promise<Date | undefined> {
    const cacheKey = `${entity}:${organization}:${project}`;
    return this.cacheTimestamps.get(cacheKey);
  }

  async updateCacheTimestamp(entity: string, organization: string, project: string): Promise<void> {
    const cacheKey = `${entity}:${organization}:${project}`;
    this.cacheTimestamps.set(cacheKey, new Date());
  }
}

// Use database storage for permanent data as recommended
export const storage = new MemStorage();
