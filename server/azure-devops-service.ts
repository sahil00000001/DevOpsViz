import type { 
  Repository, 
  Commit, 
  WorkItem, 
  PullRequest, 
  TeamMember, 
  Sprint 
} from "@shared/schema";

interface AzureDevOpsConfig {
  organization: string;
  project: string;
  pat: string;
}

interface AzureDevOpsApiResponse<T> {
  count: number;
  value: T[];
}

interface CommitAnalytics {
  totalCommits: number;
  contributorsCount: number;
  topContributors: Array<{
    name: string;
    email: string;
    commitCount: number;
    linesAdded: number;
    linesDeleted: number;
  }>;
  commitsByDay: Array<{
    date: string;
    count: number;
  }>;
  recentCommits: Commit[];
}

interface WorkItemAnalytics {
  totalWorkItems: number;
  completedWorkItems: number;
  inProgressWorkItems: number;
  blockedWorkItems: number;
  workItemsByType: Array<{
    type: string;
    count: number;
  }>;
  workItemsByState: Array<{
    state: string;
    count: number;
  }>;
}

export class AzureDevOpsService {
  private config: AzureDevOpsConfig;
  private baseUrl: string;

  constructor(organization: string, project: string, pat: string) {
    this.config = { organization, project, pat };
    this.baseUrl = `https://dev.azure.com/${organization}/${project}/_apis`;
  }

  private getAuthHeaders() {
    const token = Buffer.from(`:${this.config.pat}`).toString('base64');
    return {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  private async makeRequest<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Azure DevOps API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Azure DevOps API request failed:', error);
      throw error;
    }
  }

  // Repository Management
  async getRepositories(): Promise<Repository[]> {
    const url = `${this.baseUrl}/git/repositories?api-version=7.1`;
    const response = await this.makeRequest<AzureDevOpsApiResponse<any>>(url);
    
    return response.value.map(repo => ({
      id: repo.id,
      name: repo.name,
      projectId: repo.project.id,
      projectName: repo.project.name,
      organization: this.config.organization,
      defaultBranch: repo.defaultBranch,
      size: repo.size,
      url: repo.url,
      webUrl: repo.webUrl,
      createdDate: repo.project.lastUpdateTime ? new Date(repo.project.lastUpdateTime) : null,
      lastUpdated: new Date()
    }));
  }

  // Commit Management
  async getCommits(repositoryId: string, top = 100, skip = 0): Promise<Commit[]> {
    const url = `${this.baseUrl}/git/repositories/${repositoryId}/commits?$top=${top}&$skip=${skip}&api-version=7.1`;
    const response = await this.makeRequest<AzureDevOpsApiResponse<any>>(url);
    
    return response.value.map(commit => ({
      id: `${repositoryId}-${commit.commitId}`,
      commitId: commit.commitId,
      repositoryId,
      authorName: commit.author.name,
      authorEmail: commit.author.email,
      authorDate: new Date(commit.author.date),
      committerName: commit.committer.name,
      committerEmail: commit.committer.email,
      committerDate: new Date(commit.committer.date),
      comment: commit.comment,
      commentTruncated: commit.commentTruncated || false,
      changeCounts: commit.changeCounts || { Add: 0, Edit: 0, Delete: 0 },
      url: commit.url,
      remoteUrl: commit.remoteUrl,
      lastUpdated: new Date()
    }));
  }

  async getCommitAnalytics(repositoryId: string, days = 30): Promise<CommitAnalytics> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    // Get commits for the specified period
    const commits = await this.getCommits(repositoryId, 1000);
    const recentCommits = commits.filter(commit => 
      commit.authorDate >= since
    );

    // Calculate contributor statistics
    const contributorMap = new Map<string, {
      name: string;
      email: string;
      commitCount: number;
      linesAdded: number;
      linesDeleted: number;
    }>();

    const commitsByDayMap = new Map<string, number>();

