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
      className: 'border-blue-200 bg-blue-50/50',
    },
    {
      title: 'Documentos Procesados',
      value: metrics?.totalDocuments ?? 0,
      icon: FileText,
      className: 'border-gray-200 bg-gray-50/50',
    },
    {
      title: 'Progreso de Validación',
      value: `${metrics?.processingProgress ?? 0}%`,
      icon: CheckCircle,
      className: 'border-green-200 bg-green-50/50',
    },
    {
      title: 'Problemas Técnicos',
      value: metrics?.documentsWithTechnicalIssues ?? 0,
      icon: AlertTriangle,
      className: 'border-red-200 bg-red-50/50',
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
