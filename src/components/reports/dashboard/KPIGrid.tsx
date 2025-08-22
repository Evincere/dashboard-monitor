// ================================================
// GRID KPIs PRINCIPALES - DASHBOARD EJECUTIVO
// ================================================

import { Users, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { ReportMetricCard } from '../shared/ReportMetricCard';
import type { DashboardMetrics } from '@/lib/reports/types/index';

interface KPIGridProps {
  metrics?: DashboardMetrics;
  loading?: boolean;
}

export function KPIGrid({ metrics, loading = false }: KPIGridProps) {
  const kpis = [
    {
      title: 'Usuarios Registrados',
      value: metrics?.totalUsers ?? 0,
      icon: Users,
      // Usar colores más sutiles y consistentes con el tema
      className: 'border-primary/20 bg-primary/5',
    },
    {
      title: 'Documentos Procesados',
      value: metrics?.totalDocuments ?? 0,
      icon: FileText,
      className: 'border-muted-foreground/20 bg-muted/5',
    },
    {
      title: 'Progreso de Validación',
      value: `${metrics?.processingProgress ?? 0}%`,
      icon: CheckCircle,
      className: 'border-green-500/20 bg-green-500/5',
    },
    {
      title: 'Problemas Técnicos',
      value: metrics?.documentsWithTechnicalIssues ?? 0,
      icon: AlertTriangle,
      className: 'border-destructive/20 bg-destructive/5',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <ReportMetricCard
          key={index}
          title={kpi.title}
          value={kpi.value}
          icon={kpi.icon}
          loading={loading}
          className={kpi.className}
        />
      ))}
    </div>
  );
}
