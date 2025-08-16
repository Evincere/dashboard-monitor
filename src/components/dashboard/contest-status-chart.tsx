
'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw } from "lucide-react"
import { Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ContestStatus {
  status: string;
  count: number;
  percentage: number;
  label: string;
  contests?: {
    id: number;
    title: string;
    category: string;
    department: string;
    startDate: string | null;
    endDate: string | null;
    inscriptionStartDate: string | null;
    inscriptionEndDate: string | null;
  }[];
}

// Define colors for different statuses
const statusColors: { [key: string]: string } = {
  'ACTIVE': 'hsl(var(--chart-1))',
  'CLOSED': 'hsl(var(--chart-2))', 
  'FINISHED': 'hsl(var(--chart-3))',
  'IN_EVALUATION': 'hsl(var(--chart-4))',
  'SCHEDULED': 'hsl(var(--chart-5))',
  'DRAFT': 'hsl(var(--chart-6))',
  'PAUSED': 'hsl(var(--chart-7))',
  'CANCELLED': 'hsl(var(--chart-8))',
  'ARCHIVED': 'hsl(var(--chart-9))',
  'RESULTS_PUBLISHED': 'hsl(var(--chart-10))',
};

const chartConfig = {
  count: {
    label: "Concursos",
  },
}

export function ContestStatusChart() {
  const [data, setData] = useState<ContestStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<ContestStatus | null>(null);

  const fetchContestsByStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/dashboard/contests-status');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError('Error al cargar los datos');
        console.error('Error fetching contests by status:', result.error);
      }
    } catch (error) {
      setError('Error de conexión');
      console.error('Error fetching contests by status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContestsByStatus();

    // Refresh every 60 seconds
    const interval = setInterval(fetchContestsByStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Transform data for the chart
  const chartData = data.map((item, index) => ({
    status: item.label,
    count: item.count,
    percentage: item.percentage,
    fill: statusColors[item.status] || `hsl(var(--chart-${(index % 5) + 1}))`
  }));

  const totalContests = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="flex flex-col bg-card/60 backdrop-blur-sm border-white/10 shadow-lg h-full">
      <CardHeader className="items-center pb-0">
        <div className="flex items-center justify-between w-full">
          <div className="text-center">
            <CardTitle className="font-headline">Estado de Concursos</CardTitle>
            <CardDescription>Distribución de los concursos activos</CardDescription>
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {error ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>{error}</p>
          </div>
        ) : chartData.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No hay datos disponibles</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[300px]"
          >
            <PieChart onMouseMove={(e) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const statusLabel = e.activePayload[0].payload.status;
                const statusData = data.find(item => item.label === statusLabel);
                setHoveredStatus(statusData || null);
              }
            }}
            onMouseLeave={() => setHoveredStatus(null)}>
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const pieData = payload[0].payload;
                    const statusData = data.find(item => item.label === pieData.status);
                    
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md max-w-xs">
                        <div className="grid gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {pieData.status}
                            </span>
                            <span className="text-lg font-bold text-foreground">
                              {pieData.count} concursos ({pieData.percentage}%)
                            </span>
                          </div>
                          {statusData && statusData.contests && statusData.contests.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-muted">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Concursos:
                              </span>
                              <div className="mt-1 space-y-1">
                                {statusData.contests.slice(0, 3).map((contest) => (
                                  <div key={contest.id} className="text-xs">
                                    <div className="font-medium text-foreground truncate">
                                      {contest.title}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {contest.department} • {contest.category}
                                    </div>
                                  </div>
                                ))}
                                {statusData.contests.length > 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{statusData.contests.length - 3} más...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="status"
                innerRadius={60}
                strokeWidth={5}
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      {totalContests > 0 && (
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            Total: {totalContests} concursos <TrendingUp className="h-4 w-4" />
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
