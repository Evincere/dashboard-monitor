'use client';
import { routeUrl } from '@/lib/utils';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  FileText,
  BarChart3,
  MapPin,
  ArrowRight,
  Eye,
  Keyboard,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import KeyboardShortcutsHelp from '@/components/validation/KeyboardShortcutsHelp';
import BreadcrumbNavigation, { ValidationBreadcrumbs } from '@/components/validation/BreadcrumbNavigation';
import QuickSearch from '@/components/validation/QuickSearch';
import ProgressIndicator from '@/components/validation/ProgressIndicator';

// Types
interface ValidationStats {
  totalApplicants: number;
  pending: number;
  approved: number;
  rejected: number;
  inReview: number;
}

interface Postulant {
  dni: string;
  fullName: string;
  email: string;
  circunscripcion: string;
  inscriptionState: 'COMPLETED_WITH_DOCS' | 'ACTIVE' | 'COMPLETED_PENDING_DOCS' | 'PENDING' | 'APPROVED' | 'REJECTED';
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW';
  documentsCount: number;
  contestInfo: {
    title: string;
    position: string;
  };
  inscriptionDate: string;
  lastValidated?: string;
  validatedBy?: string;
}

interface PostulantsResponse {
  success: boolean;
  error?: string;
  postulants: Postulant[];
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
  statistics: ValidationStats;
}

