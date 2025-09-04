import { useState, useCallback, useRef, useEffect } from 'react';
import { apiUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PostulantData {
  userInfo: {
    dni: string;
    fullName: string;
  };
  state: string;
}

interface UsePostulantsDataReturn {
  loading: boolean;
  pendingDNIs: string[];
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePostulantsData(currentDni: string): UsePostulantsDataReturn {
  const [loading, setLoading] = useState(true);
  const [pendingDNIs, setPendingDNIs] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cache para almacenar resultados previos
  const cache = useRef<{[key: string]: string[]}>({});
  
  const needsValidation = useCallback((postulant: PostulantData): boolean => {
    if (!postulant.userInfo?.fullName || !postulant.userInfo?.dni) return false;
    return postulant.state === 'COMPLETED_WITH_DOCS' || postulant.state === 'PENDING';
  }, []);

  const fetchData = useCallback(async (retryCount = 0) => {
    // Cancelar la petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Si tenemos datos en caché y no es un reintento, usarlos
    if (cache.current[currentDni] && retryCount === 0) {
      setPendingDNIs(cache.current[currentDni]);
      setLoading(false);
      // Refrescar en segundo plano
      fetchData(0);
      return;
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        apiUrl('proxy-backend/postulations/pending'),
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API returned success: false');
      }

      // Filtrar y ordenar postulantes pendientes
      const pendingPostulants = result.data.filter(needsValidation);
      const sortedDNIs = pendingPostulants
        .sort((a: PostulantData, b: PostulantData) =>
          a.userInfo.fullName
            .toLowerCase()
            .localeCompare(b.userInfo.fullName.toLowerCase(), 'es')
        )
        .map((p: PostulantData) => p.userInfo.dni);

      setPendingDNIs(sortedDNIs);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        
        // Reintentar con backoff exponencial hasta 3 veces
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          setTimeout(() => fetchData(retryCount + 1), delay);
        } else {
          toast({
            title: 'Error',
            description: `No se pudo obtener la lista de postulantes: ${err.message}`,
            variant: 'destructive',
          });
        }
      }
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  }, [toast, needsValidation]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    loading,
    pendingDNIs,
    error,
    refetch: fetchData
  };
};
