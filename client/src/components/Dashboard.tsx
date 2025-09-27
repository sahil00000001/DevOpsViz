import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardHeader from "./DashboardHeader";
import MetricsOverview from "./MetricsOverview";
import WorkItemsTable from "./WorkItemsTable";
import SprintChart from "./SprintChart";
import PullRequestsSection from "./PullRequestsSection";
import TeamPerformance from "./TeamPerformance";
import DependencyView from "./DependencyView";

export default function Dashboard() {
  const [selectedSprint, setSelectedSprint] = useState<string>("2");

  //todo: remove mock functionality - Replace with real Azure DevOps API calls
  const mockData = {
    sprints: [
      {
        id: "1",
        name: "Sprint 67",
        path: "LifeSafety.ai\\Sprint 67",
        startDate: "2025-09-15T00:00:00Z",
        finishDate: "2025-09-29T00:00:00Z",
        timeFrame: "past" as const
      },
      {
        id: "2", 
        name: "Sprint 68",
        path: "LifeSafety.ai\\Sprint 68",
        startDate: "2025-09-30T00:00:00Z",
        finishDate: "2025-10-13T00:00:00Z",
        timeFrame: "current" as const
      },
      {
        id: "3",
        name: "Sprint 69", 
        path: "LifeSafety.ai\\Sprint 69",
        startDate: "2025-10-14T00:00:00Z",
        finishDate: "2025-10-27T00:00:00Z",
        timeFrame: "future" as const
      }
    ],
    metrics: {
      totalWorkItems: 45,
      completedWorkItems: 32,
      inProgressWorkItems: 8,
      blockedWorkItems: 5,
      totalHoursAllocated: 480,
      totalHoursBurned: 392,
      activeTeamMembers: 12,
      openPullRequests: 14,
      pendingReviews: 7
    },
    workItems: [
      {
        id: 33990,
        title: "Implement user authentication system",
        type: "User Story" as const,
        state: "Active" as const,
        assignedTo: {
          displayName: "Christopher Lee",
          imageUrl: undefined
        },
        hoursAllocated: 16,
        hoursBurned: 8,
        priority: "High" as const,
        tags: ["backend", "security"]
      },
      {
        id: 33921,
        title: "Fix login page CSS alignment issues",
        type: "Bug" as const,
        state: "New" as const,
        assignedTo: {
          displayName: "Sarah Johnson",
          imageUrl: undefined
        },
        hoursAllocated: 4,
        hoursBurned: 0,
        priority: "Medium" as const,
        tags: ["frontend", "ui"]
      },
      {
        id: 35584,
        title: "Create API documentation",
        type: "Task" as const,
        state: "Resolved" as const,
        assignedTo: {
          displayName: "Dev Sharma",
          imageUrl: undefined
        },
        hoursAllocated: 8,
        hoursBurned: 6,
        priority: "Low" as const,
        tags: ["documentation"]
      },
      {
        id: 36122,
        title: "Database migration for user profiles",
        type: "Task" as const,
        state: "Active" as const,
        assignedTo: {
          displayName: "Alex Rodriguez",
          imageUrl: undefined
        },
        hoursAllocated: 12,
        hoursBurned: 9,
        priority: "Critical" as const,
        tags: ["database", "migration"]
      },
      {
        id: 35742,
        title: "Performance optimization for dashboard",
        type: "User Story" as const,
        state: "Closed" as const,
        assignedTo: {
          displayName: "Maria Garcia", 
          imageUrl: undefined
        },
        hoursAllocated: 20,
        hoursBurned: 18,
        priority: "High" as const,
        tags: ["performance", "frontend"]
      }
    ],
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
    completionData: [
      { name: "User Stories", completed: 8, total: 12, percentage: 67 },
      { name: "Tasks", completed: 24, total: 28, percentage: 86 },
      { name: "Bugs", completed: 4, total: 5, percentage: 80 }
    ],
    pullRequests: [
      {
        id: 1234,
        title: "Feature: Add authentication middleware",
        description: "Implements JWT-based authentication middleware with role-based access control for API endpoints. Includes comprehensive test coverage and documentation updates.",
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
      },
      {
        id: 1235,
        title: "Bugfix: Resolve memory leak in background service",
        description: "Fixes memory leak caused by unclosed database connections in the background service. Also optimizes query performance.",
        repository: "lifesafety-services",
        sourceBranch: "bugfix/memory-leak",
        targetBranch: "main",
        author: {
          displayName: "Christopher Lee",
          imageUrl: undefined
        },
        reviewers: [
          {
            displayName: "Maria Garcia",
            imageUrl: undefined,
            vote: "approved" as const
          },
          {
            displayName: "James Wilson",
            imageUrl: undefined,
            vote: "approved" as const
          }
        ],
        status: "completed" as const,
        isDraft: false,
        createdDate: "2025-10-09T14:15:00Z",
        workItems: [35584]
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
      },
      {
        displayName: "Alex Rodriguez",
        imageUrl: undefined,
        email: "alex.rodriguez@podtech.io",
        workItems: {
          total: 10,
          completed: 7,
          inProgress: 2,
          blocked: 1
        },
        hours: {
          allocated: 40,
          burned: 32
        },
        pullRequests: {
          active: 3,
          reviewsPending: 2,
          approved: 2
        },
        velocity: {
          current: 9,
          previous: 11,
          trend: "down" as const
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
      },
      {
        id: "dep-2", 
        type: "work_item_blocked" as const,
        title: "Database migration blocked by infrastructure team",
        description: "User profile migration requires new database instance provisioning from infrastructure team.",
        blockedItem: {
          id: 36122,
          title: "Database migration for user profiles",
          type: "work_item" as const,
          assignee: {
            displayName: "Alex Rodriguez",
            imageUrl: undefined
          }
        },
        blockingEntity: {
          name: "Infrastructure Team",
          type: "external_system" as const
        },
        severity: "medium" as const,
        daysSinceCreated: 3,
        url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_workitems/edit/36122"
      }
    ]
  };

  const handleSprintChange = (sprintId: string) => {
    setSelectedSprint(sprintId);
    console.log('Selected sprint changed to:', sprintId);
    // todo: remove mock functionality - Trigger API call to fetch data for selected sprint
  };

  const handleRefresh = async () => {
    console.log('Refreshing dashboard data...');
    // todo: remove mock functionality - Implement API calls to refresh all data
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        project="LifeSafety.ai"
        organization="podtech-io"
        sprints={mockData.sprints}
        selectedSprint={selectedSprint}
        onSprintChange={handleSprintChange}
        onRefresh={handleRefresh}
      />
      
      <main className="container mx-auto p-6 space-y-6">
        <MetricsOverview metrics={mockData.metrics} />
        
        <SprintChart 
          burndownData={mockData.burndownData}
          completionData={mockData.completionData}
          sprintDuration={14}
          currentDay={8}
        />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <WorkItemsTable 
            workItems={mockData.workItems}
            organization="podtech-io"
            project="LifeSafety.ai"
          />
          
          <PullRequestsSection 
            pullRequests={mockData.pullRequests}
            organization="podtech-io"
            project="LifeSafety.ai"
          />
        </div>
        
        <TeamPerformance teamMembers={mockData.teamMembers} />
        
        <DependencyView 
          dependencies={mockData.dependencies}
          organization="podtech-io"
          project="LifeSafety.ai"
        />
      </main>
    </div>
  );
}