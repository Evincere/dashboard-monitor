'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Database, Circle, Sparkles, Loader, FileQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { handleGenerateSuggestions } from '@/lib/actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const dbStatus = {
  connected: true,
  name: 'mpd_concursos',
  host: 'mpd-concursos-mysql-prod',
};

const tableStats = [
  { table: 'usuarios', rows: '1,254' },
  { table: 'concursos', rows: '48' },
  { table: 'inscripciones', rows: '2,341' },
  { table: 'documentos', rows: '15,829' },
  { table: 'evaluaciones', rows: '782' },
];

const initialState = {
  suggestions: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader className="animate-spin" /> : <Sparkles />}
      <span>{pending ? 'Generando...' : 'Generar Sugerencias'}</span>
    </Button>
  );
}


export default function DatabasePage() {
  const [state, formAction] = useActionState(handleGenerateSuggestions, initialState);
  
  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <Database className="w-8 h-8 text-primary" />
          Estado de la Base de Datos
        </h1>
        <p className="text-muted-foreground mt-2">
          Información de conexión, estadísticas y herramientas de consulta para la base de datos.
        </p>
      </header>

      <div className="grid gap-8">
        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Conexión a MySQL</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">Estado</p>
              <Badge variant={dbStatus.connected ? 'default' : 'destructive'} className="bg-green-500/80 text-white mt-1">
                <Circle className="mr-2 h-2 w-2 fill-current" />
                {dbStatus.connected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Nombre de la BD</p>
              <p className="font-mono text-foreground mt-1">{dbStatus.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Host</p>
              <p className="font-mono text-foreground mt-1">{dbStatus.host}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline">Estadísticas de Tablas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Nombre de la Tabla</TableHead>
                        <TableHead className="text-right">Número de Filas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableStats.map((stat) => (
                        <TableRow key={stat.table}>
                            <TableCell className="font-medium font-mono">{stat.table}</TableCell>
                            <TableCell className="text-right font-mono">{stat.rows}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg flex flex-col">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <FileQuestion />
                        Sugerencias de Consultas IA
                    </CardTitle>
                    <CardDescription>
                        Utiliza IA para generar consultas útiles basadas en el esquema de tu base de datos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center gap-4">
                    {state.error && (
                         <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}
                    {state.suggestions && (
                        <div className="flex flex-wrap gap-2 justify-center">
                            {(state.suggestions as string[]).map((suggestion, index) => (
                                <Badge key={index} variant="secondary" className="text-sm cursor-pointer hover:bg-accent/80">
                                    {suggestion}
                                </Badge>
                            ))}
                        </div>
                    )}
                    {!state.suggestions && (
                        <p className="text-muted-foreground text-center">Haz clic en el botón para generar sugerencias.</p>
                    )}
                </CardContent>
                 <form action={formAction} className="p-6 pt-0">
                    <SubmitButton />
                </form>
            </Card>
        </div>
      </div>
    </div>
  );
}
