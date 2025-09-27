import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface BurndownData {
  day: string;
  ideal: number;
  actual: number;
  date: string;
}

interface CompletionData {
  name: string;
  completed: number;
  total: number;
  percentage: number;
}

interface SprintChartProps {
  burndownData: BurndownData[];
  completionData: CompletionData[];
  sprintDuration: number;
  currentDay: number;
}

const COLORS = {
  primary: "hsl(var(--chart-1))",
  secondary: "hsl(var(--chart-2))",
  success: "hsl(var(--chart-2))",
  warning: "hsl(var(--chart-3))",
  danger: "hsl(var(--chart-4))"
};

export default function SprintChart({ 
  burndownData, 
  completionData, 
  sprintDuration, 
  currentDay 
}: SprintChartProps) {
  const totalStoryPoints = burndownData[0]?.actual || 0;
  const remainingPoints = burndownData[burndownData.length - 1]?.actual || 0;
  const completedPoints = totalStoryPoints - remainingPoints;
  const progressPercentage = Math.round((completedPoints / totalStoryPoints) * 100);
  
  const isOnTrack = currentDay <= sprintDuration ? 
    remainingPoints <= (burndownData.find(d => d.day === currentDay.toString())?.ideal ?? 0) : 
    false;

  const pieData = [
    { name: "Completed", value: completedPoints, color: COLORS.success },
    { name: "Remaining", value: remainingPoints, color: COLORS.secondary }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sprint Burndown</CardTitle>
            <Badge variant={isOnTrack ? "default" : "destructive"}>
              {isOnTrack ? "On Track" : "Behind Schedule"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Sprint Progress</span>
              <span>{progressPercentage}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>{completedPoints} completed</span>
              <span>{remainingPoints} remaining</span>
            </div>
          </div>
          
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px"
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ideal" 
                  stroke={COLORS.secondary}
                  strokeDasharray="5 5"
                  name="Ideal Burndown"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke={COLORS.primary}
                  name="Actual Progress"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Item Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px"
                  }}
                />
                <Bar 
                  dataKey="completed" 
                  fill={COLORS.success}
                  name="Completed"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="total" 
                  fill={COLORS.secondary}
                  name="Total"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}