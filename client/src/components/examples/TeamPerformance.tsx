import TeamPerformance from '../TeamPerformance';

export default function TeamPerformanceExample() {
  //todo: remove mock functionality
  const mockTeamMembers = [
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
    },
    {
      displayName: "Maria Garcia",
      imageUrl: undefined,
      email: "maria.garcia@podtech.io",
      workItems: {
        total: 7,
        completed: 7,
        inProgress: 0,
        blocked: 0
      },
      hours: {
        allocated: 35,
        burned: 33
      },
      pullRequests: {
        active: 0,
        reviewsPending: 0,
        approved: 5
      },
      velocity: {
        current: 14,
        previous: 12,
        trend: "up" as const
      }
    },
    {
      displayName: "Dev Sharma",
      imageUrl: undefined,
      email: "dev.sharma@podtech.io",
      workItems: {
        total: 9,
        completed: 5,
        inProgress: 3,
        blocked: 1
      },
      hours: {
        allocated: 40,
        burned: 28
      },
      pullRequests: {
        active: 4,
        reviewsPending: 3,
        approved: 1
      },
      velocity: {
        current: 7,
        previous: 9,
        trend: "down" as const
      }
    }
  ];

  return <TeamPerformance teamMembers={mockTeamMembers} />;
}