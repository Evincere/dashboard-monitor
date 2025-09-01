'use client';
import { apiUrl } from '@/lib/utils';
import { useAuthenticatedApi } from '@/lib/auth-fetch';

import { useState, useEffect } from 'react';
import { Users, FileText, Library, UserCheck, HardDrive, RefreshCw } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { InscriptionStatsChart } from '@/components/dashboard/inscription-stats-chart';
import { ContestStatusChart } from '@/components/dashboard/contest-status-chart';
import { DocumentTypeChart } from '@/components/dashboard/document-type-chart';
import { RecentActivityWidget } from '@/components/dashboard/recent-activity-widget';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  activeUsers: number;
  activeContests: number;
  processedDocs: number;
  inscriptions: number;
  storageUsed: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'user' | 'inscription' | 'document' | 'contest';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardStats>({
    activeUsers: 0,
    activeContests: 0,
    processedDocs: 0,
    inscriptions: 0,
    storageUsed: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();
  const api = useAuthenticatedApi();

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const result = await api(apiUrl('dashboard/stats'));

      if (result.success) {
        setMetrics(result.data);
        setLastUpdated(new Date().toLocaleString('es-ES'));
      } else {
        console.error('Error fetching dashboard stats:', result.error);
        toast({
          title: 'Error',
          description: 'Error al cargar las estadísticas del dashboard',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: 'Error',
        description: 'Error al conectar con el servidor',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetchDashboardStats();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      {/* Header with refresh info */}
      {lastUpdated && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Última actualización: {lastUpdated}</span>
          <div className="flex items-center gap-2">
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
            <span>Actualización automática cada 30 segundos</span>
          </div>
        </div>
      )}
      
       <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-5">
        <MetricCard 
          title="Usuarios Registrados" 
          value={loading ? '...' : metrics.activeUsers.toLocaleString('es')} 
          icon={Users} 
          loading={loading}
        />
        <MetricCard 
          title="Concursos Activos" 
          value={loading ? '...' : metrics.activeContests.toLocaleString('es')} 
          icon={Library} 
          loading={loading}
        />
        <MetricCard 
          title="Documentos Procesados" 
          value={loading ? '...' : metrics.processedDocs.toLocaleString('es')} 
          icon={FileText} 
          loading={loading}
        />
        <MetricCard 
          title="Inscripciones" 
          value={loading ? '...' : metrics.inscriptions.toLocaleString('es')} 
          icon={UserCheck} 
          loading={loading}
        />
        <MetricCard 
          title="Almacenamiento Total" 
          value={loading ? '...' : `${metrics.storageUsed.toLocaleString('es')} GB`} 
          icon={HardDrive} 
          loading={loading}
        />
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <InscriptionStatsChart />
        </div>
        <div className="lg:col-span-1">
            <RecentActivityWidget activities={metrics.recentActivity} />
        </div>
        <div className="lg:col-span-2">
            <DocumentTypeChart />
        </div>
        <div className="lg:col-span-1">
            <ContestStatusChart />
        </div>
      </div>
    </main>
  );
}
