'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw,
  Grid3X3,
  List,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Progress } from '@/components/ui/progress';
import DocumentThumbnail from '@/components/postulations/DocumentThumbnail';
import DocumentViewer from '@/components/postulations/DocumentViewer';
import { DocumentTypeBadge } from '@/components/ui/document-type-badge';

interface Document {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  documentType: string;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isRequired: boolean;
  uploadDate: string;
  validatedAt?: string;
  validatedBy?: string;
  comments?: string;
  rejectionReason?: string;
  thumbnailUrl?: string;
}

interface PostulantInfo {
  user: {
    dni: string;
    fullName: string;
    email: string;
  };
  inscription: {
    state: string;
    centroDeVida: string;
    createdAt: string;
  };
  contest: {
    title: string;
    position: string;
  };
}

interface DocumentsPageData {
  postulant: PostulantInfo;
  documents: Document[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    required: number;
    completionPercentage: number;
  };
  validationStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REJECTED';
}

export default function PostulantDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const dni = params.dni as string;

  const [data, setData] = useState<DocumentsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  // Fetch postulant documents data
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      console.log(`Fetching documents for DNI: ${dni}`);
      const response = await fetch(`/api/postulations/${dni}/documents`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'API returned success: false');
      }
      
      setData(result.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error al cargar documentos',
        description: error instanceof Error ? error.message : 'No se pudieron cargar los documentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (dni) {
      fetchDocuments();
    }
  }, [dni]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document);
    setShowViewer(true);
  };

  const handleDocumentValidation = async (documentId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const endpoint = action === 'approve' ? '/api/documents/approve' : '/api/documents/reject';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          reason,
          validatedBy: 'admin' // TODO: Get from auth context
        })
      });

      if (!response.ok) throw new Error('Failed to validate document');

      toast({
        title: `Documento ${action === 'approve' ? 'Aprobado' : 'Rechazado'}`,
        description: `El documento ha sido ${action === 'approve' ? 'aprobado' : 'rechazado'} exitosamente`,
        variant: action === 'approve' ? 'default' : 'destructive',
      });

      // Refresh data
      await fetchDocuments();
      setShowViewer(false);
    } catch (error) {
      console.error('Error validating document:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar la validación',
        variant: 'destructive',
      });
    }
  };

  const getFilteredDocuments = () => {
    if (!data) return [];
    
    let filtered = [...data.documents];
    
    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(doc => doc.validationStatus === statusFilter);
    }
    
    // Filter by type
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(doc => doc.documentType === typeFilter);
    }
    
    return filtered;
  };

  const getUniqueDocumentTypes = () => {
    if (!data) return [];
    return [...new Set(data.documents.map(doc => doc.documentType))];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'REJECTED': return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'PENDING': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col h-full p-4 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        
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
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertTriangle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Postulante no encontrado</h2>
        <p className="text-muted-foreground mb-4">No se pudo encontrar información para el DNI: {dni}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  const filteredDocuments = getFilteredDocuments();
  const documentTypes = getUniqueDocumentTypes();

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                <FileText className="w-8 h-8 text-primary" />
                Documentos - {data.postulant.user.fullName}
              </h1>
              <p className="text-muted-foreground">
                DNI: {data.postulant.user.dni} • {data.postulant.contest.title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => router.push(`/postulations/${dni}/documents/validation`)}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Iniciar Validación
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Postulant Info Card */}
        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{data.postulant.user.fullName}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {data.postulant.user.email}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Concurso: </span>
                  {data.postulant.contest.position}
                </div>
                <div className="text-sm text-muted-foreground">
                  {data.postulant.inscription.centroDeVida}
                </div>
              </div>
              
              <div className="space-y-2">
                <Badge className={getStatusColor(data.validationStatus)}>
                  {getStatusIcon(data.validationStatus)}
                  <span className="ml-1">
                    {data.validationStatus === 'PENDING' ? 'Pendiente' :
                     data.validationStatus === 'PARTIAL' ? 'Parcial' :
                     data.validationStatus === 'COMPLETED' ? 'Completado' : 'Rechazado'}
                  </span>
                </Badge>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">
                    Progreso: {data.stats.completionPercentage}%
                  </div>
                  <Progress value={data.stats.completionPercentage} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </header>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.total}</div>
            <div className="text-xs text-muted-foreground">
              {data.stats.required} obligatorios
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.stats.pending}</div>
            <div className="text-xs text-muted-foreground">
              Requieren validación
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.approved}</div>
            <div className="text-xs text-muted-foreground">
              Documentos válidos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rechazados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.stats.rejected}</div>
            <div className="text-xs text-muted-foreground">
              Requieren corrección
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los estados</SelectItem>
                    <SelectItem value="PENDING">Pendientes</SelectItem>
                    <SelectItem value="APPROVED">Aprobados</SelectItem>
                    <SelectItem value="REJECTED">Rechazados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los tipos</SelectItem>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredDocuments.length} documentos
              </span>
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="flex-1 overflow-auto">
        {filteredDocuments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No se encontraron documentos</h3>
              <p className="text-muted-foreground">
                No hay documentos que coincidan con los filtros seleccionados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
              : 'space-y-2'
          }>
            {filteredDocuments.map((document) => (
              <DocumentThumbnail
                key={document.id}
                document={document}
                viewMode={viewMode}
                onClick={() => handleDocumentClick(document)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {showViewer && selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          postulantInfo={data.postulant}
          onClose={() => {
            setShowViewer(false);
            setSelectedDocument(null);
          }}
          onApprove={(reason) => handleDocumentValidation(selectedDocument.id, 'approve', reason)}
          onReject={(reason) => handleDocumentValidation(selectedDocument.id, 'reject', reason)}
        />
      )}
    </div>
  );
}
