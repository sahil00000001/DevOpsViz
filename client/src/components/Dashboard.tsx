import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

  // Sync mutation to fetch data from Azure DevOps
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sync", { force: true });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sprints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-items"] });
    }
  });

  // Check if PAT token exists
  const [hasPatToken, setHasPatToken] = useState(false);
  useEffect(() => {
    const patToken = localStorage.getItem("azure_devops_pat_token");
    setHasPatToken(!!patToken);
    if (patToken) {
      console.log("PAT token found in localStorage:", patToken.substring(0, 10) + "...");
    } else {
      console.log("No PAT token in localStorage");
    }
  }, []);

  // Transform sprints data from Azure DevOps API first
  const transformedSprints = (sprints as any[] || []).map((sprint: any) => ({
    id: sprint.id || sprint.identifier,
    name: sprint.name,
    path: sprint.path,
    startDate: sprint.startDate || new Date().toISOString(),
    finishDate: sprint.finishDate || new Date().toISOString(),
    timeFrame: sprint.state || "unknown" as const
  }));

  // Get the selected sprint's name (not the full path) for filtering
  // Extract just the sprint name (e.g., "Sprint 8") from the full path (e.g., "\WLS\Iteration\Sprint 8")
  const selectedSprintData = transformedSprints.find((s: any) => s.id === selectedSprint);
  const selectedSprintPath = selectedSprintData?.name; // Use sprint name instead of full path
  
  const { data: workItems, isLoading: isWorkItemsLoading, refetch: refetchWorkItems } = useQuery({
    queryKey: ["/api/work-items", { iterationPath: selectedSprintPath }],
    enabled: true, // Always fetch work items, with or without sprint filter
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
    hoursAllocated: item.storyPoints ? item.storyPoints * 8 : 0,
    hoursBurned: item.storyPoints ? Math.floor(item.storyPoints * 6) : 0,
    priority: (item.severity || item.priority === 1 ? "Critical" : item.priority === 2 ? "High" : item.priority === 3 ? "Medium" : "Low") as "High" | "Medium" | "Low" | "Critical",
    tags: item.tags || []
  })) || [];

  // Calculate actual burndown from work items
  const calculateBurndown = () => {
    if (!workItems || workItems.length === 0) return [];
    
    const totalItems = workItems.length;
    const completedItems = workItems.filter((item: any) => 
      item.state?.toLowerCase().includes('done') || 
      item.state?.toLowerCase().includes('closed') ||
      item.state?.toLowerCase().includes('resolved')
    ).length;
    
    const remainingItems = totalItems - completedItems;
    const sprintDays = 10; // Typical 2-week sprint
    
    return Array.from({ length: sprintDays + 1 }, (_, i) => ({
      day: String(i + 1),
      ideal: Math.round(totalItems * (1 - i / sprintDays)),
      actual: i === sprintDays ? remainingItems : Math.round(totalItems * (1 - (i * 0.9) / sprintDays)),
      date: new Date(Date.now() - (sprintDays - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
  };

  // Build dashboard data from API responses
  const apiData = dashboardData as any;
  const transformedData = {
    sprints: transformedSprints,
    metrics: {
      totalWorkItems: apiData?.metrics?.totalWorkItems || 0,
      completedWorkItems: apiData?.metrics?.completedWorkItems || 0,
      inProgressWorkItems: apiData?.metrics?.inProgressWorkItems || 0,
      blockedWorkItems: apiData?.metrics?.blockedWorkItems || 0,
      totalHoursAllocated: (workItems as any[])?.reduce((sum: number, item: any) => sum + (item.storyPoints ? item.storyPoints * 8 : 0), 0) || 0,
      totalHoursBurned: (workItems as any[])?.reduce((sum: number, item: any) => sum + (item.storyPoints ? Math.floor(item.storyPoints * 6) : 0), 0) || 0,
      activeTeamMembers: apiData?.metrics?.totalRepositories || 0,
      openPullRequests: 0,
      pendingReviews: 0
    },
    workItems: transformedWorkItems,
    burndownData: calculateBurndown(),
    completionData: (apiData?.workItemsByState as any[] || []).map((item: any) => {
      const isCompleted = item.state?.toLowerCase().includes('done') || 
                          item.state?.toLowerCase().includes('closed') ||
                          item.state?.toLowerCase().includes('resolved');
      return {
        name: item.state,
        completed: isCompleted ? item.count : 0,
        total: item.count,
        percentage: isCompleted ? 100 : 0
      };
    }),
    pullRequests: [],
    teamMembers: [],
    dependencies: []
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

  const handleSync = () => {
    syncMutation.mutate();
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
        onSync={handleSync}
        isSyncing={syncMutation.isPending}
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