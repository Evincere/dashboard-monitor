
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FolderKanban, 
  Search, 
  FileDown, 
  Eye, 
  Trash2, 
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Users,
  HardDrive,
  ArrowRight,
  FileCheck,
  Info
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentTypeBadge } from '@/components/ui/document-type-badge';
import Link from 'next/link';

interface Document {
  id: string;
  name: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  contest: {
    id: string;
    title: string;
  } | null;
}

interface DocumentsResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: {
    totalDocuments: number;
    uniqueUsers: number;
    totalSize: number;
    avgSize: number;
    statusCounts: {
      pending: number;
      approved: number;
      rejected: number;
    };
  };
  documentTypes: Array<{
    type: string;
    count: number;
  }>;
  cached: boolean;
  timestamp: string;
}

function DocumentsPageContent() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [statistics, setStatistics] = useState<DocumentsResponse['statistics'] | null>(null);
  const [documentTypes, setDocumentTypes] = useState<Array<{type: string; count: number}>>([]);
  const [pagination, setPagination] = useState<DocumentsResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userParam = searchParams.get('user');
    if (userParam) {
      setUserFilter(userParam);
    }
  }, [searchParams]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (userFilter) params.append('user', userFilter);

      const response = await fetch(`/api/documents?${params}`);
      if (!response.ok) throw new Error('Failed to fetch documents');

      const data: DocumentsResponse = await response.json();
      setDocuments(data.documents);
      setStatistics(data.statistics);
      setDocumentTypes(data.documentTypes);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los documentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentPage, searchTerm, typeFilter, statusFilter, userFilter]);

  const handleDelete = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');

      toast({
        title: 'Documento Eliminado',
        description: `El documento "${name}" ha sido eliminado permanentemente.`,
        variant: 'destructive',
      });

      fetchDocuments(); // Refresh the list
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el documento',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/documents?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validation_status: newStatus,
        }),
      });

      if (!response.ok) throw new Error('Failed to update document status');

      toast({
        title: 'Estado Actualizado',
        description: `El estado del documento ha sido cambiado a ${newStatus}`,
      });

      fetchDocuments(); // Refresh the list
    } catch (error) {
      console.error('Error updating document status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado del documento',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/documents/download?id=${id}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: 'Descarga Iniciada',
          description: `Descargando "${name}"`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error de Descarga',
          description: errorData.message || 'No se pudo descargar el archivo',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Error',
        description: 'Error al descargar el documento',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: Document['validationStatus']) => {
    switch (status) {
      case 'APPROVED': return 'default';
      case 'PENDING': return 'secondary';
      case 'REJECTED': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: Document['validationStatus']) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'REJECTED': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !documents.length) {
    return (
      <div className="flex flex-col h-full p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <FolderKanban className="w-8 h-8 text-primary" />
            Gestión de Documentos
          </h1>
          <p className="text-muted-foreground mt-2">
            Busque, visualice y administre todos los documentos cargados por los usuarios.
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
        
        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg flex-grow">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
              <FolderKanban className="w-8 h-8 text-primary" />
              Gestión de Documentos
            </h1>
            <p className="text-muted-foreground mt-2">
              Busque, visualice y administre todos los documentos cargados por los usuarios.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link href="/postulations">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all">
                <FileCheck className="w-4 h-4 mr-2" />
                Validación de Documentos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Information Banner */}
      <div className="mb-6">
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Nueva Interfaz de Validación</h3>
                  <p className="text-sm text-gray-600">
                    Use la nueva interfaz de gestión de postulaciones para validar documentos de forma más eficiente. 
                    Los postulantes con estado COMPLETED_WITH_DOCS tienen prioridad.
                  </p>
                </div>
              </div>
              <Link href="/postulations">
                <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Ir a Validación
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.totalDocuments.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.uniqueUsers || 0} usuarios únicos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espacio Utilizado</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics ? formatFileSize(statistics.totalSize) : '0 B'}
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio: {statistics ? formatFileSize(statistics.avgSize) : '0 B'}
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
              {statistics?.statusCounts.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren revisión
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.statusCounts.approved || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.statusCounts.rejected || 0} rechazados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar documentos..."
                className="pl-10 bg-input/80 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-input/80 border-white/10">
                <SelectValue placeholder="Tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {documentTypes.map((type) => (
                  <SelectItem key={type.type} value={type.type}>
                    {type.type} ({type.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-input/80 border-white/10">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="APPROVED">Aprobado</SelectItem>
                <SelectItem value="REJECTED">Rechazado</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filtrar por usuario..."
              className="bg-input/80 border-white/10"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />

            <Button 
              variant="outline" 
              onClick={fetchDocuments}
              disabled={loading}
              className="bg-input/80 border-white/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg flex-grow">
        <CardHeader>
          <CardTitle className="font-headline">
            Archivos de Usuarios
            {pagination && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({pagination.total} documentos)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{doc.originalName}</span>
                        {doc.contest && (
                          <span className="text-xs text-muted-foreground">
                            Concurso: {doc.contest.title}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Badge variant="secondary">{doc.user.name}</Badge>
                        <span className="text-xs text-muted-foreground mt-1">
                          {doc.user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DocumentTypeBadge 
                        documentType={doc.documentType} 
                        variant="compact"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStatusBadgeVariant(doc.validationStatus)}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getStatusIcon(doc.validationStatus)}
                        {doc.validationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatFileSize(doc.fileSize)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDate(doc.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleDownload(doc.id, doc.originalName)}
                          title="Descargar"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" title="Cambiar estado">
                              {getStatusIcon(doc.validationStatus)}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(doc.id, 'APPROVED')}
                              className="text-green-600"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprobar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(doc.id, 'PENDING')}
                              className="text-yellow-600"
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Pendiente
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(doc.id, 'REJECTED')}
                              className="text-red-600"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Rechazar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. El archivo "{doc.originalName}" 
                                será eliminado permanentemente del sistema y del almacenamiento.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(doc.id, doc.originalName)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} documentos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
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
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando documentos...</p>
        </div>
      </div>
    }>
      <DocumentsPageContent />
    </Suspense>
  );
}
