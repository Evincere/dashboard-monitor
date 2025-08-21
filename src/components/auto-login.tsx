'use client';

import { useEffect } from 'react';

export default function AutoLogin() {
  useEffect(() => {
    const performAutoLogin = async () => {
      try {
        // Paso 1: Inicializar usuario admin si no existe
        console.log('🔧 Inicializando usuario admin...');
        const initResponse = await fetch('/dashboard-monitor/api/init-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const initResult = await initResponse.json();
        console.log('👤 Inicialización admin:', initResult);

        // Paso 2: Verificar si ya tenemos un token válido
        const healthCheck = await fetch('/dashboard-monitor/api/documents?page=1&limit=1');
        
        if (healthCheck.status === 401) {
          console.log('🔐 No hay token válido, intentando login automático...');
          
          // Paso 3: Intentar login automático
          const loginResponse = await fetch('/dashboard-monitor/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'admin@mpd.com', 
              password: 'admin123'
            }),
          });

          if (loginResponse.ok) {
            console.log('✅ Login automático exitoso');
            // Esperar un momento para que las cookies se establezcan
            setTimeout(() => {
              window.location.reload();
            }, 500);
          } else {
            const errorText = await loginResponse.text();
            console.log('❌ Login automático falló:', errorText);
          }
        } else if (healthCheck.ok) {
          console.log('✅ Token de autenticación válido encontrado');
        } else {
          console.log('🔍 Status de verificación:', healthCheck.status);
        }
      } catch (error) {
        console.log('🔄 Error en autenticación automática:', error);
      }
    };

    // Ejecutar login automático después de un breve delay
    const timer = setTimeout(performAutoLogin, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return null; // Este componente no renderiza nada
}
