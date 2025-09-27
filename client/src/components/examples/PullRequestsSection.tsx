import PullRequestsSection from '../PullRequestsSection';

export default function PullRequestsSectionExample() {
  //todo: remove mock functionality
  const mockPullRequests = [
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
    },
    {
      id: 1236,
      title: "WIP: Dashboard performance improvements",
      description: "Work in progress: Implementing lazy loading and virtualization for the dashboard components to improve initial load time.",
      repository: "lifesafety-frontend",
      sourceBranch: "feature/dashboard-perf",
      targetBranch: "develop",
      author: {
        displayName: "Alex Rodriguez",
        imageUrl: undefined
      },
      reviewers: [
        {
          displayName: "Sarah Johnson",
          imageUrl: undefined,
          vote: "not_reviewed" as const
        }
      ],
      status: "active" as const,
      isDraft: true,
      createdDate: "2025-10-11T16:45:00Z",
      workItems: [36122, 35742]
    },
    {
      id: 1237,
      title: "Database schema migration for user profiles",
      description: "Adds new fields to user profile table and creates migration scripts for existing data. Includes rollback procedures.",
      repository: "lifesafety-database",
      sourceBranch: "migration/user-profiles",
      targetBranch: "main",
      author: {
        displayName: "Maria Garcia",
        imageUrl: undefined
      },
      reviewers: [
        {
          displayName: "Dev Sharma",
          imageUrl: undefined,
          vote: "waiting" as const
        },
        {
          displayName: "Christopher Lee",
          imageUrl: undefined,
          vote: "rejected" as const
        }
      ],
      status: "active" as const,
      isDraft: false,
      createdDate: "2025-10-08T11:20:00Z",
      workItems: [36122]
    }
  ];

  return (
    <PullRequestsSection 
      pullRequests={mockPullRequests}
      organization="podtech-io"
      project="LifeSafety.ai"
    />
  );
}