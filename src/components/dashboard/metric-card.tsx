import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  loading?: boolean;
}

export function MetricCard({ title, value, icon: Icon, className, loading = false }: MetricCardProps) {
  return (
    <Card className={cn('bg-card/60 backdrop-blur-sm border-white/10 shadow-lg',
      loading && 'opacity-70',
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", loading && "animate-pulse")} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", loading && "animate-pulse")}>{value}</div>
      </CardContent>
    </Card>
  );
}
