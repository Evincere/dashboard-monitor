'use client';

import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Users, Search, Edit, Files, Plus, RefreshCw, UserCheck, UserX, UserMinus, Download, Trash2 } from 'lucide-react';
import { apiUrl, cn, routeUrl } from '@/lib/utils';

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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

type UserRole = 'ROLE_ADMIN' | 'ROLE_USER';
type UserStatus = 'ACTIVE' | 'BLOCKED' | 'INACTIVE';

interface User {
    id: string;
    name: string;           // firstName + lastName para mostrar
    firstName?: string;
    lastName?: string;
    username: string;
    email: string;
    dni?: string;
    cuit?: string;
    telefono?: string;
    localidad?: string;     // mapea a municipality en backend
    role: UserRole;
    status: UserStatus;
    registrationDate: string;
    updatedAt?: string;
    lastLogin?: string;
    documentCount?: number;
}

interface UserFilters {
    search: string;
    role: string;
    status: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

/** Tipo específico para creación con password */
interface NewUser {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    dni: string;
    cuit?: string;
    telefono?: string;
    localidad?: string;
    role: UserRole;
    status: UserStatus;
}

/** Utilidad única para asegurar campos requeridos en User */
const ensureRequiredFields = (user: Partial<User>): User => {
    const u = user || {};
    return {
        id: u.id ?? '',
        name:
            u.name ??
            [u.firstName ?? '', u.lastName ?? ''].filter(Boolean).join(' ').trim(),
        firstName: u.firstName ?? '',
        lastName: u.lastName ?? '',
        username: u.username ?? '',
        email: u.email ?? '',
        role: u.role ?? 'ROLE_USER',
        status: u.status ?? 'ACTIVE',
        registrationDate: u.registrationDate ?? new Date().toISOString(),
        dni: u.dni ?? '',
        cuit: u.cuit ?? '',
        telefono: u.telefono ?? '',
        localidad: u.localidad ?? '',
        updatedAt: u.updatedAt ?? '',
        lastLogin: u.lastLogin ?? '',
        documentCount: u.documentCount ?? 0,
    };
};

export default function UsersPage() {
    const { toast } = useToast();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState<UserFilters>({
        search: '',
        role: 'all',
        status: 'all',
    });

    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [newUser, setNewUser] = useState<NewUser>({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        dni: '',
        cuit: '',
        telefono: '',
        localidad: '',
        role: 'ROLE_USER',
        status: 'ACTIVE',
    });

    // Helpers
    const getStatusBadgeVariant = (status: UserStatus) => {
        switch (status) {
            case 'ACTIVE':
                return 'default';
            case 'INACTIVE':
                return 'secondary';
            case 'BLOCKED':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });

    const handleFilterChange = (key: keyof UserFilters, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    // Export CSV
    const exportUsers = useCallback(() => {
        try {
            const params = new URLSearchParams();
            if (filters.search.trim()) params.set('search', filters.search);
            if (filters.role && filters.role !== 'all') params.set('role', filters.role);
            if (filters.status && filters.status !== 'all')
                params.set('status', filters.status);

            const exportUrl = `/dashboard-monitor/api/users/export?${params.toString()}`;

            const link = document.createElement('a');
            link.href = exportUrl;
            link.target = '_blank';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('❌ Export failed:', error);
            alert('Error al exportar usuarios. Por favor, intenta de nuevo.');
        }
    }, [filters]);

    // Fetch users
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(pagination.page),
                limit: String(pagination.limit),
            });
            if (filters.search) params.set('search', filters.search);
            if (filters.role !== 'all') params.set('role', filters.role);
            if (filters.status !== 'all') params.set('status', filters.status);

            const response = await fetch(apiUrl(`users?${params}`));
            const data = await response.json();

            if (response.ok) {
                setUsers(Array.isArray(data.users) ? data.users : []);
                if (data.pagination) {
                    setPagination(data.pagination);
                } else {
                    // fallback si el backend no envía paginación completa
                    const total = Array.isArray(data.users) ? data.users.length : 0;
                    const totalPages = Math.max(1, Math.ceil(total / pagination.limit));
                    setPagination((prev) => ({
                        ...prev,
                        total,
                        totalPages,
                        hasPrev: prev.page > 1,
                        hasNext: prev.page < totalPages,
                    }));
                }
            } else {
                throw new Error(data.error || 'Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los usuarios',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, filters, toast]);

    // Load on mount / dependencies
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Debounce search → reset to page 1
    useEffect(() => {
        const t = setTimeout(() => {
            setPagination((prev) => ({ ...prev, page: 1 }));
        }, 500);
        return () => clearTimeout(t);
    }, [filters.search]);

