'use client';

import { useState, useEffect } from 'react';
import { Settings, KeyRound, Save, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate saving the key
    setTimeout(() => {
      localStorage.setItem('gemini_api_key', apiKey);
      setIsLoading(false);
      toast({
        title: 'Éxito',
        description: 'La clave de API se ha guardado correctamente.',
        className: 'bg-green-600 border-green-600 text-white'
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary" />
          Configuración
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestione las configuraciones y claves de API para los servicios de IA.
        </p>
      </header>

      <Card className="max-w-2xl bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Clave de API de Google Gemini</CardTitle>
          <CardDescription>
            Introduzca su clave de API para habilitar las funcionalidades de consulta con IA. Su clave se almacena de forma segura en su navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Introduzca su clave de API"
                className="pl-10 bg-input/80 border-white/10"
                required
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? <Loader className="animate-spin" /> : <Save />}
              <span>{isLoading ? 'Guardando...' : 'Guardar Clave'}</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
