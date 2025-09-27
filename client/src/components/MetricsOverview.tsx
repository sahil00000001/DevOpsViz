import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Users, 
  GitPullRequest, 
  Timer,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  progress?: number;
  variant?: "default" | "success" | "warning" | "destructive";
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  progress,
  variant = "default" 
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up": return <TrendingUp className="h-3 w-3 text-green-500" />;
      case "down": return <TrendingDown className="h-3 w-3 text-red-500" />;
      case "neutral": return <Minus className="h-3 w-3 text-muted-foreground" />;
      default: return null;
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case "success": return "text-green-600 dark:text-green-400";
      case "warning": return "text-yellow-600 dark:text-yellow-400";
      case "destructive": return "text-red-600 dark:text-red-400";
      default: return "text-foreground";
    }
  };

  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className={`text-2xl font-bold ${getValueColor()}`}>
            {value}
          </div>
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-xs">
              {getTrendIcon()}
              <span className="text-muted-foreground">{trendValue}</span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
        {progress !== undefined && (
          <Progress value={progress} className="mt-3 h-2" />
        )}
      </CardContent>
    </Card>
  );
}

interface MetricsOverviewProps {
  metrics: {
    totalWorkItems: number;
    completedWorkItems: number;
    inProgressWorkItems: number;
    blockedWorkItems: number;
    totalHoursAllocated: number;
    totalHoursBurned: number;
    activeTeamMembers: number;
    openPullRequests: number;
    pendingReviews: number;
  };
}

export default function MetricsOverview({ metrics }: MetricsOverviewProps) {
  const completionRate = Math.round((metrics.completedWorkItems / metrics.totalWorkItems) * 100);
  const burnRate = Math.round((metrics.totalHoursBurned / metrics.totalHoursAllocated) * 100);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Work Items Completed"
        value={`${metrics.completedWorkItems}/${metrics.totalWorkItems}`}
        subtitle={`${completionRate}% complete`}
        icon={CheckCircle}
        progress={completionRate}
        variant="success"
        trend="up"
        trendValue="+12% from last sprint"
      />
      
      <MetricCard
        title="Hours Burned"
        value={`${metrics.totalHoursBurned}h`}
        subtitle={`${metrics.totalHoursAllocated}h allocated`}
        icon={Timer}
        progress={burnRate}
        variant={burnRate > 90 ? "warning" : "default"}
        trend="neutral"
        trendValue={`${burnRate}% of allocation`}
      />
      
      <MetricCard
        title="Active Pull Requests"
        value={metrics.openPullRequests}
        subtitle={`${metrics.pendingReviews} pending reviews`}
        icon={GitPullRequest}
        variant={metrics.pendingReviews > 5 ? "warning" : "default"}
        trend="down"
        trendValue="-3 from yesterday"
      />
      
      <MetricCard
        title="Blocked Items"
        value={metrics.blockedWorkItems}
        subtitle={`${metrics.inProgressWorkItems} in progress`}
        icon={AlertTriangle}
        variant={metrics.blockedWorkItems > 0 ? "destructive" : "success"}
        trend={metrics.blockedWorkItems > 0 ? "up" : "neutral"}
        trendValue={metrics.blockedWorkItems > 0 ? "+2 new blocks" : "No blocks"}
      />
    </div>
  );
}