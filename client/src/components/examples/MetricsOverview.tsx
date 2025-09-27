import MetricsOverview from '../MetricsOverview';

export default function MetricsOverviewExample() {
  //todo: remove mock functionality
  const mockMetrics = {
    totalWorkItems: 45,
    completedWorkItems: 32,
    inProgressWorkItems: 8,
    blockedWorkItems: 5,
    totalHoursAllocated: 480,
    totalHoursBurned: 392,
    activeTeamMembers: 12,
    openPullRequests: 14,
    pendingReviews: 7
  };

  return <MetricsOverview metrics={mockMetrics} />;
}