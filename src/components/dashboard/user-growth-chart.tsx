'use client';
import { useAuthenticatedApi } from "@/lib/auth-fetch";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, Tooltip } from 'recharts';

const chartData = [
  { month: 'Enero', users: 186 },
  { month: 'Febrero', users: 305 },
  { month: 'Marzo', users: 237 },
  { month: 'Abril', users: 273 },
  { month: 'Mayo', users: 209 },
  { month: 'Junio', users: 259 },
];

const chartConfig = {
  users: {
    label: 'Usuarios',
    color: 'hsl(var(--primary))',
  },
};

export function UserGrowthChart() {
  const api = useAuthenticatedApi();
  return (
    <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Crecimiento de Usuarios</CardTitle>
        <CardDescription>Usuarios activos durante los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="users"
              type="natural"
              stroke="var(--color-users)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
