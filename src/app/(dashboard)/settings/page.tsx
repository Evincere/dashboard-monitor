'use client';
import { apiUrl } from '@/lib/utils';

import { useState, useEffect } from 'react';
import { Settings, KeyRound, Save, Loader, CheckCircle, XCircle, AlertCircle, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AIProviderStatus {
  name: string;
  enabled: boolean;
  configured: boolean;
  model: string;
  hasApiKey: boolean;
}

interface AIProviderInfo {
  defaultProvider: string;
  availableProviders: string[];
  providerDetails: AIProviderStatus[];
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiProviders, setAiProviders] = useState<AIProviderInfo | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [isTestingProvider, setIsTestingProvider] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
    loadAIProviders();
  }, []);

  const loadAIProviders = async () => {
    try {
      const response = await fetch(apiUrl('ai-providers'));
      const result = await response.json();
      if (result.success) {
        setAiProviders(result.data);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo cargar la información de proveedores de IA.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading AI providers:', error);
      toast({
        title: 'Error',
        description: 'Error al conectar con el servidor.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingProviders(false);
    }
  };

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

  const handleSetDefaultProvider = async (provider: string) => {
    try {
      const response = await fetch(apiUrl('ai-providers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setDefault', provider }),
      });
      
      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Éxito',
          description: `Proveedor por defecto cambiado a ${provider}`,
          className: 'bg-green-600 border-green-600 text-white'
        });
        loadAIProviders();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo cambiar el proveedor por defecto',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cambiar el proveedor por defecto',
        variant: 'destructive'
      });
    }
  };

  const handleTestProvider = async (provider: string) => {
    setIsTestingProvider(provider);
    try {
      const response = await fetch(apiUrl('ai-providers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', provider }),
      });
      
      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Prueba exitosa',
          description: `El proveedor ${provider} está funcionando correctamente`,
          className: 'bg-green-600 border-green-600 text-white'
        });
      } else {
        toast({
          title: 'Prueba fallida',
          description: result.error || `El proveedor ${provider} no está funcionando`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al probar el proveedor',
        variant: 'destructive'
      });
    } finally {
      setIsTestingProvider(null);
    }
  };

  const getProviderIcon = (configured: boolean) => {
    return configured ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
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

      <div className="space-y-6 max-w-4xl">
        {/* AI Providers Status */}
        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Proveedores de IA
            </CardTitle>
            <CardDescription>
              Estado actual de los proveedores de inteligencia artificial configurados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProviders ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="animate-spin w-6 h-6" />
                <span className="ml-2">Cargando proveedores...</span>
              </div>
            ) : aiProviders ? (
              <div className="space-y-4">
                {/* Validation Messages */}
                {aiProviders.validation.errors.length > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="font-medium text-red-500">Errores de configuración</span>
                    </div>
                    <ul className="text-sm text-red-400 space-y-1">
                      {aiProviders.validation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiProviders.validation.warnings.length > 0 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-yellow-500">Advertencias</span>
                    </div>
                    <ul className="text-sm text-yellow-400 space-y-1">
                      {aiProviders.validation.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Default Provider Selection */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Proveedor por defecto:</label>
                  <Select
                    value={aiProviders.defaultProvider}
                    onValueChange={handleSetDefaultProvider}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aiProviders.availableProviders.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider.charAt(0).toUpperCase() + provider.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Provider Details */}
                <div className="grid gap-4">
                  {aiProviders.providerDetails.map((provider) => (
                    <div
                      key={provider.name}
                      className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        {getProviderIcon(provider.configured)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{provider.name}</span>
                            {provider.name === aiProviders.defaultProvider && (
                              <Badge variant="secondary" className="text-xs">Por defecto</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Modelo: {provider.model} | 
                            API Key: {provider.hasApiKey ? 'Configurada' : 'No configurada'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={provider.configured ? 'default' : 'destructive'}>
                          {provider.configured ? 'Configurado' : 'No configurado'}
                        </Badge>
                        {provider.configured && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestProvider(provider.name)}
                            disabled={isTestingProvider === provider.name}
                          >
                            {isTestingProvider === provider.name ? (
                              <Loader className="animate-spin w-3 h-3" />
                            ) : (
                              'Probar'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No se pudo cargar la información de proveedores
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legacy Gemini API Key (for backward compatibility) */}
        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Clave de API de Google Gemini (Legacy)</CardTitle>
            <CardDescription>
              Esta configuración es para compatibilidad con versiones anteriores. 
              Se recomienda usar variables de entorno para configurar las claves de API.
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

        {/* Environment Variables Guide */}
        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Configuración de Variables de Entorno</CardTitle>
            <CardDescription>
              Para configurar los proveedores de IA, agregue las siguientes variables de entorno:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-background/50 p-4 rounded-lg border border-white/10">
                <h4 className="font-medium mb-2">Variables disponibles:</h4>
                <div className="text-sm font-mono space-y-1 text-muted-foreground">
                  <div># Proveedor por defecto</div>
                  <div>AI_PROVIDER=gemini|openai|claude</div>
                  <div></div>
                  <div># Google Gemini</div>
                  <div>GOOGLE_GENAI_API_KEY=tu_clave_aqui</div>
                  <div>GEMINI_MODEL=gemini-2.0-flash</div>
                  <div></div>
                  <div># OpenAI</div>
                  <div>OPENAI_API_KEY=tu_clave_aqui</div>
                  <div>OPENAI_MODEL=gpt-4o-mini</div>
                  <div></div>
                  <div># Claude (Anthropic)</div>
                  <div>ANTHROPIC_API_KEY=tu_clave_aqui</div>
                  <div>CLAUDE_MODEL=claude-3-5-sonnet-20241022</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
