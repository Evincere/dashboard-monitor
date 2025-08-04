'use client';

import { useState, useEffect } from 'react';
import { Users, FileText, Library, UserCheck } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { UserGrowthChart } from '@/components/dashboard/user-growth-chart';
import { InscriptionsChart } from '@/components/dashboard/inscriptions-chart';

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    activeUsers: 1254,
    activeContests: 23,
    processedDocs: 5874,
    inscriptions: 2341,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prevMetrics) => ({
        activeUsers: prevMetrics.activeUsers + getRandomInt(-2, 3),
        activeContests: prevMetrics.activeContests,
        processedDocs: prevMetrics.processedDocs + getRandomInt(1, 5),
        inscriptions: prevMetrics.inscriptions + getRandomInt(0, 2),
      }));
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <MetricCard title="Usuarios Activos" value={metrics.activeUsers.toLocaleString('es')} icon={Users} />
        <MetricCard title="Concursos Activos" value={metrics.activeContests.toLocaleString('es')} icon={Library} />
        <MetricCard title="Documentos Procesados" value={metrics.processedDocs.toLocaleString('es')} icon={FileText} />
        <MetricCard title="Inscripciones" value={metrics.inscriptions.toLocaleString('es')} icon={UserCheck} />
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <UserGrowthChart />
        <InscriptionsChart />
      </div>
    </main>
  );
}
