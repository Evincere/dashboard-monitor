import { Database, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

export default function DatabasePage() {
  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <Database className="w-8 h-8 text-primary" />
          Estado de la Base de Datos
        </h1>
        <p className="text-muted-foreground mt-2">
          Información de conexión y estadísticas de las tablas principales.
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
      </div>
    </div>
  );
}
