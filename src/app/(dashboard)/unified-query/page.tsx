'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { BrainCircuit, Loader, Send, Star, Clock, Code, Zap, MessageSquare } from 'lucide-react';
import { handleUnifiedQuery } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const initialState = {
  answer: null,
  error: undefined,
  queryType: null,
  sqlQueries: null,
  processingTime: null,
  queryQuality: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader className="animate-spin" /> : <Send />}
      <span>{pending ? 'Analizando...' : 'Consultar'}</span>
    </Button>
  );
}

export default function UnifiedQueryPage() {
  const [state, formAction] = useActionState(handleUnifiedQuery, initialState);

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-primary" />
          Consulta Inteligente
        </h1>
        <p className="text-muted-foreground mt-2">
          Realiza cualquier pregunta sobre el sistema. La IA analizará automáticamente si requiere procesamiento simple o complejo.
        </p>
      </header>

      <div className="flex-grow flex flex-col gap-8">
        <form action={formAction} className="space-y-4">
          <Textarea
            name="question"
            placeholder="Ej: ¿Cuántos usuarios hay activos? o Analiza el rendimiento de los concursos del último trimestre..."
            className="min-h-[120px] bg-card/60 border-white/10 text-base"
            required
          />
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>

        <div className="flex-grow">
          {state.error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state.answer && (
            <div className="space-y-6">
              {/* Query Type and Metrics */}
              <div className="flex flex-wrap gap-4 items-center">
                <Badge 
                  variant={state.queryType === 'simple' ? 'secondary' : 'default'}
                  className="flex items-center gap-1.5"
                >
                  {state.queryType === 'simple' ? (
                    <MessageSquare className="w-3 h-3" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  {state.queryType === 'simple' ? 'Consulta Simple' : 'Consulta Compleja'}
                </Badge>
                
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 text-accent" />
                  Calidad: <span className="font-semibold text-foreground">{state.queryQuality}</span>
                </span>
                
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-accent" />
                  Tiempo: <span className="font-semibold text-foreground">{state.processingTime}</span>
                </span>
              </div>

              {/* Main Answer */}
              <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg animate-in fade-in-50">
                <CardHeader>
                  <CardTitle className="font-headline">Respuesta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none text-foreground/90 whitespace-pre-wrap">
                    {state.answer}
                  </div>
                </CardContent>
              </Card>

              {/* SQL Queries */}
              {state.sqlQueries && state.sqlQueries.length > 0 && (
                <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg animate-in fade-in-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                      <Code className="w-5 h-5" />
                      {state.sqlQueries.length === 1 ? 'Consulta SQL Ejecutada' : 'Consultas SQL Ejecutadas'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {state.sqlQueries.map((query: string, index: number) => (
                      <div key={index}>
                        {state.sqlQueries.length > 1 && (
                          <div className="text-sm text-muted-foreground mb-2">
                            Consulta {index + 1}:
                          </div>
                        )}
                        <pre className="bg-background/50 p-4 rounded-md overflow-x-auto">
                          <code className="font-code text-accent text-sm">{query}</code>
                        </pre>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}