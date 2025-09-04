import { useCallback } from 'react';
import { apiUrl, routeUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PostulantInfo } from '../types';

export const usePostulantActions = () => {
  const router = useRouter();
  const { toast } = useToast();

  const navigateToNextPostulant = useCallback(async (currentDni: string) => {
    try {
      const response = await fetch(apiUrl('proxy-backend/inscriptions?size=1000'));
      const result = await response.json();

      if (result.success && result.data && result.data.content) {
        const needsValidation = result.data.content.filter((p: any) => {
          return (
            p.userInfo?.fullName &&
            p.userInfo?.dni &&
            (p.state === 'COMPLETED_WITH_DOCS' || p.state === 'PENDING')
          );
        });

        if (needsValidation.length === 0) {
          toast({
            title: 'Validación Completada',
            description: 'No hay más postulantes pendientes de validación.',
          });
          setTimeout(() => router.push(routeUrl('postulations')), 2000);
          return;
        }

        const sortedDnis = needsValidation
          .sort((a: any, b: any) =>
            a.userInfo.fullName
              .toLowerCase()
              .localeCompare(b.userInfo.fullName.toLowerCase(), 'es')
          )
          .map((p: any) => p.userInfo.dni);

        const currentIndex = sortedDnis.indexOf(currentDni);

        if (currentIndex === -1) {
          if (sortedDnis.length > 0) {
            router.push(routeUrl(`postulations/${sortedDnis[0]}/documents/validation`));
          } else {
            router.push(routeUrl('postulations'));
          }
        } else {
          const nextIndex = currentIndex + 1;
          if (nextIndex < sortedDnis.length) {
            router.push(routeUrl(`postulations/${sortedDnis[nextIndex]}/documents/validation`));
          } else {
            toast({
              title: 'Validación Completada',
              description: 'Has llegado al final de la lista de postulantes pendientes.',
            });
            setTimeout(() => router.push(routeUrl('postulations')), 2000);
          }
        }
      }
    } catch (error) {
      console.error('Error navigating to next postulant:', error);
      toast({
        title: 'Error',
        description: 'No se pudo obtener la siguiente postulación',
        variant: 'destructive',
      });
      setTimeout(() => router.push(routeUrl('postulations')), 1500);
    }
  }, [router, toast]);

  const approvePostulation = useCallback(async (postulant: PostulantInfo) => {
    try {
      if (postulant.inscription.state === 'COMPLETED_WITH_DOCS') {
        const initiateResponse = await fetch(
          apiUrl(`postulations/${postulant.user.dni}/initiate-validation`),
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inscriptionId: postulant.inscription.id,
              note: 'Validación de documentos iniciada para aprobación',
            }),
          }
        );

        const initiateResult = await initiateResponse.json();
        if (!initiateResult.success) {
          throw new Error(initiateResult.error || 'Error al iniciar la validación');
        }
      }

      const response = await fetch(
        apiUrl(`postulations/${postulant.user.dni}/approve`),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inscriptionId: postulant.inscription.id,
            note: 'Postulación aprobada tras validación de documentos',
          }),
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Error al aprobar la postulación');
      }

      toast({
        title: 'Postulación Aprobada',
        description: 'Postulación aprobada. Actualizando lista y navegando...',
      });

      return true;
    } catch (error) {
      console.error('Error approving postulation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al aprobar la postulación',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    navigateToNextPostulant,
    approvePostulation,
  };
};
