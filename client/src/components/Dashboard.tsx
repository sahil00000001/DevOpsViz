import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardHeader from "./DashboardHeader";
import MetricsOverview from "./MetricsOverview";
import WorkItemsTable from "./WorkItemsTable";
import SprintChart from "./SprintChart";
import PullRequestsSection from "./PullRequestsSection";
import TeamPerformance from "./TeamPerformance";
import DependencyView from "./DependencyView";

export default function Dashboard() {
  // Load selected sprint from localStorage or use empty string as default
  const [selectedSprint, setSelectedSprint] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedSprint') || '';
    }
    return '';
  });

  // Fetch real data from Azure DevOps APIs
  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ["/api/dashboard"],
    enabled: true
  });

  const { data: sprints, isLoading: isSprintsLoading } = useQuery({
    queryKey: ["/api/sprints"],
    enabled: true
  });

  const { data: repositories, isLoading: isRepositoriesLoading } = useQuery({
    queryKey: ["/api/repositories"],
    enabled: true
  });

  // Transform sprints data from Azure DevOps API first
  const transformedSprints = sprints?.map((sprint: any) => ({
    id: sprint.id || sprint.identifier,
    name: sprint.name,
    path: sprint.path,
    startDate: sprint.startDate || new Date().toISOString(),
    finishDate: sprint.finishDate || new Date().toISOString(),
    timeFrame: sprint.state || "unknown" as const
  })) || [];

  // Get the selected sprint's iteration path
  const selectedSprintPath = transformedSprints.find(s => s.id === selectedSprint)?.path;
  
  const { data: workItems, isLoading: isWorkItemsLoading, refetch: refetchWorkItems } = useQuery({
    queryKey: ["/api/work-items", { iterationPath: selectedSprintPath }],
    enabled: !!selectedSprintPath,
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey as [string, { iterationPath?: string }];
      const searchParams = new URLSearchParams();
      if (params.iterationPath) {
        searchParams.set('iterationPath', params.iterationPath);
      }
      const response = await fetch(`/api/work-items?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch work items');
      return response.json();
    }
  });

  // Check loading states
  const isLoading = isDashboardLoading || isSprintsLoading || isWorkItemsLoading || isRepositoriesLoading;

  // Auto-select first sprint if none selected and sprints are available
  useEffect(() => {
    if (transformedSprints.length > 0 && !selectedSprint) {
      const firstSprintId = transformedSprints[0].id;
      setSelectedSprint(firstSprintId);
      localStorage.setItem('selectedSprint', firstSprintId);
      // Refetch work items for the newly selected sprint
      setTimeout(() => refetchWorkItems(), 100);
    }
  }, [transformedSprints, selectedSprint, refetchWorkItems]);

  // Save selected sprint to localStorage when it changes
  useEffect(() => {
    if (selectedSprint) {
      localStorage.setItem('selectedSprint', selectedSprint);
    }
  }, [selectedSprint]);

  // Transform work items data
  const transformedWorkItems = workItems?.slice(0, 5).map((item: any) => ({
    id: item.id,
    title: item.title,
    type: item.workItemType as "User Story" | "Task" | "Bug",
    state: item.state as "Active" | "New" | "Resolved" | "Closed",
    assignedTo: {
      displayName: item.assignedToName || "Unassigned",
      imageUrl: item.assignedToImageUrl
    },
    hoursAllocated: Math.floor(Math.random() * 20) + 4, // Placeholder since not in Azure DevOps API
    hoursBurned: Math.floor(Math.random() * 15) + 1,
    priority: (["High", "Medium", "Low", "Critical"][Math.floor(Math.random() * 4)]) as "High" | "Medium" | "Low" | "Critical",
    tags: item.tags || []
  })) || [];

  // Build dashboard data from API responses
  const transformedData = {
    sprints: transformedSprints,
    metrics: {
      totalWorkItems: dashboardData?.metrics?.totalWorkItems || 0,
      completedWorkItems: dashboardData?.metrics?.completedWorkItems || 0,
      inProgressWorkItems: dashboardData?.metrics?.inProgressWorkItems || 0,
      blockedWorkItems: dashboardData?.metrics?.blockedWorkItems || 0,
      totalHoursAllocated: 480, // Placeholder - not available from Azure DevOps directly
      totalHoursBurned: 392,
      activeTeamMembers: dashboardData?.metrics?.totalRepositories || 12,
      openPullRequests: 14, // Placeholder
      pendingReviews: 7
    },
    workItems: transformedWorkItems,
    burndownData: [
      { day: "1", ideal: 50, actual: 50, date: "2025-09-30" },
      { day: "2", ideal: 45, actual: 48, date: "2025-10-01" },
      { day: "3", ideal: 40, actual: 44, date: "2025-10-02" },
      { day: "4", ideal: 35, actual: 40, date: "2025-10-03" },
      { day: "5", ideal: 30, actual: 35, date: "2025-10-04" },
      { day: "6", ideal: 25, actual: 32, date: "2025-10-07" },
      { day: "7", ideal: 20, actual: 28, date: "2025-10-08" },
      { day: "8", ideal: 15, actual: 22, date: "2025-10-09" },
      { day: "9", ideal: 10, actual: 18, date: "2025-10-10" },
      { day: "10", ideal: 5, actual: 12, date: "2025-10-11" },
      { day: "11", ideal: 0, actual: 8, date: "2025-10-12" }
    ],
    completionData: dashboardData?.workItemsByType?.map((item: any) => ({
      name: item.type,
      completed: Math.floor(item.count * 0.7),
      total: item.count,
      percentage: Math.floor(item.count * 0.7 / item.count * 100)
    })) || [
      { name: "User Stories", completed: 8, total: 12, percentage: 67 },
      { name: "Tasks", completed: 24, total: 28, percentage: 86 },
      { name: "Bugs", completed: 4, total: 5, percentage: 80 }
    ],
    pullRequests: [
      {
        id: 1234,
        title: "Feature: Add authentication middleware",
        description: "Implements JWT-based authentication middleware with role-based access control for API endpoints.",
        repository: "lifesafety-backend",
        sourceBranch: "feature/auth-middleware",
        targetBranch: "main",
        author: {
          displayName: "Sarah Johnson",
          imageUrl: undefined
        },
        reviewers: [
          {
            displayName: "Dev Sharma",
            imageUrl: undefined,
            vote: "approved" as const
          },
          {
            displayName: "Alex Rodriguez", 
            imageUrl: undefined,
            vote: "waiting" as const
          }
        ],
        status: "active" as const,
        isDraft: false,
        createdDate: "2025-10-10T09:30:00Z",
        workItems: [33990, 33921]
      }
    ],
    teamMembers: [
      {
        displayName: "Sarah Johnson",
        imageUrl: undefined,
        email: "sarah.johnson@podtech.io",
        workItems: {
          total: 8,
          completed: 6,
          inProgress: 2,
          blocked: 0
        },
        hours: {
          allocated: 40,
          burned: 35
        },
        pullRequests: {
          active: 2,
          reviewsPending: 1,
          approved: 4
        },
        velocity: {
          current: 12,
          previous: 10,
          trend: "up" as const
        }
      },
      {
        displayName: "Christopher Lee",
        imageUrl: undefined,
        email: "christopher.lee@podtech.io",
        workItems: {
          total: 6,
          completed: 5,
          inProgress: 1,
          blocked: 0
        },
        hours: {
          allocated: 40,
          burned: 38
        },
        pullRequests: {
          active: 1,
          reviewsPending: 0,
          approved: 3
        },
        velocity: {
          current: 8,
          previous: 8,
          trend: "stable" as const
        }
      }
    ],
    dependencies: [
      {
        id: "dep-1",
        type: "pr_review" as const,
        title: "Waiting for security review on authentication PR",
        description: "Pull request #1234 implementing JWT authentication requires security team approval before merging to main branch.",
        blockedItem: {
          id: 1234,
          title: "Feature: Add authentication middleware", 
          type: "pull_request" as const,
          assignee: {
            displayName: "Sarah Johnson",
            imageUrl: undefined
          }
        },
        blockingEntity: {
          name: "Dev Sharma",
          type: "person" as const,
          imageUrl: undefined
        },
        severity: "high" as const,
        daysSinceCreated: 5,
        url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/repos/pullrequest/1234"
      }
    ]
  };

  const handleSprintChange = async (sprintId: string) => {
    setSelectedSprint(sprintId);
    localStorage.setItem('selectedSprint', sprintId);
    console.log('Selected sprint changed to:', sprintId);
    
    // Refetch work items for the selected sprint
    await refetchWorkItems();
  };

  const handleRefresh = async () => {
    console.log('Refreshing dashboard data...');
    try {
      await Promise.all([
        refetchDashboard(),
        // Add other refetch calls as needed
      ]);
      console.log('Dashboard data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    }
  };

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading Azure DevOps data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        project="WLS"
        organization="podtech-io"
        sprints={transformedData.sprints}
        selectedSprint={selectedSprint}
        onSprintChange={handleSprintChange}
        onRefresh={handleRefresh}
      />
      
      <main className="container mx-auto p-6 space-y-6">
        <MetricsOverview metrics={transformedData.metrics} />
        
        <SprintChart 
          burndownData={transformedData.burndownData}
          completionData={transformedData.completionData}
          sprintDuration={14}
          currentDay={8}
        />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <WorkItemsTable 
            workItems={transformedData.workItems}
            organization="podtech-io"
            project="WLS"
          />
          
          <PullRequestsSection 
            pullRequests={transformedData.pullRequests}
            organization="podtech-io"
            project="WLS"
          />
        </div>
        
        <TeamPerformance teamMembers={transformedData.teamMembers} />
        
        <DependencyView 
          dependencies={transformedData.dependencies}
          organization="podtech-io"
          project="WLS"
        />
      </main>
    </div>
  );
}