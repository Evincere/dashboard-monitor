
'use client';

import { useState } from 'react';
import { FileArchive, Plus, Download, Trash2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const initialBackups = [
    { id: 'backup-20240730-0200', date: '2024-07-30 02:00:15', size: '2.1 GB', status: 'Completado' },
    { id: 'backup-20240729-0200', date: '2024-07-29 02:00:11', size: '2.1 GB', status: 'Completado' },
    { id: 'backup-20240728-0200', date: '2024-07-28 02:00:09', size: '2.0 GB', status: 'Completado' },
    { id: 'backup-20240727-0200', date: '2024-07-27 02:00:12', size: '2.0 GB', status: 'Completado' },
    { id: 'backup-20240726-0200', date: '2024-07-26 02:00:18', size: '1.9 GB', status: 'Completado' },
];


export default function BackupsPage() {
    const [backups, setBackups] = useState(initialBackups);
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();

    const handleCreateBackup = () => {
        setIsCreating(true);
        setTimeout(() => {
            const newBackup = {
                id: `backup-${Date.now()}`,
                date: new Date().toLocaleString('sv-SE').replace(' ', ' '),
                size: `${(Math.random() * 0.2 + 2.1).toFixed(1)} GB`,
                status: 'Completado',
            };
            setBackups([newBackup, ...backups]);
            setIsCreating(false);
            toast({
                title: 'Backup Creado',
                description: 'La nueva copia de seguridad se ha completado con éxito.',
                className: 'bg-green-600 border-green-600 text-white'
            });
        }, 2500);
    };
    
    const handleDeleteBackup = (id: string) => {
        setBackups(backups.filter(b => b.id !== id));
        toast({
            title: 'Backup Eliminado',
            description: 'La copia de seguridad ha sido eliminada.',
            variant: 'destructive',
        });
    }

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <FileArchive className="w-8 h-8 text-primary" />
            Gestión de Backups
            </h1>
            <p className="text-muted-foreground mt-2">
            Crea, descarga y gestiona las copias de seguridad de la base de datos.
            </p>
        </div>
        <Button onClick={handleCreateBackup} disabled={isCreating}>
            {isCreating ? <Loader className="animate-spin" /> : <Plus />}
            <span>{isCreating ? 'Creando Backup...' : 'Crear Nuevo Backup'}</span>
        </Button>
      </header>

      <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Historial de Backups</CardTitle>
          <CardDescription>Lista de todas las copias de seguridad disponibles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell className="font-mono">{backup.date}</TableCell>
                  <TableCell className="font-mono">{backup.size}</TableCell>
                  <TableCell>{backup.status}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon">
                      <Download className="h-4 w-4" />
                       <span className="sr-only">Descargar</span>
                    </Button>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la copia de seguridad.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteBackup(backup.id)}>
                            Continuar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
