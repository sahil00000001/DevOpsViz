import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Search, 
  ExternalLink, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Play,
  Bug,
  BookOpen,
  CheckSquare
} from "lucide-react";

interface WorkItem {
  id: number;
  title: string;
  type: "User Story" | "Task" | "Bug";
  state: "New" | "Active" | "Resolved" | "Closed" | "Removed";
  assignedTo?: {
    displayName: string;
    imageUrl?: string;
  };
  hoursAllocated?: number;
  hoursBurned?: number;
  priority: "Critical" | "High" | "Medium" | "Low";
  tags: string[];
}

interface WorkItemsTableProps {
  workItems: WorkItem[];
  organization: string;
  project: string;
}

export default function WorkItemsTable({ workItems, organization, project }: WorkItemsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterState, setFilterState] = useState<string>("all");

  const getWorkItemIcon = (type: string) => {
    switch (type) {
      case "User Story": return <BookOpen className="h-4 w-4" />;
      case "Task": return <CheckSquare className="h-4 w-4" />;
      case "Bug": return <Bug className="h-4 w-4" />;
      default: return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case "New": return <Clock className="h-3 w-3" />;
      case "Active": return <Play className="h-3 w-3" />;
      case "Resolved": return <CheckCircle className="h-3 w-3" />;
      case "Closed": return <CheckCircle className="h-3 w-3" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "New": return "secondary";
      case "Active": return "default";
      case "Resolved": return "outline";
      case "Closed": return "outline";
      default: return "destructive";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "destructive";
      case "High": return "destructive";
      case "Medium": return "default";
      case "Low": return "secondary";
      default: return "secondary";
    }
  };

  const filteredWorkItems = workItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toString().includes(searchTerm);
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesState = filterState === "all" || item.state === filterState;
    
    return matchesSearch && matchesType && matchesState;
  });

  const openInAzureDevOps = (workItemId: number) => {
    const url = `https://dev.azure.com/${organization}/${project}/_workitems/edit/${workItemId}`;
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Work Items
            <Badge variant="secondary">{filteredWorkItems.length}</Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search work items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[250px]"
                data-testid="input-search-workitems"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[120px]" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="User Story">User Story</SelectItem>
                <SelectItem value="Task">Task</SelectItem>
                <SelectItem value="Bug">Bug</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-[120px]" data-testid="select-state-filter">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {filteredWorkItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 border rounded-md hover-elevate"
              data-testid={`workitem-${item.id}`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                  {getWorkItemIcon(item.type)}
                  <span className="font-mono text-sm text-muted-foreground">
                    #{item.id}
                  </span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {getStateIcon(item.state)}
                      <Badge variant={getStateColor(item.state) as any} className="text-xs">
                        {item.state}
                      </Badge>
                    </div>
                    
                    <Badge variant={getPriorityColor(item.priority) as any} className="text-xs">
                      {item.priority}
                    </Badge>
                    
                    {item.hoursAllocated && (
                      <span>
                        {item.hoursBurned || 0}h / {item.hoursAllocated}h
                      </span>
                    )}
                    
                    {item.tags.length > 0 && (
                      <div className="flex gap-1">
                        {item.tags.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {item.assignedTo && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={item.assignedTo.imageUrl} />
                      <AvatarFallback className="text-xs">
                        {item.assignedTo.displayName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {item.assignedTo.displayName}
                    </span>
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openInAzureDevOps(item.id)}
                data-testid={`link-workitem-${item.id}`}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {filteredWorkItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>No work items found matching your criteria.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}