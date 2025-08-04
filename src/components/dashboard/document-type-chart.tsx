
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { type: "CV", count: 4500 },
  { type: "Títulos", count: 3200 },
  { type: "Certificados", count: 5100 },
  { type: "DNI", count: 1800 },
  { type: "Otros", count: 1229 },
]

const chartConfig = {
  count: {
    label: "Documentos",
    color: "hsl(var(--chart-1))",
  },
}

export function DocumentTypeChart() {
  return (
    <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg h-full">
      <CardHeader>
        <CardTitle className="font-headline">Documentos por Categoría</CardTitle>
        <CardDescription>Distribución de los tipos de documentos subidos</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis type="number" hide />
            <YAxis
              dataKey="type"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={80}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
