'use client';

import { apiUrl, routeUrl } from "@/lib/utils";


import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, Circle, Sparkles, Loader, FileQuestion, FileArchive, FolderArchive, HelpCircle, RefreshCw } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getTableDisplayName } from '@/lib/table-names';

// Interface for database statistics
interface DatabaseStats {
  connection: {
    connected: boolean;
    name: string;
    host: string;
  };
  tables: Array<{
    table: string;
    rows: string;
  }>;
  backups: {
    lastBackup: string;
    recentBackups: Array<{
      date: string;
      size: string;
    }>;
  };
  documents: {
    totalDocs: string;
    totalSize: string;
  };
}


import type { ActionState } from '@/lib/actions';

const initialState: ActionState = {
  suggestions: null,
  error: null,
  loading: false,
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
  const [state, formAction] = useActionState(
    async (_: ActionState, formData: FormData) => handleGenerateSuggestions(formData),
    initialState
  );
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch database statistics
  const fetchDatabaseStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(apiUrl('database/stats'));
      const data = await response.json();

      if (data.success) {
        setDbStats(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch database stats');
      }
    } catch (err) {
      console.error('Error fetching database stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-headline">Conexión a MySQL</CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchDatabaseStats}
              disabled={loading}
              title="Actualizar estadísticas"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-sm">
            {loading ? (
              <>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <Skeleton className="h-6 w-24 mt-1" />
                </div>
                <div>
                  <p className="text-muted-foreground">Nombre de la BD</p>
                  <Skeleton className="h-4 w-32 mt-1" />
                </div>
                <div>
                  <p className="text-muted-foreground">Host</p>
                  <Skeleton className="h-4 w-28 mt-1" />
                </div>
              </>
            ) : error ? (
              <div className="col-span-full">
                <Alert variant="destructive">
                  <AlertTitle>Error de conexión</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            ) : dbStats ? (
              <>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <Badge variant={dbStats.connection.connected ? 'default' : 'destructive'} className="bg-green-500/80 text-white mt-1">
                    <Circle className="mr-2 h-2 w-2 fill-current" />
                    {dbStats.connection.connected ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Nombre de la BD</p>
                  <p className="font-mono text-foreground mt-1">{dbStats.connection.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Host</p>
                  <p className="font-mono text-foreground mt-1">{dbStats.connection.host}</p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Estadísticas de Tablas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>No se pudieron cargar las estadísticas de tablas.</AlertDescription>
                </Alert>
              ) : dbStats ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Nombre de la Tabla</TableHead>
                        <TableHead className="min-w-[100px] text-right">Filas</TableHead>
                        <TableHead className="min-w-[150px] text-xs text-muted-foreground">Nombre Técnico</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dbStats.tables.slice(0, 10).map((stat) => (
                        <TableRow key={stat.table}>
                          <TableCell className="font-medium">
                            {getTableDisplayName(stat.table)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {Number(stat.rows).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {stat.table}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <HelpCircle />
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

          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <FileArchive />
                Gestión de Backups
              </CardTitle>
              <CardDescription>
                Crea y gestiona las copias de seguridad de la base de datos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Último backup</p>
                      <Skeleton className="h-4 w-40 mt-1" />
                    </div>
                    <Link href="/backups">
                      <Button variant="outline">Ir a Backups</Button>
                    </Link>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">Backups Recientes</h4>
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : dbStats ? (
                <>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Último backup</p>
                      <p className="font-mono text-foreground">{dbStats.backups.lastBackup}</p>
                    </div>
                    <Link href="/backups">
                      <Button variant="outline">Ir a Backups</Button>
                    </Link>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">Backups Recientes</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Tamaño</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dbStats.backups.recentBackups.map((backup) => (
                          <TableRow key={backup.date}>
                            <TableCell className="font-mono">{backup.date}</TableCell>
                            <TableCell className="text-right font-mono">{backup.size}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <FolderArchive />
                Gestión de Documentación
              </CardTitle>
              <CardDescription>
                Administra los documentos subidos por los usuarios en los concursos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-background/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total de Documentos</p>
                      <Skeleton className="h-8 w-24 mx-auto mt-2" />
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Espacio Utilizado</p>
                      <Skeleton className="h-8 w-20 mx-auto mt-2" />
                    </div>
                  </div>
                  <Separator className="my-4 bg-border/50" />
                  <div className="flex justify-center">
                    <Link href={routeUrl("documents")}>
                      <Button>Gestionar Documentos</Button>
                    </Link>
                  </div>
                </>
              ) : dbStats ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-background/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total de Documentos</p>
                      <p className="text-2xl font-bold font-headline">{dbStats.documents.totalDocs}</p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Espacio Utilizado</p>
                      <p className="text-2xl font-bold font-headline">{dbStats.documents.totalSize}</p>
                    </div>
                  </div>
                  <Separator className="my-4 bg-border/50" />
                  <div className="flex justify-center">
                    <Link href={routeUrl("documents")}>
                      <Button>Gestionar Documentos</Button>
                    </Link>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
