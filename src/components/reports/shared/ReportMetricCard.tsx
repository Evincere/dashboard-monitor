// ================================================
// COMPONENTE MÉTRICA CARD - REPORTS UI
// ================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface ReportMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  className?: string;
}

export function ReportMetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  loading = false,
  className 
}: ReportMetricCardProps) {
  return (
    <Card className={cn(
      'bg-card/60 backdrop-blur-sm border-white/10 shadow-lg transition-all hover:shadow-xl',
      loading && 'animate-pulse opacity-70',
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn(
          "h-4 w-4 text-muted-foreground transition-colors",
          loading && "animate-pulse"
        )} />
      </CardHeader>
      
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? '...' : value}
        </div>
        
        {trend && !loading && (
          <p className={cn(
            "text-xs mt-1 flex items-center gap-1",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            {Math.abs(trend.value)}% vs anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}
