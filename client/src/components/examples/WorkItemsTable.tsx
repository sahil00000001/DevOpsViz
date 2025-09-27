import WorkItemsTable from '../WorkItemsTable';

export default function WorkItemsTableExample() {
  //todo: remove mock functionality
  const mockWorkItems = [
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
  ];

  return (
    <WorkItemsTable 
      workItems={mockWorkItems}
      organization="podtech-io"
      project="LifeSafety.ai"
    />
  );
}