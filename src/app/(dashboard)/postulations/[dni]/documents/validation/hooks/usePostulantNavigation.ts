import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl, routeUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export const usePostulantNavigation = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [navigating, setNavigating] = useState(false);

  const navigateToNextPostulant = useCallback(async (currentDni: string) => {
    if (navigating) return;
    setNavigating(true);

    try {
      const response = await fetch(
        apiUrl('proxy-backend/postulations/next-pending'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ currentDni }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'No hay más postulantes pendientes');
      }

      if (result.data.nextDni) {
        router.push(routeUrl(`postulations/${result.data.nextDni}/documents/validation`));
      } else {
        toast({
          title: 'Validación Completada',
          description: 'No hay más postulantes pendientes de validación.',
        });
        setTimeout(() => router.push(routeUrl('postulations')), 2000);
      }
    } catch (error) {
      console.error('Error navigating to next postulant:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
      setTimeout(() => router.push(routeUrl('postulations')), 1500);
    } finally {
      setNavigating(false);
    }
  }, [router, toast]);

  return {
    navigateToNextPostulant,
    navigating
  };
};
