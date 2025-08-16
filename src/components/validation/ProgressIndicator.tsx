'use client';

import { CheckCircle, Clock, XCircle, BarChart3, Eye, PieChart, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ValidationStats {
  totalApplicants: number;
  pending: number;
  approved: number;
  rejected: number;
  inReview: number;
}

interface ProgressIndicatorProps {
  statistics: ValidationStats;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

export default function ProgressIndicator({ 
  statistics, 
  className = "",
  variant = 'default' 
}: ProgressIndicatorProps) {
  
  const completedCount = statistics.approved + statistics.rejected;
  const progressPercentage = statistics.totalApplicants > 0 
    ? Math.round((completedCount / statistics.totalApplicants) * 100)
    : 0;
  
  const approvalRate = completedCount > 0 
    ? Math.round((statistics.approved / completedCount) * 100)
    : 0;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span>Progreso</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        <div className="text-sm text-muted-foreground">
          {completedCount} de {statistics.totalApplicants}
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    // Calculate percentages
    const approvedPercentage = statistics.totalApplicants > 0 
      ? Math.round((statistics.approved / statistics.totalApplicants) * 100) : 0;
    
    const rejectedPercentage = statistics.totalApplicants > 0 
      ? Math.round((statistics.rejected / statistics.totalApplicants) * 100) : 0;
    
    const pendingPercentage = statistics.totalApplicants > 0 
      ? Math.round((statistics.pending / statistics.totalApplicants) * 100) : 0;
    
    const reviewPercentage = statistics.totalApplicants > 0 
      ? Math.round((statistics.inReview / statistics.totalApplicants) * 100) : 0;
    
    const estimatedTimePerPostulant = 3; // minutes
    const estimatedTimeRemaining = (statistics.totalApplicants - completedCount) * estimatedTimePerPostulant;
    
    const formatTimeEstimate = (minutes: number) => {
      if (minutes < 60) return `${minutes} minutos`;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 
        ? `${hours} horas ${remainingMinutes} minutos` 
        : `${hours} horas`;
    };

    return (
      <Card className={cn("bg-card/60 backdrop-blur-sm border-white/10 shadow-lg", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Progreso de Validación</CardTitle>
            <Badge variant="outline" className="bg-primary/10">
              {progressPercentage}% Completado
            </Badge>
          </div>
          <CardDescription>
            Seguimiento detallado de avance de validación administrativa
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Main Progress Bar with Segments */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Progreso General</span>
              <span className="text-sm text-muted-foreground">
                {completedCount} de {statistics.totalApplicants} postulantes
              </span>
            </div>
            
            {/* Segmented progress bar */}
            <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden flex">
              <div 
                className="bg-green-500 h-3 transition-all duration-300" 
                style={{ width: `${approvedPercentage}%` }}
                title={`Aprobados: ${statistics.approved} (${approvedPercentage}%)`}
              />
              <div 
                className="bg-red-500 h-3 transition-all duration-300" 
                style={{ width: `${rejectedPercentage}%` }}
                title={`Rechazados: ${statistics.rejected} (${rejectedPercentage}%)`}
              />
              <div 
                className="bg-blue-500 h-3 transition-all duration-300" 
                style={{ width: `${reviewPercentage}%` }}
                title={`En revisión: ${statistics.inReview} (${reviewPercentage}%)`}
              />
            </div>
            
            <div className="flex text-xs justify-between">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Aprobados
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Rechazados
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                En revisión
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-muted/50 rounded-full"></div>
                Pendientes
              </span>
            </div>
          </div>
          
          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-800/30">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">{statistics.approved}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-green-600 dark:text-green-500">Aprobados</p>
                    <Badge className="text-[10px] h-4 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-800/30 dark:text-green-400">
                      {approvedPercentage}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800/30">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-800/30 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">{statistics.rejected}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-red-600 dark:text-red-500">Rechazados</p>
                    <Badge className="text-[10px] h-4 bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-800/30 dark:text-red-400">
                      {rejectedPercentage}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/30">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{statistics.inReview}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-blue-600 dark:text-blue-500">En Revisión</p>
                    <Badge className="text-[10px] h-4 bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-800/30 dark:text-blue-400">
                      {reviewPercentage}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/30">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-800/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{statistics.pending}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">Pendientes</p>
                    <Badge className="text-[10px] h-4 bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-800/30 dark:text-yellow-400">
                      {pendingPercentage}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Metrics and Projections */}
          <div className="space-y-3 pt-3 border-t">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Métricas y Estimaciones
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Tasa de Aprobación</span>
                <span className="text-lg font-medium text-green-600 dark:text-green-400">
                  {approvalRate}%
                </span>
              </div>
              
              <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Velocidad</span>
                <span className="text-sm font-medium">
                  {completedCount > 0 ? `${completedCount} validados` : 'Sin datos'}
                </span>
              </div>
              
              <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Tiempo estimado restante</span>
                <span className="text-sm font-medium">
                  {statistics.pending > 0 ? formatTimeEstimate(estimatedTimeRemaining) : 'Completado'}                  
                </span>
              </div>
              
              <div className="flex flex-col p-3 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Postulantes restantes</span>
                <span className="text-lg font-medium text-yellow-600 dark:text-yellow-400">
                  {statistics.totalApplicants - completedCount}
                </span>
              </div>
            </div>
            
            {progressPercentage === 100 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg dark:bg-green-900/10 dark:border-green-800/30">
                <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  ¡Validación completada! Todos los postulantes han sido procesados.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn("bg-card/60 backdrop-blur-sm border-white/10 shadow-lg", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Progreso Global</CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2 flex items-center gap-2">
          <span>{progressPercentage}%</span>
          {progressPercentage === 100 && (
            <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              Completado
            </Badge>
          )}
        </div>
        
        {/* Segmented progress bar */}
        <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden flex mb-3">
          <div 
            className="bg-green-500 h-2 transition-all duration-300" 
            style={{ width: `${statistics.approved / statistics.totalApplicants * 100}%` }}
          />
          <div 
            className="bg-red-500 h-2 transition-all duration-300" 
            style={{ width: `${statistics.rejected / statistics.totalApplicants * 100}%` }}
          />
          <div 
            className="bg-blue-500 h-2 transition-all duration-300" 
            style={{ width: `${statistics.inReview / statistics.totalApplicants * 100}%` }}
          />
        </div>
        
        <p className="text-xs text-muted-foreground">
          {completedCount} de {statistics.totalApplicants} postulantes procesados
        </p>
        
        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            {statistics.approved}
          </div>
          
          <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            {statistics.rejected}
          </div>
          
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs dark:bg-blue-900/20 dark:text-blue-400">
            <Eye className="w-3 h-3" />
            {statistics.inReview}
          </div>
          
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs dark:bg-yellow-900/20 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            {statistics.pending}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
