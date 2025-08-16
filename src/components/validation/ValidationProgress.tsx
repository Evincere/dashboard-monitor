'use client';

import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface ValidationProgressProps {
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completionPercentage: number;
  };
  className?: string;
}

export function ValidationProgress({ stats, className = '' }: ValidationProgressProps) {
  const completedCount = stats.approved + stats.rejected;
  const progressPercentage = (completedCount / stats.total) * 100;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Progreso de Validación
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            {completedCount}/{stats.total} documentos
          </span>
        </div>
        <Progress value={progressPercentage} className="h-3" />
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {Math.round(progressPercentage)}% completado
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-center mb-1">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {stats.pending}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            Pendientes
          </div>
        </div>

        <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-center mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {stats.approved}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">
            Aprobados
          </div>
        </div>

        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-center mb-1">
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-lg font-bold text-red-700 dark:text-red-300">
            {stats.rejected}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">
            Rechazados
          </div>
        </div>
      </div>

      {/* Completion Status */}
      {stats.pending === 0 && stats.total > 0 && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">¡Validación Completada!</span>
          </div>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
            Todos los documentos han sido procesados.
          </p>
        </div>
      )}
    </div>
  );
}