import SprintChart from '../SprintChart';

export default function SprintChartExample() {
  //todo: remove mock functionality
  const mockBurndownData = [
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
  ];

  const mockCompletionData = [
    { name: "User Stories", completed: 8, total: 12, percentage: 67 },
    { name: "Tasks", completed: 24, total: 28, percentage: 86 },
    { name: "Bugs", completed: 4, total: 5, percentage: 80 }
  ];

  return (
    <SprintChart 
      burndownData={mockBurndownData}
      completionData={mockCompletionData}
      sprintDuration={14}
      currentDay={8}
    />
  );
}