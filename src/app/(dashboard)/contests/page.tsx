
'use client';

import { useState } from 'react';
import { Library, Edit, Trash2, Plus, Calendar as CalendarIcon } from 'lucide-react';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';


type ContestStatus = 'Abierto' | 'En Evaluación' | 'Finalizado';

interface Contest {
    id: string;
    name: string;
    status: ContestStatus;
    startDate: Date;
    endDate: Date;
}

const initialContests: Contest[] = [
    { id: 'contest-001', name: 'Juez de Cámara', status: 'Abierto', startDate: new Date('2024-08-01'), endDate: new Date('2024-09-15') },
    { id: 'contest-002', name: 'Fiscal Auxiliar', status: 'En Evaluación', startDate: new Date('2024-07-10'), endDate: new Date('2024-08-20') },
    { id: 'contest-003', name: 'Defensor Oficial', status: 'Finalizado', startDate: new Date('2024-05-01'), endDate: new Date('2024-06-30') },
    { id: 'contest-004', name: 'Secretario de Juzgado', status: 'Abierto', startDate: new Date('2024-08-15'), endDate: new Date('2024-09-30') },
];

export default function ContestsPage() {
    const [contests, setContests] = useState<Contest[]>(initialContests);
    const [editingContest, setEditingContest] = useState<Contest | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toast } = useToast();

    const handleEditClick = (contest: Contest) => {
        setEditingContest({ ...contest });
        setIsModalOpen(true);
    };

    const handleSaveContest = () => {
        if (!editingContest) return;
        setContests(contests.map(c => c.id === editingContest.id ? editingContest : c));
        setIsModalOpen(false);
        setEditingContest(null);
        toast({
            title: 'Concurso Actualizado',
            description: 'Los datos del concurso se han guardado correctamente.',
            className: 'bg-green-600 border-green-600 text-white'
        });
    };
    
    const handleDelete = (id: string) => {
        setContests(contests.filter(contest => contest.id !== id));
        toast({
            title: 'Concurso Eliminado',
            description: 'El concurso ha sido eliminado correctamente.',
            variant: 'destructive',
        });
    };

    const getStatusBadge = (status: ContestStatus) => {
        switch (status) {
            case 'Abierto':
                return 'default';
            case 'En Evaluación':
                return 'secondary';
            case 'Finalizado':
                return 'outline';
            default:
                return 'outline';
        }
    };

    return (
    <>
        <div className="flex flex-col h-full p-4 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                        <Library className="w-8 h-8 text-primary" />
                        Gestión de Concursos
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Crea, visualiza y administra los concursos del sistema.
                    </p>
                </div>
                <Button>
                    <Plus />
                    <span>Crear Nuevo Concurso</span>
                </Button>
            </header>

            <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg flex-grow">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Nombre del Concurso</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha de Inicio</TableHead>
                            <TableHead>Fecha de Fin</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contests.map((contest) => (
                                <TableRow key={contest.id}>
                                <TableCell className="font-medium">{contest.name}</TableCell>
                                <TableCell><Badge variant={getStatusBadge(contest.status)}>{contest.status}</Badge></TableCell>
                                <TableCell className="font-mono">{format(contest.startDate, 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="font-mono">{format(contest.endDate, 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="icon" onClick={() => handleEditClick(contest)}>
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
                                        <AlertDialogTitle>¿Está seguro de eliminar este concurso?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. El concurso '{contest.name}' será eliminado permanentemente.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(contest.id)}>
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
        {editingContest && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Editar Concurso</DialogTitle>
                        <DialogDescription>
                            Modifica los datos del concurso. Haz clic en guardar cuando termines.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Nombre
                            </Label>
                            <Input
                                id="name"
                                value={editingContest.name}
                                onChange={(e) => setEditingContest({ ...editingContest, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status" className="text-right">
                                Estado
                            </Label>
                            <Select
                                value={editingContest.status}
                                onValueChange={(value: ContestStatus) => setEditingContest({ ...editingContest, status: value })}
                            >
                                <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Abierto">Abierto</SelectItem>
                                    <SelectItem value="En Evaluación">En Evaluación</SelectItem>
                                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="startDate" className="text-right">
                                Fecha Inicio
                            </Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "col-span-3 justify-start text-left font-normal",
                                    !editingContest.startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {editingContest.startDate ? format(editingContest.startDate, "PPP") : <span>Elige una fecha</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={editingContest.startDate}
                                    onSelect={(date) => date && setEditingContest({...editingContest, startDate: date})}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="endDate" className="text-right">
                                Fecha Fin
                            </Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "col-span-3 justify-start text-left font-normal",
                                    !editingContest.endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {editingContest.endDate ? format(editingContest.endDate, "PPP") : <span>Elige una fecha</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={editingContest.endDate}
                                    onSelect={(date) => date && setEditingContest({...editingContest, endDate: date})}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSaveContest}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
    </>
    );
}