// Debounce utility function
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function ValidationPageContent() {
  const [postulants, setPostulants] = useState<Postulant[]>([]);
  const [statistics, setStatistics] = useState<ValidationStats | null>(null);
  const [pagination, setPagination] = useState<PostulantsResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [circunscripcionFilter, setCircunscripcionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Get list of DNIs for keyboard navigation
  const postulantsDNIList = postulants.map(p => p.dni);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    postulantsList: postulantsDNIList,
    disabled: false
  });

  // Available circunscripciones
  const circunscripciones = [
    'PRIMERA_CIRCUNSCRIPCION',
    'SEGUNDA_CIRCUNSCRIPCION',
    'TERCERA_CIRCUNSCRIPCION',
    'CUARTA_CIRCUNSCRIPCION'
  ];

  const fetchPostulants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: '12' // 12 cards per page
      });

      // Only add search term if it has meaningful content
      if (debouncedSearchTerm && debouncedSearchTerm.trim().length >= 2) {
        params.append('search', debouncedSearchTerm.trim());
      }

      // Only add filters if they're not 'all'
      if (circunscripcionFilter && circunscripcionFilter !== 'all') {
        params.append('circunscripcion', circunscripcionFilter);
      }

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      console.log('📡 Fetching postulants with params:', Object.fromEntries(params));

      const response = await fetch(`/dashboard-monitor/api/validation/postulants?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch postulants: ${response.status} - ${errorText}`);
      }

      const data: PostulantsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from API');
      }

      setPostulants(data.postulants || []);
      setStatistics(data.statistics || null);
      setPagination(data.pagination || null);

      console.log('✅ Postulants loaded:', {
        count: data.postulants?.length || 0,
        totalElements: data.pagination?.totalElements || 0
      });

    } catch (error) {
      console.error('❌ Error fetching postulants:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron cargar los postulantes',
        variant: 'destructive',
      });

      // Set empty state on error
      setPostulants([]);
      setStatistics(null);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, circunscripcionFilter, statusFilter, toast]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, circunscripcionFilter, statusFilter]);

  useEffect(() => {
    fetchPostulants();
  }, [fetchPostulants]);

  const getStatusBadgeVariant = (status: Postulant['validationStatus']) => {
    switch (status) {
      case 'APPROVED': return 'default';
      case 'PENDING': return 'secondary';
      case 'REJECTED': return 'destructive';
      case 'IN_REVIEW': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: Postulant['validationStatus']) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'REJECTED': return <XCircle className="w-4 h-4" />;
      case 'IN_REVIEW': return <Eye className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProgressPercentage = () => {
    if (!statistics) return 0;
    return Math.round(((statistics.approved + statistics.rejected) / statistics.totalApplicants) * 100);
  };

  const handleViewPostulant = (dni: string) => {
    router.push(routeUrl(`validation/${dni}`));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCircunscripcionFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = () => {
    return searchTerm.trim().length > 0 ||
      circunscripcionFilter !== 'all' ||
      statusFilter !== 'all';
  };

  if (loading && !postulants.length) {
    return (
      <div className="flex flex-col h-full p-4 md:p-8">
        <header className="mb-6 space-y-4">
          <BreadcrumbNavigation items={ValidationBreadcrumbs.main()} />
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Validación Administrativa
          </h1>
          <p className="text-muted-foreground mt-2">
            Revisión y validación de postulantes aptos para el concurso multifuero MPD.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-primary" />
          Validación Administrativa
        </h1>
        <p className="text-muted-foreground mt-2">
          Revisión y validación de postulantes aptos para el concurso multifuero MPD.
        </p>
      </header>

      {/* Enhanced Progress Indicator */}
      {statistics && (
        <div className="mb-6">
          <ProgressIndicator
            statistics={statistics}
            variant="detailed"
          />
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Postulantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.totalApplicants || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Postulantes aptos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getProgressPercentage()}%
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statistics ? (statistics.approved + statistics.rejected) : 0} de {statistics?.totalApplicants || 0} completados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren revisión
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procesados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.approved || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.rejected || 0} rechazados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros y Búsqueda
            {hasActiveFilters() && (
              <Badge variant="secondary" className="ml-2">
                Filtros activos
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por DNI, nombre..."
                className="pl-10 bg-input/80 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-search="true"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Select value={circunscripcionFilter} onValueChange={setCircunscripcionFilter}>
              <SelectTrigger className="bg-input/80 border-white/10">
                <SelectValue placeholder="Circunscripción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las circunscripciones</SelectItem>
                {circunscripciones.map((circ) => (
                  <SelectItem key={circ} value={circ}>
                    {circ.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-input/80 border-white/10">
                <SelectValue placeholder="Estado de validación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="IN_REVIEW">En revisión</SelectItem>
                <SelectItem value="APPROVED">Aprobado</SelectItem>
                <SelectItem value="REJECTED">Rechazado</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <QuickSearch className="min-w-[160px]" />
              <KeyboardShortcutsHelp />
              <Button
                variant="outline"
                onClick={fetchPostulants}
                disabled={loading}
                className="bg-input/80 border-white/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              {hasActiveFilters() && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="bg-input/80 border-white/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* Filter Status */}
          {hasActiveFilters() && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Filtros activos:</span>
                {searchTerm.trim() && (
                  <Badge variant="outline">
                    Búsqueda: "{searchTerm.trim()}"
                  </Badge>
                )}
                {circunscripcionFilter !== 'all' && (
                  <Badge variant="outline">
                    {circunscripcionFilter.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="outline">
                    Estado: {statusFilter === 'IN_REVIEW' ? 'En revisión' : statusFilter}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Status */}
      {!loading && (
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {pagination ? (
              <>
                Mostrando {((pagination.page - 1) * pagination.size) + 1} a{' '}
                {Math.min(pagination.page * pagination.size, pagination.totalElements)} de{' '}
                {pagination.totalElements} postulantes
                {hasActiveFilters() && ' (filtrados)'}
              </>
            ) : (
              'Cargando resultados...'
            )}
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Actualizando...
            </div>
          )}
        </div>
      )}

      {/* No Results Message */}
      {!loading && postulants.length === 0 && (
        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron postulantes</h3>
            <p className="text-muted-foreground text-center">
              {hasActiveFilters()
                ? 'Intenta modificar los filtros de búsqueda o limpiarlos para ver más resultados.'
                : 'No hay postulantes disponibles para validación en este momento.'
              }
            </p>
            {hasActiveFilters() && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={clearFilters}
              >
                <X className="w-4 h-4 mr-2" />
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Postulants Grid */}
      {!loading && postulants.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
          {postulants.map((postulant) => (
            <Card key={postulant.dni} className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold">{postulant.fullName}</CardTitle>
                    <CardDescription className="font-mono">
                      DNI: {postulant.dni}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={getStatusBadgeVariant(postulant.validationStatus)}
                    className="flex items-center gap-1"
                  >
                    {getStatusIcon(postulant.validationStatus)}
                    {postulant.validationStatus === 'IN_REVIEW' ? 'En Revisión' :
                      postulant.validationStatus === 'PENDING' ? 'Pendiente' :
                        postulant.validationStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{postulant.circunscripcion.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>{postulant.documentsCount} documentos</span>
                </div>

                <div className="text-sm">
                  <p className="font-medium">{postulant.contestInfo.title}</p>
                  <p className="text-muted-foreground text-xs">{postulant.contestInfo.position}</p>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>Inscrito: {formatDate(postulant.inscriptionDate)}</p>
                  {postulant.lastValidated && (
                    <p>Validado: {formatDate(postulant.lastValidated)}</p>
                  )}
                </div>

                <Button
                  onClick={() => handleViewPostulant(postulant.dni)}
                  className="w-full mt-4"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Revisar Expediente
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((pagination.page - 1) * pagination.size) + 1} a{' '}
            {Math.min(pagination.page * pagination.size, pagination.totalElements)} de{' '}
            {pagination.totalElements} postulantes
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ValidationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando postulantes...</p>
        </div>
      </div>
    }>
      <ValidationPageContent />
    </Suspense>
  );
}
