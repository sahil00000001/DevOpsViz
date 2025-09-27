import DependencyView from '../DependencyView';

export default function DependencyViewExample() {
  //todo: remove mock functionality
  const mockDependencies = [
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
    },
    {
      id: "dep-3",
      type: "external_dependency" as const,
      title: "Waiting for third-party API access",
      description: "Integration with external safety compliance API requires vendor approval and API key provisioning.",
      blockedItem: {
        id: 35742,
        title: "Integrate compliance API",
        type: "work_item" as const,
        assignee: {
          displayName: "Maria Garcia",
          imageUrl: undefined
        }
      },
      blockingEntity: {
        name: "SafetyVendor Corp",
        type: "external_system" as const
      },
      severity: "high" as const,
      daysSinceCreated: 8,
      url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_workitems/edit/35742"
    },
    {
      id: "dep-4",
      type: "pr_review" as const,
      title: "Code review needed for performance improvements",
      description: "Performance optimization PR requires senior developer review before deployment to production.",
      blockedItem: {
        id: 1236,
        title: "Dashboard performance improvements",
        type: "pull_request" as const,
        assignee: {
          displayName: "Alex Rodriguez",
          imageUrl: undefined
        }
      },
      blockingEntity: {
        name: "Christopher Lee", 
        type: "person" as const,
        imageUrl: undefined
      },
      severity: "low" as const,
      daysSinceCreated: 1,
      url: "https://dev.azure.com/podtech-io/LifeSafety.ai/_git/repos/pullrequest/1236"
    }
  ];

  return (
    <DependencyView 
      dependencies={mockDependencies}
      organization="podtech-io"
      project="LifeSafety.ai"
    />
  );
}