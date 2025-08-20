'use client';

import { apiUrl, routeUrl, fullRouteUrl } from "@/lib/utils";
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [validationFilter, setValidationFilter] = useState('ALL');
  const [circunscripcionFilter, setCircunscripcionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('PRIORITY');
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 300;

  // Fetch postulations stats only (fast)
  const fetchStats = async () => {
    try {
      const response = await fetch(apiUrl('postulations/management?onlyStats=true'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(45000) // 30 seconds
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch stats:', error);
    }
  };

  // Fetch postulations data with pagination
  const fetchPostulations = async (page = 1, append = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });
      
      const response = await fetch(apiUrl(`postulations/management?${params}`), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000) // 60 seconds for document processing
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch postulations: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }
      
      const newPostulations = data.postulations || [];
      console.log("🔄 Received postulations:", newPostulations.length, "first:", newPostulations[0]);
      
      if (append) {
        // Append to existing data (infinite scroll)
        setPostulations(prev => [...prev, ...newPostulations]);
      } else {
        // Replace data (new search/filter)
        setPostulations(newPostulations);
      }
      
      setStats(data.stats || null);
      setCurrentPage(page);
      
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
      }
      
      // Apply filters to ALL loaded postulations
      const allPostulations = append ? [...postulations, ...newPostulations] : newPostulations;
      applyFilters(allPostulations, statusFilter, validationFilter, circunscripcionFilter, searchTerm, sortBy);
      
    } catch (error) {
      console.error('Error fetching postulations:', error);
      
      if (error.name !== 'AbortError') {
        toast({
          title: 'Error',
          description: `No se pudieron cargar las postulaciones: ${error.message}`,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Load more postulations
  const loadMorePostulations = async () => {
    if (currentPage < totalPages && !isLoadingMore) {
      await fetchPostulations(currentPage + 1, true);
    }
  };

  // Apply filters and sorting
  const applyFilters = (
    data: Postulation[],
    status: string,
    validation: string,
    circunscripcion: string,
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

    // Filter by circunscripcion
    if (circunscripcion !== 'ALL') {
      filtered = filtered.filter(post => {
        const centroDeVida = post.inscription.centroDeVida?.toLowerCase() || '';
        if (circunscripcion === 'PRIMERA_CIRCUNSCRIPCION') return centroDeVida.includes('primera');
        if (circunscripcion === 'SEGUNDA_CIRCUNSCRIPCION') return centroDeVida.includes('segunda');
        if (circunscripcion === 'TERCERA_CIRCUNSCRIPCION') return centroDeVida.includes('tercera');
        if (circunscripcion === 'CUARTA_CIRCUNSCRIPCION') return centroDeVida.includes('cuarta');
        return true;
      });
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
    console.log("🔍 Filtered postulations:", filtered.length, "from", data.length);
  };

  // Handle filter changes
  useEffect(() => {
    console.log('🚀 Iniciando carga de postulaciones...');
    // Cargar estadísticas primero
    fetchStats();
    
    // Cargar TODAS las postulaciones directamente
    setTimeout(() => {
      console.log('📡 Cargando todas las postulaciones...');
      fetchPostulations(0, false);
    }, 1000);
  }, []);

  // Apply filters whenever filter values change
  useEffect(() => {
    if (postulations.length > 0) {
      applyFilters(postulations, statusFilter, validationFilter, circunscripcionFilter, searchTerm, sortBy);
    }
  }, [postulations, statusFilter, validationFilter, circunscripcionFilter, searchTerm, sortBy]);

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
            onClick={() => {
              // Reset pagination and filters
              setCurrentPage(1);
              setPostulations([]);
              fetchPostulations(1, false);
            }}
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
                <SelectItem value="ACTIVE">Fuera del concurso (No completadas)</SelectItem>
                <SelectItem value="APPROVED">Aprobadas</SelectItem>
                <SelectItem value="COMPLETED_PENDING_DOCS">Fuera del concurso (Sin documentos)</SelectItem>
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

            <Select value={circunscripcionFilter} onValueChange={setCircunscripcionFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las circunscripciones</SelectItem>
                <SelectItem value="PRIMERA_CIRCUNSCRIPCION">Primera Circunscripción</SelectItem>
                <SelectItem value="SEGUNDA_CIRCUNSCRIPCION">Segunda Circunscripción</SelectItem>
                <SelectItem value="TERCERA_CIRCUNSCRIPCION">Tercera Circunscripción</SelectItem>
                <SelectItem value="CUARTA_CIRCUNSCRIPCION">Cuarta Circunscripción</SelectItem>
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
            <>
              {filteredPostulations.map((postulation) => (
                <PostulationCard
                  key={postulation.id}
                  postulation={postulation}
                onClick={() => {
                  // Navigate directly to document validation (bypassing the intermediate documents view)
                  window.location.href = fullRouteUrl(`postulations/${postulation.user.dni}/documents/validation`);
                }}
                />
              ))}
              
              {/* Load More Button */}
              {currentPage < totalPages && (
                <div className="text-center py-6">
                  <Button
                    onClick={loadMorePostulations}
                    disabled={isLoadingMore}
                    variant="outline"
                    size="lg"
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Cargando más postulaciones...
                      </>
                    ) : (
                      <>
                        Cargar más postulaciones
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({currentPage}/{totalPages})
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Información de paginación */}
              {postulations.length > 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  ✅ Se han cargado todas las postulaciones ({postulations.length} de {stats?.total})
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
