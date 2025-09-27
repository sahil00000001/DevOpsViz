import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AlertTriangle, 
  Clock, 
  GitPullRequest, 
  User, 
  ExternalLink,
  ArrowRight,
  Link as LinkIcon
} from "lucide-react";

interface Dependency {
  id: string;
  type: "pr_review" | "work_item_blocked" | "external_dependency";
  title: string;
  description: string;
  blockedItem: {
    id: number;
    title: string;
    type: "work_item" | "pull_request";
    assignee?: {
      displayName: string;
      imageUrl?: string;
    };
  };
  blockingEntity: {
    name: string;
    type: "person" | "external_system" | "work_item";
    imageUrl?: string;
  };
  severity: "high" | "medium" | "low";
  daysSinceCreated: number;
  url?: string;
}

interface DependencyViewProps {
  dependencies: Dependency[];
  organization: string;
  project: string;
}

export default function DependencyView({ 
  dependencies, 
  organization, 
  project 
}: DependencyViewProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pr_review": return <GitPullRequest className="h-4 w-4" />;
      case "work_item_blocked": return <AlertTriangle className="h-4 w-4" />;
      case "external_dependency": return <LinkIcon className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "pr_review": return "PR Review";
      case "work_item_blocked": return "Work Item Blocked";
      case "external_dependency": return "External Dependency";
      default: return "Unknown";
    }
  };

  const openInAzureDevOps = (dependency: Dependency) => {
    if (dependency.url) {
      window.open(dependency.url, '_blank');
    } else if (dependency.blockedItem.type === "work_item") {
      const url = `https://dev.azure.com/${organization}/${project}/_workitems/edit/${dependency.blockedItem.id}`;
      window.open(url, '_blank');
    } else if (dependency.blockedItem.type === "pull_request") {
      const url = `https://dev.azure.com/${organization}/${project}/_git/repos/pullrequest/${dependency.blockedItem.id}`;
      window.open(url, '_blank');
    }
  };

  const getDaysOverdueClass = (days: number) => {
    if (days > 7) return "text-red-500";
    if (days > 3) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const highPriorityDeps = dependencies.filter(d => d.severity === "high").length;
  const totalBlockedItems = dependencies.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Dependencies & Blockers
            <Badge variant="secondary">{totalBlockedItems}</Badge>
          </CardTitle>
          
          {highPriorityDeps > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {highPriorityDeps} High Priority
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {dependencies.map((dependency) => (
            <div
              key={dependency.id}
              className="border rounded-lg p-4 hover-elevate"
              data-testid={`dependency-${dependency.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(dependency.type)}
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(dependency.type)}
                    </Badge>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{dependency.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {dependency.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <Badge variant={getSeverityColor(dependency.severity) as any} className="text-xs">
                        {dependency.severity} priority
                      </Badge>
                      <span className={getDaysOverdueClass(dependency.daysSinceCreated)}>
                        {dependency.daysSinceCreated} days ago
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={getSeverityColor(dependency.severity) as any}>
                    {dependency.severity}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openInAzureDevOps(dependency)}
                    data-testid={`link-dependency-${dependency.id}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Blocked:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">#{dependency.blockedItem.id}</span>
                      <span className="text-xs">{dependency.blockedItem.title}</span>
                    </div>
                    {dependency.blockedItem.assignee && (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={dependency.blockedItem.assignee.imageUrl} />
                          <AvatarFallback className="text-xs">
                            {dependency.blockedItem.assignee.displayName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{dependency.blockedItem.assignee.displayName}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Waiting on:</span>
                    {dependency.blockingEntity.type === "person" && (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={dependency.blockingEntity.imageUrl} />
                          <AvatarFallback className="text-xs">
                            {dependency.blockingEntity.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{dependency.blockingEntity.name}</span>
                      </div>
                    )}
                    {dependency.blockingEntity.type === "external_system" && (
                      <div className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        <span className="text-xs font-medium">{dependency.blockingEntity.name}</span>
                      </div>
                    )}
                    {dependency.blockingEntity.type === "work_item" && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs font-medium">{dependency.blockingEntity.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {dependencies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No dependencies or blockers found.</p>
              <p className="text-xs mt-1">Great! All work items are unblocked.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}