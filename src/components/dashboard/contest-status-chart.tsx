
'use client';

import { TrendingUp } from "lucide-react"
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

const chartData = [
  { status: "Abierto", count: 12, fill: "var(--color-open)" },
  { status: "En Evaluación", count: 7, fill: "var(--color-evaluating)" },
  { status: "Finalizado", count: 4, fill: "var(--color-finished)" },
]

const chartConfig = {
  count: {
    label: "Concursos",
  },
  open: {
    label: "Abierto",
    color: "hsl(var(--chart-1))",
  },
  evaluating: {
    label: "En Evaluación",
    color: "hsl(var(--chart-2))",
  },
  finished: {
    label: "Finalizado",
    color: "hsl(var(--chart-4))",
  },
} 

export function ContestStatusChart() {
  return (
    <Card className="flex flex-col bg-card/60 backdrop-blur-sm border-white/10 shadow-lg h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="font-headline">Estado de Concursos</CardTitle>
        <CardDescription>Distribución de los concursos activos</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
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
      </CardContent>
    </Card>
  )
}
