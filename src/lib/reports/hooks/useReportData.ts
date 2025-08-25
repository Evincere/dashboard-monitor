// ================================================
// HOOK DE DATOS REPORTES - REACT QUERY INTEGRATION
// ================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { authFetch } from '@/lib/auth-fetch'; // ✅ Importar authFetch
import type { DashboardMetrics, TechnicalIssue, ReportFilter } from '../types/index';

// =====================================
// HOOK PRINCIPAL DE MÉTRICAS DASHBOARD
// =====================================

export function useReportData() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      console.log('🔍 [useReportData] Fetching dashboard metrics...');
      
      // ✅ Usar authFetch en lugar de fetch
      const response = await authFetch('/api/reports/dashboard/metrics');
      
      if (!response.ok) {
        console.error('❌ [useReportData] Fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch dashboard metrics: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ [useReportData] Metrics received:', {
        totalUsers: data.totalUsers,
        totalDocuments: data.totalDocuments,
        progress: data.processingProgress
      });
      
      return data;
    },
    staleTime: 5 * 60 * 1000,  // 5 minutos
    gcTime: 10 * 60 * 1000,    // 10 minutos 
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh cada 30s
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 3, // ✅ Añadir retry para casos de falla temporal
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
    console.log('🔧 [useReportData] Auto-refresh toggled:', !autoRefresh);
  }, [autoRefresh]);

  const forceRefresh = useCallback(() => {
    console.log('🔄 [useReportData] Force refresh triggered');
    refetch();
  }, [refetch]);

  return {
    metrics,
    isLoading,
    error,
    autoRefresh,
    toggleAutoRefresh,
    forceRefresh,
  };
}

// =====================================
// HOOK DE PROBLEMAS TÉCNICOS
// =====================================

export function useTechnicalIssues(filters?: ReportFilter) {
  const queryKey = ['technical-issues', filters];

  const { data: issues, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<TechnicalIssue[]> => {
      const searchParams = new URLSearchParams();

      if (filters?.dateRange) {
        searchParams.set('from', filters.dateRange.from.toISOString());
        searchParams.set('to', filters.dateRange.to.toISOString());
      }

      const url = `/api/reports/diagnostics/issues?${searchParams}`;
      
      // ✅ Usar authFetch también aquí
      const response = await authFetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch technical issues');
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000,  // 2 minutos
    enabled: true,
    retry: 2,
  });

  return {
    issues: issues || [],
    isLoading,
    error,
  };
}

// =====================================
// HOOK DE INVALIDACIÓN DE CACHE
// =====================================

export function useReportCache() {
  const queryClient = useQueryClient();

  const invalidateMetrics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  }, [queryClient]);

  const invalidateTechnicalIssues = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['technical-issues'] });
  }, [queryClient]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['technical-issues'] });
  }, [queryClient]);

  const prefetchMetrics = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['dashboard-metrics'],
      queryFn: async () => {
        // ✅ Usar authFetch también en prefetch
        const response = await authFetch('/api/reports/dashboard/metrics');
        return response.json();
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  return {
    invalidateMetrics,
    invalidateTechnicalIssues,
    invalidateAll,
    prefetchMetrics,
  };
}
