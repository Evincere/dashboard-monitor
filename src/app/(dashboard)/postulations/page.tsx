'use client';

import { apiUrl, fullRouteUrl } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Globe,
  HardDrive
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
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
    selectedCircunscripciones: string[];
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
  const [sortBy, setSortBy] = useState('PRIORITY');
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);

  // 🔧 Referencias para control de estado persistente durante Hot Reload
  const isLoadingDataRef = useRef(false);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 25; // Tamaño pequeño para cargas rápidas

  // 🔍 Estados para búsqueda híbrida
  const [searchMode, setSearchMode] = useState<'local' | 'global'>('local');
  const [searchResults, setSearchResults] = useState<Postulation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCache, setSearchCache] = useState<Map<string, Postulation[]>>(new Map());

  // 🔍 Función de búsqueda en servidor
  const searchAPI = async (term: string): Promise<Postulation[]> => {
    try {
      console.log('🌐 Realizando búsqueda global en servidor:', term);
      
      const params = new URLSearchParams({
        search: term,
        statusFilter: statusFilter !== 'ALL' ? statusFilter : '',
        validationFilter: validationFilter !== 'ALL' ? validationFilter : '',
        sortBy: sortBy
      });

      const response = await fetch(apiUrl(`postulations/search?${params}`), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000) // Timeout más corto para búsqueda
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error en búsqueda');
      }

      console.log('✅ Búsqueda global completada:', data.postulations?.length || 0, 'resultados');
      return data.postulations || [];
      
    } catch (error) {
      console.error('❌ Error en búsqueda global:', error);
      
      // Fallback: buscar solo en datos locales
      console.log('🔄 Fallback: búsqueda en datos locales');
      return postulations.filter(post =>
        post.user.dni.toLowerCase().includes(term.toLowerCase()) ||
        post.user.fullName.toLowerCase().includes(term.toLowerCase()) ||
        post.user.email.toLowerCase().includes(term.toLowerCase())
      );
    }
  };

  // 🔍 Búsqueda híbrida inteligente
  const handleSearch = useCallback(async (term: string) => {
    const trimmedTerm = term.trim();
    
    if (!trimmedTerm) {
      // Sin término de búsqueda: volver a modo local
      setSearchMode('local');
      setSearchResults([]);
      applyFilters(postulations, statusFilter, validationFilter, '', sortBy);
      return;
    }

    // Verificar cache primero
    const cacheKey = `${trimmedTerm}-${statusFilter}-${validationFilter}-${sortBy}`;
    if (searchCache.has(cacheKey)) {
      console.log('💾 Usando resultado de cache para:', trimmedTerm);
      const cachedResults = searchCache.get(cacheKey)!;
      setSearchMode('global');
      setSearchResults(cachedResults);
      setFilteredPostulations(cachedResults);
      return;
    }

    // Primero: búsqueda local en datos ya cargados
    const localResults = postulations.filter(post =>
      post.user.dni.toLowerCase().includes(trimmedTerm.toLowerCase()) ||
      post.user.fullName.toLowerCase().includes(trimmedTerm.toLowerCase()) ||
      post.user.email.toLowerCase().includes(trimmedTerm.toLowerCase())
    );

    console.log('🔍 Búsqueda local encontró:', localResults.length, 'resultados');

    if (localResults.length > 0) {
      // Encontrado localmente: usar resultados locales
      setSearchMode('local');
      setFilteredPostulations(localResults);
      console.log('✅ Usando resultados locales');
    } else {
      // No encontrado localmente: buscar en servidor
      setIsSearching(true);
      setSearchMode('global');
      
      try {
        const globalResults = await searchAPI(trimmedTerm);
        
        // Guardar en cache
        setSearchCache(prev => new Map(prev.set(cacheKey, globalResults)));
        
        setSearchResults(globalResults);
        setFilteredPostulations(globalResults);
        
        if (globalResults.length === 0) {
          toast({
            title: 'Sin resultados',
            description: `No se encontraron postulaciones que coincidan con "${trimmedTerm}"`,
            variant: 'default',
          });
        } else {
          toast({
            title: 'Búsqueda completada',
            description: `Se encontraron ${globalResults.length} postulaciones en la base de datos completa`,
            variant: 'default',
          });
        }
        
      } catch (error) {
        console.error('❌ Error en búsqueda híbrida:', error);
        toast({
          title: 'Error en búsqueda',
          description: 'No se pudo completar la búsqueda. Mostrando resultados locales.',
          variant: 'destructive',
        });
        setFilteredPostulations(localResults); // Fallback a resultados locales
      } finally {
        setIsSearching(false);
      }
    }
  }, [postulations, statusFilter, validationFilter, sortBy, searchCache, toast]);

  // Apply filters and sorting
  const applyFilters = useCallback((
    data: Postulation[],
    status: string,
    validation: string,
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

    // Search filter (solo aplicar si estamos en modo local)
    if (search.trim() && searchMode === 'local') {
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
    console.log(`🔍 Filtered postulations (${searchMode}):`, filtered.length, "from", data.length);
  }, [searchMode]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      console.log('📊 Cargando estadísticas...');
      const response = await fetch(apiUrl('postulations/management?onlyStats=true'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
          setTotalPages(data.pagination?.totalPages || 1);
          console.log('✅ Estadísticas cargadas:', data.stats);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Error cargando estadísticas:', error);
      return false;
    }
  };

  // Fetch postulations
  const fetchPostulations = async (page = 1, append = false) => {
    if (isLoadingDataRef.current) {
      console.log('⚠️ Ya se están cargando datos, omitiendo...');
      return;
    }

    try {
      isLoadingDataRef.current = true;
      console.log(`📡 Cargando postulaciones - página ${page}...`);
      
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      const response = await fetch(apiUrl(`postulations/management?${params}`), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      const newPostulations = data.postulations || [];
      console.log("✅ Received postulations:", newPostulations.length);

      let allPostulations: Postulation[];
      if (append && page > 1) {
        allPostulations = [...postulations, ...newPostulations];
      } else {
        allPostulations = newPostulations;
      }

      setPostulations(allPostulations);
      setCurrentPage(page);

      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
      }

      // Solo aplicar filtros si no estamos en modo búsqueda global
      if (searchMode === 'local') {
        applyFilters(allPostulations, statusFilter, validationFilter, searchTerm, sortBy);
      }

    } catch (error) {
      console.error('Error fetching postulations:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast({
          title: 'Error',
          description: `Error cargando postulaciones: ${error.message}`,
          variant: 'destructive',
        });
      }
    } finally {
      isLoadingDataRef.current = false;
    }
  };

  // Load more postulations
  const loadMorePostulations = async () => {
    if (currentPage < totalPages && !isLoadingMore && !isLoadingDataRef.current && searchMode === 'local') {
      setIsLoadingMore(true);
      await fetchPostulations(currentPage + 1, true);
      setIsLoadingMore(false);
    }
  };

  // 🔍 Función de limpieza de búsqueda
  const clearSearch = () => {
    setSearchTerm('');
    setSearchMode('local');
    setSearchResults([]);
    applyFilters(postulations, statusFilter, validationFilter, '', sortBy);
  };

  // Initial load
  useEffect(() => {
    if (postulations.length > 0 || stats !== null) {
      console.log('⚠️ Ya inicializado, omitiendo...');
      return;
    }

    console.log('🚀 Iniciando carga inicial...');

    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        console.log("📊 Cargando estadísticas...");
        await fetchStats();
        
        console.log("📡 Cargando postulaciones...");
        await fetchPostulations(1, false);
        
        console.log("✅ Carga inicial completada");
        setLoading(false);
      } catch (error) {
        console.error("❌ Error en carga inicial:", error);
        setLoading(false);
        // No resetear hasInitializedRef para que se pueda reintentar
      }
    };

    loadInitialData();
  }, []);

  // Apply filters when they change (solo en modo local)
  useEffect(() => {
    if (postulations.length > 0 && searchMode === 'local') {
      applyFilters(postulations, statusFilter, validationFilter, searchTerm, sortBy);
    } else if (searchMode === 'global' && searchResults.length > 0) {
      // En modo global, aplicar filtros a los resultados de búsqueda
      applyFilters(searchResults, statusFilter, validationFilter, '', sortBy);
    }
  }, [statusFilter, validationFilter, searchMode, postulations, searchResults, applyFilters]);

  // 🔍 Manejar cambios en el término de búsqueda con debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(searchTerm);
    }, 500); // 500ms de debounce

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, handleSearch]);

  const getValidationStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'REJECTED': return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'PARTIAL': return <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      default: return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const handleRefresh = () => {
    isLoadingDataRef.current = false;
    setPostulations([]);
    setFilteredPostulations([]);
    setSearchResults([]);
    setSearchCache(new Map());
    setCurrentPage(1);
    setSearchMode('local');
    setSearchTerm('');
    setLoading(true);
    
    setTimeout(async () => {
      await fetchStats();
      await fetchPostulations(1, false);
      setLoading(false);
    }, 100);
  };

  if (loading) {
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
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
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
          <Button variant="outline" onClick={handleRefresh} disabled={loading || isLoadingDataRef.current}>
            <RefreshCw className={`w-4 h-4 mr-2 ${(loading || isLoadingDataRef.current) ? 'animate-spin' : ''}`} />
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
            {/* 🔍 Indicador de modo de búsqueda */}
            <div className="flex items-center gap-2 ml-auto">
              {searchMode === 'global' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Búsqueda Global
                </Badge>
              )}
              {searchMode === 'local' && postulations.length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  Datos Locales
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Filtre y busque postulaciones para una gestión eficiente
            {searchMode === 'global' && (
              <span className="block mt-1 text-blue-600 dark:text-blue-400">
                • Búsqueda realizada en toda la base de datos
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="relative">
                <Search className={`absolute left-2 top-2.5 h-4 w-4 ${isSearching ? 'animate-pulse text-blue-500' : 'text-muted-foreground'}`} />
                <Input
                  placeholder="Buscar por DNI, nombre, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  disabled={isSearching}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-6 w-6 p-0"
                    onClick={clearSearch}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {isSearching && (
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Buscando en servidor...
                </div>
              )}
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
            {searchMode === 'global' && searchTerm && (
              <Badge variant="secondary">
                Resultados de búsqueda para: "{searchTerm}"
              </Badge>
            )}
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
          {filteredPostulations.length === 0 && !loading ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No se encontraron postulaciones</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 
                    `No hay postulaciones que coincidan con "${searchTerm}"` :
                    postulations.length === 0 
                      ? "No hay postulaciones disponibles o aún no se han cargado."
                      : "No hay postulaciones que coincidan con los filtros seleccionados."
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  {searchTerm && (
                    <Button onClick={clearSearch} variant="outline">
                      <XCircle className="w-4 h-4 mr-2" />
                      Limpiar Búsqueda
                    </Button>
                  )}
                  {postulations.length === 0 && (
                    <Button onClick={handleRefresh} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Cargar Postulaciones
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {filteredPostulations.map((postulation) => (
                <PostulationCard
                  key={postulation.id}
                  postulation={postulation}
                  onClick={() => {
                    window.location.href = fullRouteUrl(`postulations/${postulation.user.dni}/documents/validation`);
                  }}
                />
              ))}

              {/* Load More Button - Solo mostrar en modo local */}
              {searchMode === 'local' && currentPage < totalPages && (
                <div className="text-center py-6">
                  <Button
                    onClick={loadMorePostulations}
                    disabled={isLoadingMore || isLoadingDataRef.current}
                    variant="outline"
                    size="lg"
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Cargando más...
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
                  {searchMode === 'local' ? (
                    <>
                      ✅ Mostrando {filteredPostulations.length} de {postulations.length} postulaciones cargadas
                      {stats?.total && ` (${stats.total} total en sistema)`}
                    </>
                  ) : (
                    <>
                      🌐 Mostrando {filteredPostulations.length} resultados de búsqueda global
                      {searchCache.size > 0 && ` • ${searchCache.size} búsquedas en cache`}
                    </>
                  )}
                </div>
              )}

              {/* Indicador de modo de búsqueda global */}
              {searchMode === 'global' && (
                <Card className="border-blue-500/20 bg-blue-500/10">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                      <Globe className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Búsqueda realizada en toda la base de datos
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearch}
                        className="text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                      >
                        Volver a vista paginada
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
