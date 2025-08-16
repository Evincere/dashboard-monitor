'use client';

import { useState, useEffect } from 'react';
import { 
  Users,
  Search, 
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import PostulationCard from '@/components/postulations/PostulationCard';

interface Postulation {
  id: string;
  user: {
    dni: string;
    fullName: string;
    email: string;
  };
  inscription: {
    id: string;
    state: string;
    centroDeVida: string;
    createdAt: string;
  };
  contest: {
    title: string;
    position: string;
  };
  documents: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    required: number;
    types: string[];
  };
  validationStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REJECTED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  completionPercentage: number;
}

interface PostulationsStats {
  total: number;
  completedWithDocs: number;
  validationPending: number;
  validationCompleted: number;
  validationRejected: number;
}

export default function PostulationsManagementPage() {
  const [postulations, setPostulations] = useState<Postulation[]>([]);
  const [filteredPostulations, setFilteredPostulations] = useState<Postulation[]>([]);
  const [stats, setStats] = useState<PostulationsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('COMPLETED_WITH_DOCS');
  const [validationFilter, setValidationFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('PRIORITY');
  const { toast } = useToast();

  // Fetch postulations data
  const fetchPostulations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/postulations/management', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000) // 30 seconds
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch postulations: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }
      
      setPostulations(data.postulations || []);
      setStats(data.stats || null);
      
      // Apply initial filter for COMPLETED_WITH_DOCS
      applyFilters(data.postulations || [], statusFilter, validationFilter, priorityFilter, searchTerm, sortBy);
    } catch (error) {
      console.error('Error fetching postulations:', error);
      
      // Don't show toast for aborted requests (component unmounting)
      if (error.name !== 'AbortError') {
        toast({
          title: 'Error',
          description: `No se pudieron cargar las postulaciones: ${error.message}`,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  const applyFilters = (
    data: Postulation[],
    status: string,
    validation: string,
    priority: string,
    search: string,
    sort: string
  ) => {
    let filtered = [...data];

    // Filter by inscription status
    if (status !== 'ALL') {
      filtered = filtered.filter(post => post.inscription.state === status);
    }

    // Filter by validation status
    if (validation !== 'ALL') {
      filtered = filtered.filter(post => post.validationStatus === validation);
    }

    // Filter by priority
    if (priority !== 'ALL') {
      filtered = filtered.filter(post => post.priority === priority);
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(post => 
        post.user.dni.toLowerCase().includes(searchLower) ||
        post.user.fullName.toLowerCase().includes(searchLower) ||
        post.user.email.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    switch (sort) {
      case 'PRIORITY':
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        break;
      case 'COMPLETION':
        filtered.sort((a, b) => a.completionPercentage - b.completionPercentage);
        break;
      case 'NAME':
        filtered.sort((a, b) => a.user.fullName.localeCompare(b.user.fullName));
        break;
      case 'DATE':
        filtered.sort((a, b) => new Date(b.inscription.createdAt).getTime() - new Date(a.inscription.createdAt).getTime());
        break;
    }

    setFilteredPostulations(filtered);
  };

  // Handle filter changes
  useEffect(() => {
    if (postulations.length > 0) {
      applyFilters(postulations, statusFilter, validationFilter, priorityFilter, searchTerm, sortBy);
    }
  }, [postulations, statusFilter, validationFilter, priorityFilter, searchTerm, sortBy]);

  useEffect(() => {
    fetchPostulations();
  }, []);

  const getValidationStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'REJECTED': return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'PARTIAL': return <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      default: return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getValidationStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  if (loading && !postulations.length) {
    return (
      <div className="flex flex-col h-full p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Gestión de Postulaciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Administre y valide las postulaciones al concurso de manera organizada
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 bg-background text-foreground">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
              <Users className="w-8 h-8 text-primary" />
              Gestión de Postulaciones
            </h1>
            <p className="text-muted-foreground mt-2">
              Administre y valide las postulaciones al concurso de manera organizada
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchPostulations}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </header>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Postulaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.completedWithDocs} con documentos completos
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendientes de Validación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.validationPending}
              </div>
              <div className="text-xs text-muted-foreground">
                Requieren revisión
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Validaciones Completadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.validationCompleted}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.validationCompleted / stats.total) * 100) : 0}% del total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Postulaciones Rechazadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.validationRejected}
              </div>
              <div className="text-xs text-muted-foreground">
                No cumplen requisitos
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros y Búsqueda
          </CardTitle>
          <CardDescription>
            Filtre y busque postulaciones para una gestión eficiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por DNI, nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value="COMPLETED_WITH_DOCS">Con documentos completos</SelectItem>
                <SelectItem value="ACTIVE">Activas</SelectItem>
                <SelectItem value="COMPLETED_PENDING_DOCS">Pendientes de documentos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={validationFilter} onValueChange={setValidationFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las validaciones</SelectItem>
                <SelectItem value="PENDING">Pendientes</SelectItem>
                <SelectItem value="PARTIAL">Parcialmente validadas</SelectItem>
                <SelectItem value="COMPLETED">Completadas</SelectItem>
                <SelectItem value="REJECTED">Rechazadas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las prioridades</SelectItem>
                <SelectItem value="HIGH">Alta prioridad</SelectItem>
                <SelectItem value="MEDIUM">Prioridad media</SelectItem>
                <SelectItem value="LOW">Prioridad baja</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIORITY">Por prioridad</SelectItem>
                <SelectItem value="COMPLETION">Por completitud</SelectItem>
                <SelectItem value="NAME">Por nombre</SelectItem>
                <SelectItem value="DATE">Por fecha</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Postulations List */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span className="text-lg font-medium">
              Postulaciones ({filteredPostulations.length})
            </span>
          </div>
          
          {filteredPostulations.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {getValidationStatusIcon('PENDING')}
                <span>Pendiente</span>
              </div>
              <div className="flex items-center gap-1">
                {getValidationStatusIcon('PARTIAL')}
                <span>Parcial</span>
              </div>
              <div className="flex items-center gap-1">
                {getValidationStatusIcon('COMPLETED')}
                <span>Completado</span>
              </div>
              <div className="flex items-center gap-1">
                {getValidationStatusIcon('REJECTED')}
                <span>Rechazado</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {filteredPostulations.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No se encontraron postulaciones</h3>
                <p className="text-muted-foreground">
                  No hay postulaciones que coincidan con los filtros seleccionados.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPostulations.map((postulation) => (
              <PostulationCard
                key={postulation.id}
                postulation={postulation}
              onClick={() => {
                // Navigate directly to document validation (bypassing the intermediate documents view)
                window.location.href = `/postulations/${postulation.user.dni}/documents/validation`;
              }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
