
'use client';

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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartData = [
    { contest: 'Juez de Cámara', inscriptions: 124 },
    { contest: 'Fiscal Auxiliar', inscriptions: 87 },
    { contest: 'Defensor Oficial', inscriptions: 156 },
    { contest: 'Secretario', inscriptions: 45 },
    { contest: 'Asistente Legal', inscriptions: 210 },
];

const chartConfig = {
    inscriptions: {
        label: 'Inscripciones',
        color: 'hsl(var(--accent))',
    },
};

export function InscriptionsChart() {
  return (
    <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Inscripciones por Concurso</CardTitle>
        <CardDescription>Número de inscripciones en los concursos más populares</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart accessibilityLayer data={chartData}>
             <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="contest"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.split(" ").map(w => w[0]).join('')}
            />
            <YAxis />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="inscriptions" fill="var(--color-inscriptions)" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
