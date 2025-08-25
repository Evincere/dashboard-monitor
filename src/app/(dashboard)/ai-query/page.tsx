'use client';

import { useFormState } from 'react-dom';
import { useFormStatus } from 'react-dom';
import { BrainCircuit, Loader, Wand2, Star, Clock } from 'lucide-react';
import { handleAiQuery } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { AiQueryState } from '@/lib/actions';

const initialState: AiQueryState = {
  summary: null,
  error: null,
  quality: null,
  processingTime: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader className="animate-spin" /> : <Wand2 />}
      <span>{pending ? 'Procesando...' : 'Generar Insight'}</span>
    </Button>
  );
}

export default function AiQueryPage() {
  const [state, formAction] = useFormState(handleAiQuery, initialState);

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-primary" />
          Consulta con IA (Contextual)
        </h1>
        <p className="text-muted-foreground mt-2">
          Realice preguntas complejas y abiertas. La IA analizará, ejecutará subconsultas y sintetizará una respuesta detallada.
        </p>
      </header>

      <div className="flex-grow flex flex-col gap-8">
        <form action={formAction} className="space-y-4">
          <Textarea
            name="question"
            placeholder="Ej: Analiza el rendimiento de los concursos del último trimestre, destacando los de mayor participación y el perfil de los postulantes..."
            className="min-h-[150px] bg-card/60 border-white/10 text-base"
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

          {state.summary && (
            <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg animate-in fade-in-50">
              <CardHeader>
                <CardTitle className="font-headline">Resumen de la IA</CardTitle>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-accent" />
                    Calidad: <span className="font-semibold text-foreground">{state.quality}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-accent" />
                    Tiempo: <span className="font-semibold text-foreground">{state.processingTime}</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none text-foreground/90 whitespace-pre-wrap">
                  {state.summary}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
