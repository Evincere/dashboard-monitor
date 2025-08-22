// ================================================
// HOOK DE DATOS REPORTES - REACT QUERY INTEGRATION
// ================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { DashboardMetrics, TechnicalIssue, ReportFilter } from '../types/index';

// =====================================
// HOOK PRINCIPAL DE MÉTRICAS DASHBOARD
// =====================================

export function useReportData() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const response = await fetch('/api/reports/dashboard/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,  // 5 minutos
    gcTime: 10 * 60 * 1000,    // 10 minutos 
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh cada 30s
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  const forceRefresh = useCallback(() => {
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
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch technical issues');
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000,  // 2 minutos
    enabled: true,
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
        const response = await fetch('/api/reports/dashboard/metrics');
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
