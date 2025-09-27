import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  GitPullRequest, 
  GitMerge, 
  GitBranch, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Users
} from "lucide-react";

interface PullRequest {
  id: number;
  title: string;
  description: string;
  repository: string;
  sourceBranch: string;
  targetBranch: string;
  author: {
    displayName: string;
    imageUrl?: string;
  };
  reviewers: Array<{
    displayName: string;
    imageUrl?: string;
    vote: "approved" | "waiting" | "rejected" | "not_reviewed";
  }>;
  status: "active" | "completed" | "abandoned";
  isDraft: boolean;
  createdDate: string;
  workItems: number[];
}

interface PullRequestsSectionProps {
  pullRequests: PullRequest[];
  organization: string;
  project: string;
}

export default function PullRequestsSection({ 
  pullRequests, 
  organization, 
  project 
}: PullRequestsSectionProps) {
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "abandoned">("all");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <GitPullRequest className="h-4 w-4 text-blue-500" />;
      case "completed": return <GitMerge className="h-4 w-4 text-green-500" />;
      case "abandoned": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <GitBranch className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "outline";
      case "abandoned": return "destructive";
      default: return "secondary";
    }
  };

  const getReviewIcon = (vote: string) => {
    switch (vote) {
      case "approved": return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "rejected": return <XCircle className="h-3 w-3 text-red-500" />;
      case "waiting": return <Clock className="h-3 w-3 text-yellow-500" />;
      default: return <AlertCircle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const filteredPRs = pullRequests.filter(pr => 
    filter === "all" || pr.status === filter
  );

  const openInAzureDevOps = (prId: number, repository: string) => {
    const url = `https://dev.azure.com/${organization}/${project}/_git/${repository}/pullrequest/${prId}`;
    window.open(url, '_blank');
  };

  const activePRs = pullRequests.filter(pr => pr.status === "active").length;
  const pendingReviews = pullRequests
    .filter(pr => pr.status === "active")
    .reduce((count, pr) => count + pr.reviewers.filter(r => r.vote === "waiting").length, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5" />
              Pull Requests
            </CardTitle>
            <Badge variant="secondary">{filteredPRs.length}</Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <GitPullRequest className="h-4 w-4" />
              <span>{activePRs} active</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{pendingReviews} pending reviews</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {(["all", "active", "completed", "abandoned"] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
              data-testid={`filter-${status}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {filteredPRs.map((pr) => (
            <div
              key={pr.id}
              className="border rounded-lg p-4 hover-elevate"
              data-testid={`pr-${pr.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(pr.status)}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{pr.title}</h4>
                      {pr.isDraft && (
                        <Badge variant="outline" className="text-xs">Draft</Badge>
                      )}
                      <Badge variant={getStatusColor(pr.status) as any} className="text-xs">
                        {pr.status}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {pr.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-mono">#{pr.id}</span>
                      <span>{pr.repository}</span>
                      <span>{pr.sourceBranch} → {pr.targetBranch}</span>
                      <span>{new Date(pr.createdDate).toLocaleDateString()}</span>
                      
                      {pr.workItems.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span>Work items:</span>
                          <div className="flex gap-1">
                            {pr.workItems.slice(0, 3).map((wi, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                #{wi}
                              </Badge>
                            ))}
                            {pr.workItems.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{pr.workItems.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openInAzureDevOps(pr.id, pr.repository)}
                  data-testid={`link-pr-${pr.id}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={pr.author.imageUrl} />
                    <AvatarFallback className="text-xs">
                      {pr.author.displayName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {pr.author.displayName}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Reviewers:</span>
                  <div className="flex items-center gap-1">
                    {pr.reviewers.map((reviewer, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={reviewer.imageUrl} />
                          <AvatarFallback className="text-xs">
                            {reviewer.displayName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {getReviewIcon(reviewer.vote)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredPRs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <GitPullRequest className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pull requests found for the selected filter.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}