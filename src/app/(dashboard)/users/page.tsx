
'use client';

import { useState } from 'react';
import { Users, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const initialUsers = [
    { id: 'user-001', name: 'Juan Pérez', email: 'juan.perez@example.com', role: 'Postulante', registrationDate: '2024-07-01' },
    { id: 'user-002', name: 'María Gómez', email: 'maria.gomez@example.com', role: 'Postulante', registrationDate: '2024-07-03' },
    { id: 'user-003', name: 'Carlos López', email: 'carlos.lopez@example.com', role: 'Administrador', registrationDate: '2024-06-28' },
    { id: 'user-004', name: 'Ana Martinez', email: 'ana.martinez@example.com', role: 'Postulante', registrationDate: '2024-07-05' },
    { id: 'user-005', name: 'Luis Fernández', email: 'luis.fernandez@example.com', role: 'Evaluador', registrationDate: '2024-07-02' },
];

export default function UsersPage() {
    const [users, setUsers] = useState(initialUsers);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const handleDelete = (id: string) => {
        setUsers(users.filter(user => user.id !== id));
        toast({
            title: 'Usuario Eliminado',
            description: 'El usuario ha sido eliminado correctamente.',
            variant: 'destructive',
        });
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
    <div className="flex flex-col h-full p-4 md:p-8">
        <header className="mb-8 flex justify-between items-center">
            <div>
                 <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                    <Users className="w-8 h-8 text-primary" />
                    Gestión de Usuarios
                </h1>
                <p className="text-muted-foreground mt-2">
                    Busca, visualiza y administra los usuarios del sistema.
                </p>
            </div>
             <Button>
                Crear Usuario
            </Button>
        </header>

         <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg mb-8">
            <CardHeader>
                <CardTitle className="font-headline">Buscar Usuarios</CardTitle>
                <CardDescription>Filtra por nombre o correo electrónico.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar usuarios..."
                        className="pl-10 w-full bg-input/80 border-white/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg flex-grow">
            <CardContent className="p-0">
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Fecha de Registro</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell><Badge variant={user.role === 'Administrador' ? 'default' : (user.role === 'Evaluador' ? 'secondary' : 'outline')}>{user.role}</Badge></TableCell>
                            <TableCell className="font-mono">{user.registrationDate}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="icon">
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
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
                                    <AlertDialogTitle>¿Está seguro de eliminar a este usuario?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. El usuario '{user.name}' será eliminado permanentemente.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(user.id)}>
                                        Eliminar
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
