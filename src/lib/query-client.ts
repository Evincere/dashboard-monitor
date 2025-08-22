// ================================================
// CONFIGURACIÓN REACT QUERY - SISTEMA REPORTES
// ================================================

import { QueryClient } from '@tanstack/react-query';

// Cliente global de React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache inteligente
      staleTime: 5 * 60 * 1000,     // 5 minutos - datos considerados frescos
      gcTime: 10 * 60 * 1000,       // 10 minutos - tiempo en cache
      
      // Comportamiento de refetch
      refetchOnWindowFocus: true,    // Refetch al volver focus
      refetchOnReconnect: true,      // Refetch al reconectar red
      refetchIntervalInBackground: false, // No refetch en background
      
      // Error handling
      retry: (failureCount, error) => {
        // Solo reintentar en errores de red, no en 4xx
        if (error instanceof Error && error.message.includes('404')) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Reintento para mutaciones
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Configuración de cache específica para reportes
export const QUERY_KEYS = {
  // Métricas del dashboard
  DASHBOARD_METRICS: ['dashboard-metrics'] as const,
  
  // Problemas técnicos
  TECHNICAL_ISSUES: (filters?: any) => ['technical-issues', filters] as const,
  
  // Reportes generados
  GENERATED_REPORTS: ['generated-reports'] as const,
  
  // Lista de reportes
  REPORTS_LIST: (params?: any) => ['reports-list', params] as const,
} as const;

// Utilidades de invalidación
export const invalidateQueries = {
  // Invalidar todas las métricas
  allMetrics: () => queryClient.invalidateQueries({ 
    queryKey: QUERY_KEYS.DASHBOARD_METRICS 
  }),
  
  // Invalidar problemas técnicos
  technicalIssues: () => queryClient.invalidateQueries({ 
    predicate: (query) => query.queryKey[0] === 'technical-issues'
  }),
  
  // Invalidar todo el sistema de reportes
  allReports: () => queryClient.invalidateQueries({
    predicate: (query) => 
      typeof query.queryKey[0] === 'string' && 
      query.queryKey[0].includes('reports')
  }),
};
