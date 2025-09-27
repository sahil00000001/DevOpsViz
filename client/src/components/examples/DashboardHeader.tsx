import DashboardHeader from '../DashboardHeader';

export default function DashboardHeaderExample() {
  //todo: remove mock functionality
  const mockSprints = [
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
  ];

  return (
    <DashboardHeader
      project="LifeSafety.ai"
      organization="podtech-io"
      sprints={mockSprints}
      selectedSprint="2"
      onSprintChange={(sprintId) => console.log('Sprint changed to:', sprintId)}
      onRefresh={() => console.log('Refreshing data...')}
    />
  );
}