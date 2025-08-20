'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PostulationsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect immediately to the validation page
    router.replace('/validation');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] flex-col space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">
        Redirigiendo a la página de validación...
      </p>
      <p className="text-sm text-muted-foreground">
        La gestión de postulaciones se ha unificado en el módulo de validación.
      </p>
    </div>
  );
}