    // Edit
    const handleEditClick = (user: User) => {
        setEditingUser(ensureRequiredFields(user));
        setIsEditModalOpen(true);
    };

    const handleSafeEditingUserUpdate = (field: keyof User, value: string) => {
        setEditingUser((prev) => (prev ? ensureRequiredFields({ ...prev, [field]: value }) : prev));
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            const response = await fetch(apiUrl(`users/${editingUser.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: editingUser.firstName,
                    lastName: editingUser.lastName,
                    name: editingUser.name,
                    username: editingUser.username,
                    email: editingUser.email,
                    role: editingUser.role,
                    status: editingUser.status,
                    dni: editingUser.dni || null,
                    cuit: editingUser.cuit || null,
                    telefono: editingUser.telefono || null,
                    municipality: editingUser.localidad || null,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update user');

            setIsEditModalOpen(false);
            setEditingUser(null);
            await fetchUsers();
            toast({
                title: 'Usuario Actualizado',
                description: 'Los datos del usuario se han guardado correctamente.',
                className: 'bg-green-600 border-green-600 text-white',
            });
        } catch (error) {
            console.error('Error updating user:', error);
            toast({
                title: 'Error',
                description: 'No se pudo actualizar el usuario',
                variant: 'destructive',
            });
        }
    };

    // Create
    const handleCreateUser = async () => {
        try {
            if (
                !newUser.firstName ||
                !newUser.lastName ||
                !newUser.username ||
                !newUser.email ||
                !newUser.password ||
                !newUser.dni
            ) {
                toast({
                    title: 'Error',
                    description:
                        'Los campos marcados con (*) son obligatorios: Nombre, Apellido, Usuario, Email, Contraseña y DNI',
                    variant: 'destructive',
                });
                return;
            }

            const userData = {
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                username: newUser.username,
                email: newUser.email,
                password: newUser.password,
                dni: newUser.dni,
                cuit: newUser.cuit || null,
                telefono: newUser.telefono || null,
                municipality: newUser.localidad || null,
                role: newUser.role,
                status: newUser.status,
            };

            const response = await fetch(apiUrl('users'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create user');

            setIsCreateModalOpen(false);
            setNewUser({
                firstName: '',
                lastName: '',
                username: '',
                email: '',
                password: '',
                dni: '',
                cuit: '',
                telefono: '',
                localidad: '',
                role: 'ROLE_USER',
                status: 'ACTIVE',
            });
            await fetchUsers();
            toast({
                title: 'Usuario Creado',
                description: `El usuario ${data.user?.name ?? `${newUser.firstName} ${newUser.lastName}`.trim()} ha sido creado exitosamente.`,
                className: 'bg-green-600 border-green-600 text-white',
            });
        } catch (error) {
            console.error('Error creating user:', error);
            toast({
                title: 'Error',
                description:
                    error instanceof Error ? error.message : 'Error al crear el usuario',
                variant: 'destructive',
            });
        }
    };

    // Status
    const handleStatusChange = async (
        id: string,
        action: 'activate' | 'deactivate' | 'block',
    ) => {
        try {
            const response = await fetch(apiUrl(`users/${id}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update user status');

            await fetchUsers();
            toast({
                title: 'Estado Actualizado',
                description: data.message,
                className: 'bg-green-600 border-green-600 text-white',
            });
        } catch (error) {
            console.error('Error updating user status:', error);
            toast({
                title: 'Error',
                description: 'No se pudo actualizar el estado del usuario',
                variant: 'destructive',
            });
        }
    };

    // Delete
    const handleDelete = async (id: string, name: string) => {
        try {
            const response = await fetch(apiUrl(`users/${id}`), { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete user');

            await fetchUsers();
            toast({
                title: 'Usuario Eliminado',
                description: `El usuario ${name} ha sido eliminado correctamente.`,
                variant: 'destructive',
            });
        } catch (error) {
            console.error('Error deleting user:', error);
            toast({
                title: 'Error',
                description: 'No se pudo eliminar el usuario',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto py-6">
                <div className="flex flex-col space-y-4">
                    {/* Header */}
                    <header className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
                                <Users className="w-6 h-6 text-primary" />
                                Gestión de Usuarios
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Busca, visualiza y administra los usuarios del sistema.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={fetchUsers} disabled={loading}>
                                <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
                                Actualizar
                            </Button>
                            <Button size="sm" variant="outline" onClick={exportUsers}>
                                <Download className="w-4 h-4 mr-2" />
                                Exportar CSV
                            </Button>
                            <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Crear Usuario
                            </Button>
                        </div>
                    </header>

                    {/* Filtros */}
                    <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg mb-8">
                        <CardHeader>
                            <CardTitle className="font-headline">Filtros de Búsqueda</CardTitle>
                            <CardDescription>Filtra por nombre, email, rol y estado.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Buscar por nombre, email o usuario..."
                                        className="pl-9 w-full"
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                    />
                                </div>

                                <Select
                                    value={filters.role}
                                    onValueChange={(value) => handleFilterChange('role', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los roles</SelectItem>
                                        <SelectItem value="ROLE_ADMIN">Administrador</SelectItem>
                                        <SelectItem value="ROLE_USER">Usuario</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.status}
                                    onValueChange={(value) => handleFilterChange('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los estados</SelectItem>
                                        <SelectItem value="ACTIVE">Activo</SelectItem>
                                        <SelectItem value="INACTIVE">Inactivo</SelectItem>
                                        <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabla */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="px-4 md:px-6 py-4 border-b bg-card/60">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">Usuarios ({pagination.total})</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    Página {pagination.page} de {pagination.totalPages}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {loading ? (
                                <div className="p-6">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-center space-x-4 mb-4">
                                            <Skeleton className="h-12 w-12 rounded-full" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-[200px]" />
                                                <Skeleton className="h-4 w-[150px]" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Teléfono</TableHead>
                                            <TableHead>Localidad</TableHead>
                                            <TableHead>Rol</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Fecha de Registro</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    No se encontraron usuarios
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            users.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9">
                                                                <AvatarFallback>
                                                                    {(user.name ?? '').charAt(0).toUpperCase() || 'U'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium">{user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}</p>
                                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{user.telefono || '-'}</TableCell>
                                                    <TableCell className="font-mono text-sm">{user.localidad || '-'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={user.role === 'ROLE_ADMIN' ? 'default' : 'secondary'}>
                                                            {user.role.replace('ROLE_', '')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusBadgeVariant(user.status)}>{user.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">
                                                        {formatDate(user.registrationDate)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="outline" size="icon" asChild title="Ver Documentos">
                                                                <Link href={routeUrl(`documents?user=${user.username}`)}>
                                                                    <Files className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => handleEditClick(user)}
                                                                title="Editar Usuario"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>

                                                            {user.status === 'ACTIVE' ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => handleStatusChange(user.id, 'deactivate')}
                                                                    title="Desactivar Usuario"
                                                                >
                                                                    <UserMinus className="h-4 w-4" />
                                                                </Button>
                                                            ) : user.status === 'INACTIVE' ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => handleStatusChange(user.id, 'activate')}
                                                                    title="Activar Usuario"
                                                                >
                                                                    <UserCheck className="h-4 w-4" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => handleStatusChange(user.id, 'activate')}
                                                                    title="Desbloquear Usuario"
                                                                >
                                                                    <UserCheck className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            {user.status !== 'BLOCKED' && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => handleStatusChange(user.id, 'block')}
                                                                    title="Bloquear Usuario"
                                                                >
                                                                    <UserX className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="destructive" size="icon" title="Eliminar Usuario">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>
                                                                            ¿Está seguro de eliminar a este usuario?
                                                                        </AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Esta acción no se puede deshacer. El usuario '{user.name}'
                                                                            será eliminado permanentemente.
                                                                            {user.documentCount && user.documentCount > 0 && (
                                                                                <span className="block mt-2 text-orange-600">
                                                                                    Advertencia: Este usuario tiene {user.documentCount} documentos
                                                                                    asociados.
                                                                                </span>
                                                                            )}
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDelete(user.id, user.name)}>
                                                                            Eliminar
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>

                        {!loading && users.length > 0 && (
                            <div className="flex items-center justify-between p-4 md:p-6 border-t bg-card/60">
                                <div className="text-sm text-muted-foreground">
                                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                                    {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                                    {pagination.total} usuarios
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={!pagination.hasPrev}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={!pagination.hasNext}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Edit User Modal */}
            {editingUser && (
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                        <DialogHeader className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                            <DialogTitle>Editar Usuario</DialogTitle>
                            <DialogDescription>
                                Modifica los datos del usuario. Haz clic en guardar cuando termines.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-firstName">
                                        Nombre <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-firstName"
                                        value={editingUser.firstName}
                                        onChange={(e) => handleSafeEditingUserUpdate('firstName', e.target.value)}
                                        placeholder="Juan"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-lastName">
                                        Apellido <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-lastName"
                                        value={editingUser.lastName}
                                        onChange={(e) => handleSafeEditingUserUpdate('lastName', e.target.value)}
                                        placeholder="Pérez"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-username">
                                    Nombre de Usuario <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-username"
                                    value={editingUser.username}
                                    onChange={(e) => handleSafeEditingUserUpdate('username', e.target.value)}
                                    placeholder="juan.perez"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-email">
                                    Email <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) => handleSafeEditingUserUpdate('email', e.target.value)}
                                    placeholder="juan.perez@example.com"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-dni">
                                        DNI <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-dni"
                                        value={editingUser.dni}
                                        onChange={(e) => handleSafeEditingUserUpdate('dni', e.target.value)}
                                        placeholder="12345678"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-cuit">CUIT (opcional)</Label>
                                    <Input
                                        id="edit-cuit"
                                        value={editingUser.cuit}
                                        onChange={(e) => handleSafeEditingUserUpdate('cuit', e.target.value)}
                                        placeholder="20-12345678-9"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-telefono">Teléfono</Label>
                                    <Input
                                        id="edit-telefono"
                                        value={editingUser.telefono}
                                        onChange={(e) => handleSafeEditingUserUpdate('telefono', e.target.value)}
                                        placeholder="+54 261 123-4567"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-localidad">Localidad</Label>
                                    <Input
                                        id="edit-localidad"
                                        value={editingUser.localidad}
                                        onChange={(e) => handleSafeEditingUserUpdate('localidad', e.target.value)}
                                        placeholder="Mendoza"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-role">Rol</Label>
                                    <Select
                                        value={editingUser.role}
                                        onValueChange={(value: UserRole) =>
                                            setEditingUser((prev) =>
                                                prev ? ensureRequiredFields({ ...prev, role: value }) : prev,
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ROLE_ADMIN">Administrador</SelectItem>
                                            <SelectItem value="ROLE_USER">Usuario</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-status">Estado</Label>
                                    <Select
                                        value={editingUser.status}
                                        onValueChange={(value: UserStatus) =>
                                            setEditingUser((prev) =>
                                                prev ? ensureRequiredFields({ ...prev, status: value }) : prev,
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Activo</SelectItem>
                                            <SelectItem value="INACTIVE">Inactivo</SelectItem>
                                            <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" onClick={handleSaveUser}>
                                Guardar Cambios
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Create User Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                        <DialogDescription>Completa los datos del nuevo usuario.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-firstName">
                                    Nombre <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="create-firstName"
                                    value={newUser.firstName}
                                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                                    placeholder="Juan"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-lastName">
                                    Apellido <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="create-lastName"
                                    value={newUser.lastName}
                                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                                    placeholder="Pérez"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-username">
                                    Nombre de Usuario <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="create-username"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    placeholder="juan.perez"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-email">
                                    Email <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="create-email"
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="juan.perez@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create-password">
                                Contraseña <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="create-password"
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder="Mínimo 8 caracteres"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-dni">
                                    DNI <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="create-dni"
                                    value={newUser.dni}
                                    onChange={(e) => setNewUser({ ...newUser, dni: e.target.value })}
                                    placeholder="12345678"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-cuit">CUIT (opcional)</Label>
                                <Input
                                    id="create-cuit"
                                    value={newUser.cuit}
                                    onChange={(e) => setNewUser({ ...newUser, cuit: e.target.value })}
                                    placeholder="20-12345678-9"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-telefono">Teléfono</Label>
                                <Input
                                    id="create-telefono"
                                    value={newUser.telefono}
                                    onChange={(e) => setNewUser({ ...newUser, telefono: e.target.value })}
                                    placeholder="+54 261 123-4567"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-localidad">Localidad</Label>
                                <Input
                                    id="create-localidad"
                                    value={newUser.localidad}
                                    onChange={(e) => setNewUser({ ...newUser, localidad: e.target.value })}
                                    placeholder="Mendoza"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-role">Rol</Label>
                                <Select
                                    value={newUser.role}
                                    onValueChange={(value: UserRole) =>
                                        setNewUser({ ...newUser, role: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ROLE_ADMIN">Administrador</SelectItem>
                                        <SelectItem value="ROLE_USER">Usuario</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-status">Estado</Label>
                                <Select
                                    value={newUser.status}
                                    onValueChange={(value: UserStatus) =>
                                        setNewUser({ ...newUser, status: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Activo</SelectItem>
                                        <SelectItem value="INACTIVE">Inactivo</SelectItem>
                                        <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" onClick={handleCreateUser}>
                            Crear Usuario
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
