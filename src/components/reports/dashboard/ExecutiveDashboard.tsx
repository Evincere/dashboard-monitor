// ================================================
// DASHBOARD EJECUTIVO - CONTAINER PRINCIPAL
// ================================================

import { Button } from '@/components/ui/button';
import { RefreshCw, Play, Pause } from 'lucide-react';
import { KPIGrid } from './KPIGrid';
import { useReportData } from '@/lib/reports/hooks/useReportData';

export function ExecutiveDashboard() {
  const { 
    metrics, 
    isLoading, 
    error, 
    autoRefresh, 
    toggleAutoRefresh, 
    forceRefresh 
  } = useReportData();

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Error cargando métricas: {error.message}</p>
        <Button onClick={forceRefresh} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Ejecutivo</h2>
          <p className="text-muted-foreground">
            Métricas en tiempo real del proceso de validación
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAutoRefresh}
            className="flex items-center gap-2"
          >
            {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoRefresh ? 'Pausar' : 'Auto-refresh'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={forceRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Grid de KPIs */}
      <KPIGrid metrics={metrics} loading={isLoading} />

      {/* Footer con timestamp */}
      {metrics && (
        <div className="text-xs text-muted-foreground text-center">
          Última actualización: {new Date().toLocaleString('es-ES')}
          {autoRefresh && ' • Auto-actualización activa'}
        </div>
      )}
    </div>
  );
}
