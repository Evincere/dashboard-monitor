
'use client';

import { useState, useEffect } from 'react';
import { Library, Edit, Trash2, Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { es } from 'date-fns/locale';
import { FileUpload } from '@/components/ui/file-upload';
import { CircunscriptionSelector } from '@/components/ui/circumscription-selector';
import { 
  ValidatedField, 
  FormValidationSummary, 
  RequiredFieldsNote,
  useFieldValidation 
} from '@/components/ui/form-validation';
import { validateContest, validateDates, validateTitle } from '@/lib/validations/contest-validation';

// Definir todos los estados posibles según la base de datos
type ContestStatus = 'ACTIVE' | 'ARCHIVED' | 'CANCELLED' | 'CLOSED' | 'DRAFT' | 'FINISHED' | 'IN_EVALUATION' | 'PAUSED' | 'RESULTS_PUBLISHED' | 'SCHEDULED' | 'DOCUMENTATION_VALIDATION' | 'APPLICATION_VALIDATION';

// Interfaz completa que coincide con la base de datos
interface Contest {
    id: number;
    title: string;
    category: string;
    class_: string;
    department: string;
    position: string;
    functions: string;
    status: ContestStatus;
    start_date: Date | null;
    end_date: Date | null;
    inscription_start_date: Date | null;
    inscription_end_date: Date | null;
    bases_file?: File | null;
    description_file?: File | null;
    bases_url: string;
    description_url: string;
    created_at?: Date;
    updated_at?: Date;
}

// Función para obtener concursos de la API
const fetchContests = async (): Promise<Contest[]> => {
    try {
        const response = await fetch('/api/dashboard/contests-list', {
            cache: 'no-store' // Evitar cache para datos actualizados
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error al obtener los concursos');
        }
        
        // Transformar datos de la API al formato del componente
        return result.data.map((contest: any) => ({
            id: contest.id,
            title: contest.title,
            category: contest.category || '',
            class_: contest.class_ || '',
            department: contest.department || '',
            position: contest.position || '',
            functions: contest.functions || '',
            status: contest.status || 'DRAFT',
            start_date: contest.startDate ? new Date(contest.startDate) : null,
            end_date: contest.endDate ? new Date(contest.endDate) : null,
            inscription_start_date: contest.inscriptionStartDate ? new Date(contest.inscriptionStartDate) : null,
            inscription_end_date: contest.inscriptionEndDate ? new Date(contest.inscriptionEndDate) : null,
            bases_url: contest.bases_url || '',
            description_url: contest.description_url || ''
        }));
    } catch (error) {
        console.error('Error fetching contests:', error);
        return [];
    }
};

// Estructura por defecto para nuevo concurso con todos los campos
const defaultNewContest: Omit<Contest, 'id' | 'created_at' | 'updated_at'> = {
    title: '',
    category: '',
    class_: '',
    department: '', // Cambiará para ser array de circunscripciones
    position: '',
    functions: '',
    status: 'DRAFT',
    start_date: null,
    end_date: null,
    inscription_start_date: null,
    inscription_end_date: null,
    bases_url: '',
    description_url: ''
};

// Opciones predefinidas para los campos según estructura MPD
const CATEGORY_OPTIONS = [
    'FUNCIONARIOS Y PERSONAL JERÁRQUICO',
    'MAGISTRADOS', 
    'EMPLEADOS'
];

const CLASS_OPTIONS = [
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'
];

// Circunscripciones según estructura MPD - Nueva estructura para mejor manejo
const CIRCUMSCRIPTION_STRUCTURE = {
    'PRIMERA': { label: 'Primera Circunscripción', subdivisions: [] },
    'SEGUNDA': {
        label: 'Segunda Circunscripción',
        subdivisions: [
            { id: 'san_rafael', label: 'San Rafael' },
            { id: 'general_alvear', label: 'General Alvear' },
            { id: 'malargue', label: 'Malargüe' }
        ]
    },
    'TERCERA': { label: 'Tercera Circunscripción', subdivisions: [] },
    'CUARTA': { label: 'Cuarta Circunscripción', subdivisions: [] }
};

// Para compatibilidad con el backend actual
const CIRCUMSCRIPTION_OPTIONS = [
    'PRIMERA CIRCUNSCRIPCIÓN',
    'SEGUNDA CIRCUNSCRIPCIÓN',
    'SEGUNDA CIRCUNSCRIPCIÓN - San Rafael',
    'SEGUNDA CIRCUNSCRIPCIÓN - General Alvear',
    'SEGUNDA CIRCUNSCRIPCIÓN - Malargüe',
    'TERCERA CIRCUNSCRIPCIÓN',
    'CUARTA CIRCUNSCRIPCIÓN'
];

// Posiciones/cargos según organigrama MPD (excluyendo cargos no concursables)
const POSITION_OPTIONS = [
    // Defensorías Civiles
    'Defensor/a Civil',
    'Defensor/a Civil Adjunto/a',
    // Defensorías Penales  
    'Defensor/a Penal',
    'Defensor/a Penal Adjunto/a',
    // Defensorías Penales Juveniles
    'Defensor/a Penal Juvenil',
    'Defensor/a Penal Juvenil Adjunto/a',
    // Asesorías de NNyPCR
    'Asesor/a de Incapaces',
    'Asesor/a de Incapaces Adjunto/a',
    // Codefensorías de Familia
    'Codefensor/a de Familia',
    'Codefensor/a de Familia Adjunto/a',
    // Secretarías
    'Secretario/a Legal y Técnico/a',
    'Secretario/a General',
    // Administrativos
    'Jefe/a Administrativo/Contable',
    'Personal de Recursos Humanos',
    // Servicios Generales
    'Responsable de Informática',
    'Personal de Servicios',
    'Chófer',
    // Desarrollo Tecnológico
    'Especialista en Desarrollo Tecnológico',
    // Control de Gestión
    'Auditor/a de Control de Gestión'
];

// Mapeo de estados para mostrar en español
const STATUS_LABELS: Record<ContestStatus, string> = {
    'ACTIVE': 'Activo',
    'ARCHIVED': 'Archivado',
    'CANCELLED': 'Cancelado',
    'CLOSED': 'Cerrado para Inscripciones',
    'DRAFT': 'Borrador',
    'FINISHED': 'Finalizado',
    'IN_EVALUATION': 'En Evaluación',
    'PAUSED': 'Pausado',
    'RESULTS_PUBLISHED': 'Resultados Publicados',
    'SCHEDULED': 'Programado',
    'DOCUMENTATION_VALIDATION': 'Validación de Documentación',
    'APPLICATION_VALIDATION': 'Validación de Postulaciones'
};


export default function ContestsPage() {
    const [contests, setContests] = useState<Contest[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingContest, setEditingContest] = useState<Contest | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newContest, setNewContest] = useState(defaultNewContest);
    // Estados para manejar circunscripciones como arrays
    const [editingCircunscriptions, setEditingCircunscriptions] = useState<string[]>([]);
    const [newCircunscriptions, setNewCircunscriptions] = useState<string[]>([]);
    // Estados para validación
    const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string[]>>({});
    const [createValidationErrors, setCreateValidationErrors] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // Cargar concursos al montar el componente
    useEffect(() => {
        loadContests();
    }, []);

    const loadContests = async () => {
        try {
            setLoading(true);
            const contestsData = await fetchContests();
            setContests(contestsData);
        } catch (error) {
            console.error('Error loading contests:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los concursos. Intenta recargar la página.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Set dates only on the client side to avoid hydration mismatch
        if (isCreateModalOpen) {
            setNewContest(prev => ({
                ...prev,
                inscription_start_date: new Date(),
                inscription_end_date: new Date(),
            }));
        }
    }, [isCreateModalOpen]);

    const handleEditClick = (contest: Contest) => {
        setEditingContest({ ...contest });
        // Convertir department string a array para el selector
        const circumscriptions = contest.department ? [contest.department] : [];
        setEditingCircunscriptions(circumscriptions);
        setIsEditModalOpen(true);
    };

    const handleSaveContest = async () => {
        if (!editingContest) return;
        
        setIsSubmitting(true);
        setEditValidationErrors({});
        
        try {
            // Preparar datos para validación
            const contestData = {
                ...editingContest,
                department: editingCircunscriptions[0] || ''
            };
            
            // Validar datos
            const validation = validateContest(contestData, true);
            
            if (!validation.success) {
                setEditValidationErrors(validation.errors);
                toast({
                    title: 'Error de Validación',
                    description: 'Por favor, corrige los errores en el formulario.',
                    variant: 'destructive',
                });
                return;
            }
            
            // Llamar a la API para actualizar
            const response = await fetch('/api/contests', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...contestData, id: editingContest.id })
            });
            
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Error al actualizar el concurso');
            }
            
            // Actualizar el estado local
            const updatedContest = {
                ...editingContest,
                department: editingCircunscriptions[0] || ''
            };
            setContests(contests.map(c => c.id === editingContest.id ? updatedContest : c));
            setIsEditModalOpen(false);
            setEditingContest(null);
            setEditingCircunscriptions([]);
            setEditValidationErrors({});
            
            toast({
                title: 'Concurso Actualizado',
                description: 'Los datos del concurso se han guardado correctamente.',
                className: 'bg-green-600 border-green-600 text-white'
            });
        } catch (error) {
            console.error('Error saving contest:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Hubo un problema al guardar el concurso.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateContest = async () => {
        setIsSubmitting(true);
        setCreateValidationErrors({});
        
        try {
            // Preparar datos para validación
            const contestData = {
                ...newContest,
                department: newCircunscriptions[0] || ''
            };
            
            // Validar datos
            const validation = validateContest(contestData, false);
            
            if (!validation.success) {
                setCreateValidationErrors(validation.errors);
                toast({
                    title: 'Error de Validación',
                    description: 'Por favor, corrige los errores en el formulario.',
                    variant: 'destructive',
                });
                return;
            }
            
            // Llamar a la API para crear
            const response = await fetch('/api/contests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(contestData)
            });
            
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Error al crear el concurso');
            }
            
            // Agregar el concurso al estado local
            const contestToAdd: Contest = {
                id: result.data.id,
                title: result.data.title,
                category: result.data.category || '',
                class_: result.data.class_ || '',
                department: result.data.department || '',
                position: result.data.position || '',
                functions: result.data.functions || '',
                status: result.data.status,
                start_date: result.data.startDate ? new Date(result.data.startDate) : null,
                end_date: result.data.endDate ? new Date(result.data.endDate) : null,
                inscription_start_date: result.data.inscriptionStartDate ? new Date(result.data.inscriptionStartDate) : null,
                inscription_end_date: result.data.inscriptionEndDate ? new Date(result.data.inscriptionEndDate) : null,
                bases_url: result.data.bases_url || '',
                description_url: result.data.description_url || ''
            };
            
            setContests([contestToAdd, ...contests]);
            setIsCreateModalOpen(false);
            setNewContest(defaultNewContest);
            setNewCircunscriptions([]);
            setCreateValidationErrors({});
            
            toast({
                title: 'Concurso Creado',
                description: 'El nuevo concurso ha sido creado exitosamente.',
                className: 'bg-green-600 border-green-600 text-white'
            });
        } catch (error) {
            console.error('Error creating contest:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Hubo un problema al crear el concurso.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = (id: number) => {
        setContests(contests.filter(contest => contest.id !== id));
        toast({
            title: 'Concurso Eliminado',
            description: 'El concurso ha sido eliminado correctamente.',
            variant: 'destructive',
        });
    };

    const getStatusBadge = (status: ContestStatus) => {
        switch (status) {
            case 'ACTIVE':
                return 'default';
            case 'ARCHIVED':
                return 'secondary';
            case 'CANCELLED':
                return 'destructive';
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
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus />
                    <span>Crear Nuevo Concurso</span>
                </Button>
            </header>

            <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg flex-grow">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Título del Concurso</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha de Inicio Inscripción</TableHead>
                            <TableHead>Fecha de Fin Inscripción</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Cargando concursos...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : contests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <div className="text-muted-foreground">
                                            <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p className="text-lg font-medium mb-2">No hay concursos disponibles</p>
                                            <p className="text-sm">Crea tu primer concurso haciendo clic en el botón "Crear Nuevo Concurso"</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                contests.map((contest) => (
                                    <TableRow key={contest.id}>
                                    <TableCell className="font-medium">{contest.title}</TableCell>
                                    <TableCell><Badge variant={getStatusBadge(contest.status)}>{STATUS_LABELS[contest.status]}</Badge></TableCell>
                                    <TableCell className="font-mono">{contest.inscription_start_date ? format(contest.inscription_start_date, 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                                    <TableCell className="font-mono">{contest.inscription_end_date ? format(contest.inscription_end_date, 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
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
                                                Esta acción no se puede deshacer. El concurso '{contest.title}' será eliminado permanentemente.
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        {/* Edit Contest Modal */}
        {editingContest && (
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Concurso</DialogTitle>
                        <DialogDescription>
                            Modifica los datos del concurso. Los campos marcados con * son obligatorios.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        {/* Información Básica */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">Información Básica</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-title">Título del Concurso *</Label>
                                    <Input
                                        id="edit-title"
                                        value={editingContest.title}
                                        onChange={(e) => setEditingContest({ ...editingContest, title: e.target.value })}
                                        placeholder="Ej: Defensor Penal - Primera Circunscripción"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-status">Estado *</Label>
                                    <Select
                                        value={editingContest.status}
                                        onValueChange={(value: ContestStatus) => setEditingContest({ ...editingContest, status: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Categorización */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">Categorización</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-category">Categoría</Label>
                                    <Select
                                        value={editingContest.category}
                                        onValueChange={(value) => setEditingContest({ ...editingContest, category: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar categoría" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORY_OPTIONS.map((category) => (
                                                <SelectItem key={category} value={category}>{category}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-class">Clase</Label>
                                    <Select
                                        value={editingContest.class_}
                                        onValueChange={(value) => setEditingContest({ ...editingContest, class_: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar clase" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CLASS_OPTIONS.map((classOption) => (
                                                <SelectItem key={classOption} value={classOption}>{classOption}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-circumscription">Circunscripción</Label>
                                    <CircunscriptionSelector
                                        value={editingCircunscriptions}
                                        onChange={setEditingCircunscriptions}
                                        placeholder="Seleccionar circunscripción..."
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Detalles del Cargo */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">Detalles del Cargo</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-position">Posición/Cargo</Label>
                                    <Select
                                        value={editingContest.position}
                                        onValueChange={(value) => setEditingContest({ ...editingContest, position: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar posición/cargo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {POSITION_OPTIONS.map((position) => (
                                                <SelectItem key={position} value={position}>{position}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-functions">Funciones</Label>
                                    <Textarea
                                        id="edit-functions"
                                        value={editingContest.functions}
                                        onChange={(e) => setEditingContest({ ...editingContest, functions: e.target.value })}
                                        placeholder="Descripción detallada de las funciones del cargo..."
                                        rows={4}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Fechas del Concurso */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">Fechas del Concurso</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fecha de Inicio del Concurso</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn("w-full justify-start text-left font-normal", !editingContest.start_date && "text-muted-foreground")}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {editingContest.start_date ? format(editingContest.start_date, "PPP", { locale: es }) : <span>Seleccionar fecha...</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={editingContest.start_date ?? undefined}
                                                onSelect={(date) => setEditingContest({...editingContest, start_date: date ?? null})}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Fecha de Fin del Concurso</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn("w-full justify-start text-left font-normal", !editingContest.end_date && "text-muted-foreground")}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {editingContest.end_date ? format(editingContest.end_date, "PPP", { locale: es }) : <span>Seleccionar fecha...</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={editingContest.end_date ?? undefined}
                                                onSelect={(date) => setEditingContest({...editingContest, end_date: date ?? null})}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>

                        {/* Fechas de Inscripción */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">Fechas de Inscripción *</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Inicio de Inscripciones *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn("w-full justify-start text-left font-normal", !editingContest.inscription_start_date && "text-muted-foreground")}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {editingContest.inscription_start_date ? format(editingContest.inscription_start_date, "PPP", { locale: es }) : <span>Seleccionar fecha...</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={editingContest.inscription_start_date ?? undefined}
                                                onSelect={(date) => setEditingContest({...editingContest, inscription_start_date: date ?? null})}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Fin de Inscripciones *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn("w-full justify-start text-left font-normal", !editingContest.inscription_end_date && "text-muted-foreground")}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {editingContest.inscription_end_date ? format(editingContest.inscription_end_date, "PPP", { locale: es }) : <span>Seleccionar fecha...</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={editingContest.inscription_end_date ?? undefined}
                                                onSelect={(date) => setEditingContest({...editingContest, inscription_end_date: date ?? null})}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>

                        {/* Documentación */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">Documentación</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <FileUpload
                                    label="Bases del Concurso"
                                    acceptedTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                                    maxSize={10}
                                    currentUrl={editingContest.bases_url || undefined}
                                    contestId={editingContest.id.toString()}
                                    fileType="bases"
                                    onUpload={(url) => setEditingContest({ ...editingContest, bases_url: url })}
                                    onRemove={() => setEditingContest({ ...editingContest, bases_url: '' })}
                                />
                                <FileUpload
                                    label="Descripción del Cargo"
                                    acceptedTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                                    maxSize={10}
                                    currentUrl={editingContest.description_url || undefined}
                                    contestId={editingContest.id.toString()}
                                    fileType="description"
                                    onUpload={(url) => setEditingContest({ ...editingContest, description_url: url })}
                                    onRemove={() => setEditingContest({ ...editingContest, description_url: '' })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSaveContest}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

         {/* Create Contest Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Concurso</DialogTitle>
                    <DialogDescription>
                        Completa los datos para crear un nuevo concurso. Los campos marcados con * son obligatorios.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {/* Información Básica */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Información Básica</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-title">Título del Concurso *</Label>
                                <Input
                                    id="create-title"
                                    value={newContest.title}
                                    onChange={(e) => setNewContest({ ...newContest, title: e.target.value })}
                                    placeholder="Ej: Defensor Penal - Primera Circunscripción"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-status">Estado *</Label>
                                <Select
                                    value={newContest.status}
                                    onValueChange={(value: ContestStatus) => setNewContest({ ...newContest, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Categorización */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Categorización</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-category">Categoría</Label>
                                <Select
                                    value={newContest.category}
                                    onValueChange={(value) => setNewContest({ ...newContest, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_OPTIONS.map((category) => (
                                            <SelectItem key={category} value={category}>{category}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-class">Clase</Label>
                                <Select
                                    value={newContest.class_}
                                    onValueChange={(value) => setNewContest({ ...newContest, class_: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar clase" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CLASS_OPTIONS.map((classOption) => (
                                            <SelectItem key={classOption} value={classOption}>{classOption}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-circumscription">Circunscripción</Label>
                                <CircunscriptionSelector
                                    value={newCircunscriptions}
                                    onChange={setNewCircunscriptions}
                                    placeholder="Seleccionar circunscripción..."
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Detalles del Cargo */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Detalles del Cargo</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-position">Posición/Cargo</Label>
                                <Select
                                    value={newContest.position}
                                    onValueChange={(value) => setNewContest({ ...newContest, position: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar posición/cargo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {POSITION_OPTIONS.map((position) => (
                                            <SelectItem key={position} value={position}>{position}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-functions">Funciones</Label>
                                <Textarea
                                    id="create-functions"
                                    value={newContest.functions}
                                    onChange={(e) => setNewContest({ ...newContest, functions: e.target.value })}
                                    placeholder="Descripción detallada de las funciones del cargo..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fechas del Concurso */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Fechas del Concurso</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fecha de Inicio del Concurso</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn("w-full justify-start text-left font-normal", !newContest.start_date && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {newContest.start_date ? format(newContest.start_date, "PPP", { locale: es }) : <span>Seleccionar fecha...</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={newContest.start_date ?? undefined}
                                            onSelect={(date) => setNewContest({...newContest, start_date: date ?? null})}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha de Fin del Concurso</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn("w-full justify-start text-left font-normal", !newContest.end_date && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {newContest.end_date ? format(newContest.end_date, "PPP", { locale: es }) : <span>Seleccionar fecha...</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={newContest.end_date ?? undefined}
                                            onSelect={(date) => setNewContest({...newContest, end_date: date ?? null})}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    {/* Fechas de Inscripción */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Fechas de Inscripción *</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Inicio de Inscripciones *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn("w-full justify-start text-left font-normal", !newContest.inscription_start_date && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {newContest.inscription_start_date ? format(newContest.inscription_start_date, "PPP", { locale: es }) : <span>Seleccionar fecha...</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={newContest.inscription_start_date ?? undefined}
                                            onSelect={(date) => setNewContest({...newContest, inscription_start_date: date ?? null})}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Fin de Inscripciones *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn("w-full justify-start text-left font-normal", !newContest.inscription_end_date && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {newContest.inscription_end_date ? format(newContest.inscription_end_date, "PPP", { locale: es }) : <span>Seleccionar fecha...</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={newContest.inscription_end_date ?? undefined}
                                            onSelect={(date) => setNewContest({...newContest, inscription_end_date: date ?? null})}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    {/* Documentación */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Documentación</h3>
                        <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted rounded-md">
                            📝 <strong>Nota:</strong> Los archivos se podrán subir una vez que se cree el concurso. Por ahora, puedes proporcionar URLs temporales si los tienes disponibles.
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-bases-url">URL de las Bases (opcional)</Label>
                                <Input
                                    id="create-bases-url"
                                    type="url"
                                    value={newContest.bases_url}
                                    onChange={(e) => setNewContest({ ...newContest, bases_url: e.target.value })}
                                    placeholder="https://ejemplo.com/bases.pdf"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-description-url">URL de Descripción (opcional)</Label>
                                <Input
                                    id="create-description-url"
                                    type="url"
                                    value={newContest.description_url}
                                    onChange={(e) => setNewContest({ ...newContest, description_url: e.target.value })}
                                    placeholder="https://ejemplo.com/descripcion.pdf"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                    <Button type="submit" onClick={handleCreateContest}>Crear Concurso</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
    );
}
