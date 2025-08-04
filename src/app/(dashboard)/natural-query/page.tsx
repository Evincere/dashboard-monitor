'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { MessageSquare, Loader, Send, Code } from 'lucide-react';
import { handleNaturalQuery } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const initialState = {
  sqlQuery: null,
  answer: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="icon" aria-label="Enviar consulta">
      {pending ? <Loader className="animate-spin" /> : <Send />}
    </Button>
  );
}

export default function NaturalQueryPage() {
  const [state, formAction] = useActionState(handleNaturalQuery, initialState);

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-primary" />
          Consulta Natural
        </h1>
        <p className="text-muted-foreground mt-2">
          Realice preguntas directas en español. El sistema las traducirá a SQL y le dará una respuesta.
        </p>
      </header>

      <form action={formAction} className="flex items-center gap-2 mb-8">
        <Input
          name="question"
          placeholder="Ej: ¿Cuántos usuarios se registraron este mes?"
          className="bg-card/60 border-white/10 text-base"
          required
        />
        <SubmitButton />
      </form>
      
      <div className="flex-grow grid gap-8 md:grid-cols-2">
        {state.error && (
            <div className="md:col-span-2">
                <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            </div>
        )}

        {state.sqlQuery && (
          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg animate-in fade-in-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <Code className="w-5 h-5" />
                Consulta SQL Generada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-background/50 p-4 rounded-md overflow-x-auto">
                <code className="font-code text-accent">{state.sqlQuery}</code>
              </pre>
            </CardContent>
          </Card>
        )}

        {state.answer && (
          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg animate-in fade-in-50">
            <CardHeader>
              <CardTitle className="font-headline">Respuesta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-foreground/90">{state.answer}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
