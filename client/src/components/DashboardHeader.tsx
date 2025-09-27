import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, RefreshCcw, Settings, ExternalLink } from "lucide-react";

interface Sprint {
  id: string;
  name: string;
  path: string;
  startDate: string;
  finishDate: string;
  timeFrame: "past" | "current" | "future";
}

interface DashboardHeaderProps {
  project: string;
  organization: string;
  sprints: Sprint[];
  selectedSprint?: string;
  onSprintChange: (sprintId: string) => void;
  onRefresh: () => void;
}

export default function DashboardHeader({
  project,
  organization,
  sprints,
  selectedSprint,
  onSprintChange,
  onRefresh
}: DashboardHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const currentSprint = sprints.find(s => s.id === selectedSprint);
  const azureDevOpsUrl = `https://dev.azure.com/${organization}/${project}`;

  return (
    <div className="border-b bg-card">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Azure DevOps Analytics</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{organization}</span>
                <span>/</span>
                <span className="font-medium">{project}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => window.open(azureDevOpsUrl, '_blank')}
                  data-testid="link-azure-devops"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-testid="button-refresh"
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sprint:</span>
          </div>
          
          <Select value={selectedSprint} onValueChange={onSprintChange}>
            <SelectTrigger className="w-[300px]" data-testid="select-sprint">
              <SelectValue placeholder="Select a sprint..." />
            </SelectTrigger>
            <SelectContent>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  <div className="flex items-center gap-2">
                    <span>{sprint.name}</span>
                    <Badge 
                      variant={sprint.timeFrame === 'current' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {sprint.timeFrame}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentSprint && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {new Date(currentSprint.startDate).toLocaleDateString()} - {new Date(currentSprint.finishDate).toLocaleDateString()}
              </span>
              <Badge variant={currentSprint.timeFrame === 'current' ? 'default' : 'secondary'}>
                {currentSprint.timeFrame}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}