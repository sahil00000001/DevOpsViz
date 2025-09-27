import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  GitPullRequest,
  User,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface TeamMember {
  displayName: string;
  imageUrl?: string;
  email: string;
  workItems: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
  };
  hours: {
    allocated: number;
    burned: number;
  };
  pullRequests: {
    active: number;
    reviewsPending: number;
    approved: number;
  };
  velocity: {
    current: number;
    previous: number;
    trend: "up" | "down" | "stable";
  };
}

interface TeamPerformanceProps {
  teamMembers: TeamMember[];
}

export default function TeamPerformance({ teamMembers }: TeamPerformanceProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-3 w-3 text-green-500" />;
      case "down": return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return null;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Team Performance
          <Badge variant="secondary">{teamMembers.length} members</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {teamMembers.map((member, index) => {
            const completionRate = Math.round((member.workItems.completed / member.workItems.total) * 100);
            const hourUtilization = Math.round((member.hours.burned / member.hours.allocated) * 100);
            const velocityChange = member.velocity.current - member.velocity.previous;
            
            return (
              <div
                key={index}
                className="border rounded-lg p-4 hover-elevate"
                data-testid={`team-member-${index}`}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.imageUrl} />
                    <AvatarFallback>
                      {getInitials(member.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{member.displayName}</h4>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getTrendIcon(member.velocity.trend)}
                        <span className="text-xs text-muted-foreground">
                          Velocity: {member.velocity.current} 
                          {velocityChange !== 0 && (
                            <span className={velocityChange > 0 ? "text-green-500" : "text-red-500"}>
                              ({velocityChange > 0 ? '+' : ''}{velocityChange})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Work Items Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Work Items</span>
                          <span>{member.workItems.completed}/{member.workItems.total}</span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>{member.workItems.completed}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-500" />
                            <span>{member.workItems.inProgress}</span>
                          </div>
                          {member.workItems.blocked > 0 && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              <span>{member.workItems.blocked}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Hour Utilization */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Hours</span>
                          <span>{member.hours.burned}h/{member.hours.allocated}h</span>
                        </div>
                        <Progress 
                          value={hourUtilization} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {hourUtilization}% utilized
                        </div>
                      </div>
                      
                      {/* Pull Requests */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Pull Requests</span>
                          <GitPullRequest className="h-3 w-3" />
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-blue-500">Active:</span>
                            <span>{member.pullRequests.active}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">Pending:</span>
                            <span>{member.pullRequests.reviewsPending}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-green-500">Approved:</span>
                            <span>{member.pullRequests.approved}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {teamMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No team members found.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}