    for (const commit of recentCommits) {
      const authorKey = `${commit.authorName}:${commit.authorEmail}`;
      const dateKey = commit.authorDate.toISOString().split('T')[0];

      // Track contributors
      if (!contributorMap.has(authorKey)) {
        contributorMap.set(authorKey, {
          name: commit.authorName,
          email: commit.authorEmail,
          commitCount: 0,
          linesAdded: 0,
          linesDeleted: 0
        });
      }
      
      const contributor = contributorMap.get(authorKey)!;
      contributor.commitCount++;
      contributor.linesAdded += commit.changeCounts?.Add || 0;
      contributor.linesDeleted += commit.changeCounts?.Delete || 0;

      // Track commits by day
      commitsByDayMap.set(dateKey, (commitsByDayMap.get(dateKey) || 0) + 1);
    }

    // Convert to arrays and sort
    const topContributors = Array.from(contributorMap.values())
      .sort((a, b) => b.commitCount - a.commitCount)
      .slice(0, 10);

    const commitsByDay = Array.from(commitsByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCommits: commits.length,
      contributorsCount: contributorMap.size,
      topContributors,
      commitsByDay,
      recentCommits: recentCommits.slice(0, 10)
    };
  }

  // Work Item Management
  async getWorkItems(iterationPath?: string): Promise<WorkItem[]> {
    try {
      // Simple WIQL query to get work items
      let wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${this.config.project}'`;
      
      if (iterationPath) {
        wiqlQuery += ` AND [System.IterationPath] UNDER '${iterationPath}'`;
      }
      
      wiqlQuery += ` ORDER BY [System.ChangedDate] DESC`;

      console.log('Executing WIQL query:', wiqlQuery);

      const wiqlUrl = `${this.baseUrl}/wit/wiql?api-version=7.1`;
      const wiqlResponse = await fetch(wiqlUrl, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ query: wiqlQuery })
      });

      if (!wiqlResponse.ok) {
        const errorText = await wiqlResponse.text();
        console.error(`Work Item Query failed: ${wiqlResponse.status} ${wiqlResponse.statusText}`, errorText);
        return [];
      }

      const wiqlResult = await wiqlResponse.json();
      console.log('WIQL result:', wiqlResult);
      
      if (!wiqlResult.workItems || wiqlResult.workItems.length === 0) {
        console.log('No work items found in WIQL result');
        return [];
      }

      // Get work item IDs (limit to first 200 for performance)
      const workItemIds = wiqlResult.workItems.slice(0, 200).map((wi: any) => wi.id);
      const idsParam = workItemIds.join(',');
      
      console.log(`Fetching details for ${workItemIds.length} work items`);
      
      // Get detailed work item data
      const workItemsUrl = `${this.baseUrl}/wit/workitems?ids=${idsParam}&$expand=Fields&api-version=7.1`;
      const workItemsResponse = await this.makeRequest<AzureDevOpsApiResponse<any>>(workItemsUrl);

      return workItemsResponse.value.map(wi => ({
        id: wi.id,
        rev: wi.rev,
        projectName: this.config.project,
        areaPath: wi.fields['System.AreaPath'],
        iterationPath: wi.fields['System.IterationPath'],
        workItemType: wi.fields['System.WorkItemType'],
        state: wi.fields['System.State'],
        reason: wi.fields['System.Reason'],
        title: wi.fields['System.Title'],
        assignedToName: wi.fields['System.AssignedTo']?.displayName,
        assignedToEmail: wi.fields['System.AssignedTo']?.uniqueName,
        assignedToImageUrl: wi.fields['System.AssignedTo']?._links?.avatar?.href,
        createdDate: new Date(wi.fields['System.CreatedDate']),
        createdByName: wi.fields['System.CreatedBy']?.displayName,
        createdByEmail: wi.fields['System.CreatedBy']?.uniqueName,
        changedDate: wi.fields['System.ChangedDate'] ? new Date(wi.fields['System.ChangedDate']) : null,
        description: wi.fields['System.Description'],
        acceptanceCriteria: wi.fields['Microsoft.VSTS.Common.AcceptanceCriteria'],
        storyPoints: wi.fields['Microsoft.VSTS.Scheduling.StoryPoints'],
        priority: wi.fields['System.Priority'],
        severity: wi.fields['Microsoft.VSTS.Common.Severity'],
        tags: wi.fields['System.Tags'] ? wi.fields['System.Tags'].split(';').map((tag: string) => tag.trim()) : [],
        url: wi.url,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Failed to fetch work items:', error);
      return [];
    }
  }

  async getWorkItemAnalytics(iterationPath?: string): Promise<WorkItemAnalytics> {
    const workItems = await this.getWorkItems(iterationPath);
    
    const workItemsByType = new Map<string, number>();
    const workItemsByState = new Map<string, number>();
    
    let completedCount = 0;
    let inProgressCount = 0;
    let blockedCount = 0;

    for (const wi of workItems) {
      // Count by type
      workItemsByType.set(wi.workItemType, (workItemsByType.get(wi.workItemType) || 0) + 1);
      
      // Count by state
      workItemsByState.set(wi.state, (workItemsByState.get(wi.state) || 0) + 1);
      
      // Count by status categories
      const state = wi.state.toLowerCase();
      if (state.includes('done') || state.includes('closed') || state.includes('resolved')) {
        completedCount++;
      } else if (state.includes('active') || state.includes('progress') || state.includes('committed')) {
        inProgressCount++;
      } else if (state.includes('blocked') || state.includes('removed')) {
        blockedCount++;
      }
    }

    return {
      totalWorkItems: workItems.length,
      completedWorkItems: completedCount,
      inProgressWorkItems: inProgressCount,
      blockedWorkItems: blockedCount,
      workItemsByType: Array.from(workItemsByType.entries()).map(([type, count]) => ({ type, count })),
      workItemsByState: Array.from(workItemsByState.entries()).map(([state, count]) => ({ state, count }))
    };
  }

  // Pull Request Management
  async getPullRequests(repositoryId: string, status = 'all'): Promise<PullRequest[]> {
    const statusFilter = status !== 'all' ? `&searchCriteria.status=${status}` : '';
    const url = `${this.baseUrl}/git/repositories/${repositoryId}/pullrequests?api-version=7.1${statusFilter}`;
    const response = await this.makeRequest<AzureDevOpsApiResponse<any>>(url);
    
    return response.value.map(pr => ({
      id: parseInt(`${repositoryId.slice(-4)}${pr.pullRequestId}`), // Create unique ID
      repositoryId,
      pullRequestId: pr.pullRequestId,
      codeReviewId: pr.codeReviewId,
      status: pr.status,
      title: pr.title,
      description: pr.description,
      sourceRefName: pr.sourceRefName,
      targetRefName: pr.targetRefName,
      mergeStatus: pr.mergeStatus,
      isDraft: pr.isDraft || false,
      createdByName: pr.createdBy.displayName,
      createdByEmail: pr.createdBy.uniqueName,
      createdByImageUrl: pr.createdBy._links?.avatar?.href,
      creationDate: new Date(pr.creationDate),
      reviewers: pr.reviewers?.map((reviewer: any) => ({
        displayName: reviewer.displayName,
        email: reviewer.uniqueName,
        imageUrl: reviewer._links?.avatar?.href,
        vote: this.mapReviewerVote(reviewer.vote),
        isRequired: reviewer.isRequired || false
      })) || [],
      workItemIds: [], // Will be populated separately if needed
      url: pr.url,
      lastUpdated: new Date()
    }));
  }

  private mapReviewerVote(vote: number): 'approved' | 'approved_with_suggestions' | 'no_vote' | 'waiting' | 'rejected' {
    switch (vote) {
      case 10: return 'approved';
      case 5: return 'approved_with_suggestions';
      case 0: return 'no_vote';
      case -5: return 'waiting';
      case -10: return 'rejected';
      default: return 'no_vote';
    }
  }

  // Team Member Management
  async getTeamMembers(): Promise<TeamMember[]> {
    const url = `https://vssps.dev.azure.com/${this.config.organization}/_apis/graph/users?api-version=7.1-preview.1`;
    
    try {
      const response = await this.makeRequest<AzureDevOpsApiResponse<any>>(url);
      
      return response.value.map(member => ({
        id: member.descriptor,
        displayName: member.displayName,
        email: member.mailAddress,
        uniqueName: member.principalName,
        imageUrl: member._links?.avatar?.href,
        projectName: this.config.project,
        organization: this.config.organization,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.warn('Could not fetch team members, using alternative approach');
      return [];
    }
  }

  // Sprint/Iteration Management
  async getSprints(): Promise<Sprint[]> {
    const url = `${this.baseUrl}/wit/classificationnodes/iterations?$depth=5&api-version=7.0`;
    const response = await this.makeRequest<any>(url);
    
    // Recursively extract sprints from the nested tree
    const sprints: Sprint[] = [];
    
    const extractSprints = (node: any) => {
      // Only add nodes that have date attributes (actual sprints)
      if (node.attributes?.startDate && node.attributes?.finishDate) {
        sprints.push({
          id: node.identifier || String(node.id),
          name: node.name,
          path: node.path,
          projectName: this.config.project,
          organization: this.config.organization,
          startDate: new Date(node.attributes.startDate),
          finishDate: new Date(node.attributes.finishDate),
          state: this.getSprintState(node.attributes.startDate, node.attributes.finishDate),
          attributes: node.attributes,
          lastUpdated: new Date()
        });
      }
      
      // Recursively process children
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          extractSprints(child);
        }
      }
    };
    
    // Start extraction from the response (which might have children)
    if (response.children && Array.isArray(response.children)) {
      for (const child of response.children) {
        extractSprints(child);
      }
    }
    
    return sprints;
  }

  private getSprintState(startDate?: string, finishDate?: string): string {
    if (!startDate || !finishDate) return 'unknown';
    
    const now = new Date();
    const start = new Date(startDate);
    const finish = new Date(finishDate);
    
    if (now < start) return 'future';
    if (now > finish) return 'past';
    return 'current';
  }

  // Repository Insights
  async getRepositoryInsights(repositoryId: string): Promise<{
    totalCommits: number;
    totalBranches: number;
    totalPullRequests: number;
    recentActivity: Array<{
      type: 'commit' | 'pullrequest';
      title: string;
      author: string;
      date: Date;
      url: string;
    }>;
  }> {
    const commits = await this.getCommits(repositoryId, 10);
    const pullRequests = await this.getPullRequests(repositoryId);
    
    // Get branches
    const branchesUrl = `${this.baseUrl}/git/repositories/${repositoryId}/refs?filter=heads&api-version=7.1`;
    const branchesResponse = await this.makeRequest<AzureDevOpsApiResponse<any>>(branchesUrl);
    
    // Combine recent activity
    const recentActivity = [
      ...commits.map(commit => ({
        type: 'commit' as const,
        title: commit.comment,
        author: commit.authorName,
        date: commit.authorDate,
        url: commit.remoteUrl || commit.url || ''
      })),
      ...pullRequests.slice(0, 10).map(pr => ({
        type: 'pullrequest' as const,
        title: pr.title,
        author: pr.createdByName,
        date: pr.creationDate,
        url: pr.url || ''
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);

    return {
      totalCommits: commits.length,
      totalBranches: branchesResponse.count,
      totalPullRequests: pullRequests.length,
      recentActivity
    };
  }
}

// Demo data generator for when PAT token is not available
export function generateDemoData(organization: string, project: string) {
  const repositories = [
    {
      id: "demo-repo-1",
      name: "LifeSafety.ai-Frontend",
      projectId: "demo-project-1",
      projectName: project,
      organization,
      defaultBranch: "refs/heads/main",
      size: 15728640,
      url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/LifeSafety.ai-Frontend",
      webUrl: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/LifeSafety.ai-Frontend",
      createdDate: new Date("2024-01-15T10:00:00Z"),
      lastUpdated: new Date()
    },
    {
      id: "demo-repo-2", 
      name: "LifeSafety.ai-Backend",
      projectId: "demo-project-1",
      projectName: project,
      organization,
      defaultBranch: "refs/heads/main",
      size: 8945123,
      url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/LifeSafety.ai-Backend",
      webUrl: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/LifeSafety.ai-Backend",
      createdDate: new Date("2024-01-10T08:30:00Z"),
      lastUpdated: new Date()
    }
  ];

  const workItems = [
    {
      id: 1001,
      rev: 12,
      projectName: project,
      areaPath: `${project}\\AI Models`,
      iterationPath: `${project}\\Sprint 68`,
      workItemType: "User Story",
      state: "Active",
      reason: "Implementation started",
      title: "Implement real-time hazard detection using computer vision",
      assignedToName: "Sarah Johnson",
      assignedToEmail: "sarah.johnson@podtech.io",
      assignedToImageUrl: null,
      createdDate: new Date("2024-09-30T09:15:00Z"),
      createdByName: "Mike Chen",
      createdByEmail: "mike.chen@podtech.io", 
      changedDate: new Date("2024-10-08T14:30:00Z"),
      description: "Develop computer vision models to detect potential safety hazards in real-time from camera feeds",
      acceptanceCriteria: "1. Model accuracy > 95%\n2. Real-time processing < 100ms\n3. Integration with alert system",
      storyPoints: 13,
      priority: 1,
      severity: "High",
      tags: ["AI", "Computer Vision", "Safety"],
      url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_workitems/edit/1001",
      lastUpdated: new Date()
    },
    {
      id: 1002,
      rev: 8,
      projectName: project,
      areaPath: `${project}\\Dashboard`,
      iterationPath: `${project}\\Sprint 68`,
      workItemType: "Task",
      state: "Done",
      reason: "Completed",
      title: "Create Azure DevOps metrics dashboard",
      assignedToName: "Alex Rodriguez",
      assignedToEmail: "alex.rodriguez@podtech.io",
      assignedToImageUrl: null,
      createdDate: new Date("2024-09-28T11:00:00Z"),
      createdByName: "Emily Davis",
      createdByEmail: "emily.davis@podtech.io",
      changedDate: new Date("2024-10-09T16:45:00Z"),
      description: "Build a comprehensive dashboard showing project metrics and team performance",
      acceptanceCriteria: "1. Display work items, commits, PRs\n2. Real-time data sync\n3. Responsive design",
      storyPoints: 8,
      priority: 2,
      severity: "Medium",
      tags: ["Dashboard", "Analytics", "UI"],
      url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_workitems/edit/1002",
      lastUpdated: new Date()
    },
    {
      id: 1003,
      rev: 5,
      projectName: project,
      areaPath: `${project}\\Infrastructure`,
      iterationPath: `${project}\\Sprint 68`,
      workItemType: "Bug",
      state: "New",
      reason: "Reported by QA",
      title: "Database connection timeouts in production",
      assignedToName: "David Kim",
      assignedToEmail: "david.kim@podtech.io",
      assignedToImageUrl: null,
      createdDate: new Date("2024-10-07T13:20:00Z"),
      createdByName: "QA Team",
      createdByEmail: "qa@podtech.io",
      changedDate: new Date("2024-10-09T10:15:00Z"),
      description: "Users experiencing intermittent database connection timeouts during peak hours",
      acceptanceCriteria: "1. Identify root cause\n2. Implement fix\n3. Load test to verify",
      storyPoints: 5,
      priority: 1,
      severity: "Critical",
      tags: ["Database", "Performance", "Production"],
      url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_workitems/edit/1003",
      lastUpdated: new Date()
    }
  ];

  const commits = [
    {
      id: "demo-repo-1-abc123",
      commitId: "abc123def456",
      repositoryId: "demo-repo-1",
      authorName: "Sarah Johnson",
      authorEmail: "sarah.johnson@podtech.io",
      authorDate: new Date("2024-10-09T15:30:00Z"),
      committerName: "Sarah Johnson",
      committerEmail: "sarah.johnson@podtech.io",
      committerDate: new Date("2024-10-09T15:30:00Z"),
      comment: "feat: implement hazard detection model training pipeline",
      commentTruncated: false,
      changeCounts: { Add: 15, Edit: 3, Delete: 1 },
      url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/LifeSafety.ai-Frontend/commit/abc123def456",
      remoteUrl: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/LifeSafety.ai-Frontend",
      lastUpdated: new Date()
    },
    {
      id: "demo-repo-2-def789",
      commitId: "def789ghi012",
      repositoryId: "demo-repo-2",
      authorName: "Alex Rodriguez",
      authorEmail: "alex.rodriguez@podtech.io",
      authorDate: new Date("2024-10-09T14:15:00Z"),
      committerName: "Alex Rodriguez",
      committerEmail: "alex.rodriguez@podtech.io",
      committerDate: new Date("2024-10-09T14:15:00Z"),
      comment: "fix: optimize database connection pooling",
      commentTruncated: false,
      changeCounts: { Add: 8, Edit: 12, Delete: 4 },
      url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/LifeSafety.ai-Backend/commit/def789ghi012",
      remoteUrl: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/LifeSafety.ai-Backend",
      lastUpdated: new Date()
    }
  ];

  const pullRequests = [
    {
      id: 2001,
      repositoryId: "demo-repo-1",
      pullRequestId: 42,
      codeReviewId: 1542,
      status: "active",
      title: "Add computer vision hazard detection models",
      description: "This PR implements the core computer vision models for real-time hazard detection",
      sourceRefName: "refs/heads/feature/hazard-detection",
      targetRefName: "refs/heads/main",
      mergeStatus: "succeeded",
      isDraft: false,
      createdByName: "Sarah Johnson",
      createdByEmail: "sarah.johnson@podtech.io",
      createdByImageUrl: null,
      creationDate: new Date("2024-10-08T10:30:00Z"),
      reviewers: [
        {
          displayName: "Mike Chen",
          email: "mike.chen@podtech.io",
          imageUrl: null,
          vote: "approved" as const,
          isRequired: true
        },
        {
          displayName: "Emily Davis",
          email: "emily.davis@podtech.io", 
          imageUrl: null,
          vote: "waiting" as const,
          isRequired: false
        }
      ],
      workItemIds: [1001],
      url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/LifeSafety.ai-Frontend/pullrequest/42",
      lastUpdated: new Date()
    }
  ];

  const teamMembers = [
    {
      id: "member-1",
      displayName: "Sarah Johnson",
      email: "sarah.johnson@podtech.io",
      uniqueName: "sarah.johnson@podtech.io",
      imageUrl: null,
      projectName: project,
      organization,
      lastUpdated: new Date()
    },
    {
      id: "member-2", 
      displayName: "Alex Rodriguez",
      email: "alex.rodriguez@podtech.io",
      uniqueName: "alex.rodriguez@podtech.io",
      imageUrl: null,
      projectName: project,
      organization,
      lastUpdated: new Date()
    },
    {
      id: "member-3",
      displayName: "Mike Chen", 
      email: "mike.chen@podtech.io",
      uniqueName: "mike.chen@podtech.io",
      imageUrl: null,
      projectName: project,
      organization,
      lastUpdated: new Date()
    }
  ];

  const sprints = [
    {
      id: "sprint-68",
      name: "Sprint 68",
      path: `${project}\\Sprint 68`,
      projectName: project,
      organization,
      startDate: new Date("2024-09-30T00:00:00Z"),
      finishDate: new Date("2024-10-13T23:59:59Z"),
      state: "current",
      attributes: {
        startDate: "2024-09-30T00:00:00Z",
        finishDate: "2024-10-13T23:59:59Z"
      },
      lastUpdated: new Date()
    }
  ];

  return {
    repositories,
    workItems,
    commits,
    pullRequests,
    teamMembers,
    sprints
  };
}

// Export factory function
export function createAzureDevOpsService(organization: string, project: string, pat: string): AzureDevOpsService {
  return new AzureDevOpsService(organization, project, pat);
}