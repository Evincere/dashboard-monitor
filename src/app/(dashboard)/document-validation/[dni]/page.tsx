'use client';

import { apiUrl } from '@/lib/utils';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Building,
  AlertTriangle,
  Download,
  Eye,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  ShieldCheck
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import PDFViewer from '@/components/validation/PDFViewer';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import KeyboardShortcutsHelp from '@/components/validation/KeyboardShortcutsHelp';
import BreadcrumbNavigation, { ValidationBreadcrumbs } from '@/components/validation/BreadcrumbNavigation';
import EnhancedComments from '@/components/validation/EnhancedComments';

// Types
interface PostulantData {
  user: {
    id: string;
    fullName: string;
    email: string;
    dni: string;
    telefono?: string;
    direccion?: string;
    createdAt: string;
  };
  inscription: {
    id: string;
    contestId: number;
    state: string;
    currentStep: string;
    centroDeVida: string;
    acceptedTerms: boolean;
    inscriptionDate: string;
    lastUpdated: string;
  };
  contest: {
    id: number;
    title: string;
    position: string;
    description: string;
  };
  documents: {
    id: string;
    fileName: string;
    fileType: string;
    uploadDate: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    validatedBy?: string;
    validationDate?: string;
    comments?: string;
    rejectionReason?: string;
  }[];
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW';
  validationHistory: {
    id: string;
    action: string;
    performedBy: string;
    performedAt: string;
    comments?: string;
  }[];
}

interface ValidationDecision {
  action: 'approve' | 'reject';
  comments: string;
  documentDecisions?: { [documentId: string]: { status: string; comments: string } };
}

function PostulantExpedienteContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const dni = params.dni as string;

  const [postulant, setPostulant] = useState<PostulantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [validationComments, setValidationComments] = useState('');
  const [documentComments, setDocumentComments] = useState<{ [id: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allPostulantsDNI, setAllPostulantsDNI] = useState<string[]>([]);
  const [commentTextareaRef, setCommentTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const fetchPostulantData = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`validation/postulant/${dni}`));
      if (!response.ok) throw new Error('Failed to fetch postulant data');

      const data = await response.json();
      setPostulant(data.postulant);
      
      // Update postulants list for navigation if available
      if (data.navigation?.postulantsList) {
        setAllPostulantsDNI(data.navigation.postulantsList);
      }
      
      // Initialize document comments
      const initialComments: { [id: string]: string } = {};
      data.postulant.documents.forEach((doc: any) => {
        initialComments[doc.id] = doc.comments || '';
      });
      setDocumentComments(initialComments);
      
      // Select first document by default
      if (data.postulant.documents.length > 0) {
        setSelectedDocument(data.postulant.documents[0].id);
      }
    } catch (error) {
      console.error('Error fetching postulant:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del postulante',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dni) {
      fetchPostulantData();
      
      // Fetch navigation data (list of all postulants for keyboard navigation)
      fetch(apiUrl('validation/postulants?getAllDNIs=true'))
        .then(res => res.json())
        .then(data => {
          if (data.allDNIs) {
            setAllPostulantsDNI(data.allDNIs);
          }
        })
        .catch(err => console.error('Error fetching navigation data:', err));
    }
  }, [dni]);

  // Setup keyboard shortcuts
  const { canGoNext, canGoPrevious, navigateToNext, navigateToPrevious } = useKeyboardShortcuts({
    onApprove: () => {
      if (postulant?.validationStatus === 'PENDING') {
        handleValidationDecision({
          action: 'approve',
          comments: validationComments,
          documentDecisions: documentComments
        });
      }
    },
    onReject: () => {
      if (postulant?.validationStatus === 'PENDING') {
        handleValidationDecision({
          action: 'reject',
          comments: validationComments,
          documentDecisions: documentComments
        });
      }
    },
    onComment: () => {
      commentTextareaRef?.focus();
    },
    currentDNI: dni,
    postulantsList: allPostulantsDNI,
    disabled: submitting
  });


  // Función para navegar a la siguiente postulación automáticamente
  const navigateToNextPostulation = async (currentDni: string) => {
    try {
      console.log('🔍 Buscando siguiente postulación después de procesar:', currentDni);
      
      const response = await fetch(`/dashboard-monitor/api/validation/next-postulation?currentDni=${currentDni}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success && result.data?.nextPostulation) {
        const nextDni = result.data.nextPostulation.dni;
        const nextName = result.data.nextPostulation.fullName;
        
        console.log(`✅ Siguiente postulación encontrada: ${nextName} (DNI: ${nextDni})`);
        
        toast({
          title: 'Navegando a siguiente postulación',
          description: `Cargando documentos de ${nextName}`,
          duration: 2000
        });
        
        // Navegar a la siguiente postulación
        router.push(`/validation/${nextDni}`);
        return true;
      } else {
        console.log('ℹ️ No se encontraron más postulaciones para validar');
        
        toast({
          title: 'Validación completada',
          description: 'No hay más postulaciones disponibles para validar en este momento',
          duration: 3000
        });
        
        // Regresar al listado
        router.push('/validation');
        return false;
      }
    } catch (error) {
      console.error('❌ Error al buscar siguiente postulación:', error);
      
      toast({
        title: 'Error de navegación',
        description: 'No se pudo cargar la siguiente postulación. Regresando al listado.',
        variant: 'destructive',
        duration: 3000
      });
      
      // En caso de error, regresar al listado
      router.push('/validation');
      return false;
    }
  };
  const handleValidationDecision = async (decision: ValidationDecision) => {
    setSubmitting(true);
    try {
      const endpoint = decision.action === 'approve' 
        ? apiUrl('validation/approve') 
        : apiUrl('validation/reject');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: dni,
          comments: decision.comments,
          documentDecisions: decision.documentDecisions
        })
      });

      if (!response.ok) throw new Error('Failed to submit decision');

      toast({
        title: `Postulante ${decision.action === 'approve' ? 'Aprobado' : 'Rechazado'}`,
        description: `La decisión ha sido registrada exitosamente. Buscando siguiente postulación...`,
        variant: decision.action === 'approve' ? 'default' : 'destructive',
      });

      // Navegar automáticamente a la siguiente postulación
      await navigateToNextPostulation(dni);
    } catch (error) {
      console.error('Error submitting decision:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar la decisión',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Función para revertir estado de postulación
  const revertPostulationState = async () => {
    if (!postulant?.user?.dni) return;
    try {
      const response = await fetch(`/dashboard-monitor/api/postulations/${postulant.user.dni}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          revertedBy: 'admin', // TODO: obtener usuario actual
          reason: 'Reversión administrativa para nueva evaluación'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to revert');
      }
      
      toast({ 
        title: 'Estado Revertido', 
        description: `Postulación revertida de ${result.data.inscription.previousState} a PENDING`
      });
      await fetchPostulantData();
    } catch (error) {
      console.error('Error reverting postulation:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al revertir', 
        variant: 'destructive' 
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'default';
      case 'PENDING': return 'secondary';
      case 'REJECTED': return 'destructive';
      case 'IN_REVIEW': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  // Función para aprobar y continuar automáticamente
  const handleApproveAndContinue = async () => {
    await handleValidationDecision({
      action: 'approve',
      comments: validationComments,
      documentDecisions: documentComments
    });
  };

  // Función para rechazar y continuar automáticamente  
  const handleRejectAndContinue = async () => {
    await handleValidationDecision({
      action: 'reject',
      comments: validationComments,
      documentDecisions: documentComments
    });
  };
  if (loading) {
    return (
      <div className="flex flex-col h-full p-4 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!postulant) {
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

  const selectedDoc = postulant.documents.find(doc => doc.id === selectedDocument);

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      {/* Header */}
      <header className="space-y-4 mb-8">
        <BreadcrumbNavigation 
          items={ValidationBreadcrumbs.postulant(postulant.user.fullName)} 
          showIndex
          currentIndex={allPostulantsDNI.findIndex(d => d === dni)}
          totalCount={allPostulantsDNI.length}
        />
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
              {postulant.user.fullName}
            </h1>
            <p className="text-muted-foreground">
              DNI: {postulant.user.dni} • Validación de Expediente
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={getStatusBadgeVariant(postulant.validationStatus)}
            className="flex items-center gap-1"
          >
            {getStatusIcon(postulant.validationStatus)}
            {postulant.validationStatus === 'IN_REVIEW' ? 'En Revisión' : 
             postulant.validationStatus === 'PENDING' ? 'Pendiente' :
             postulant.validationStatus}
          </Badge>
          
          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateToPrevious}
              disabled={!canGoPrevious()}
              title="Anterior postulante (P o Shift+←)"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateToNext}
              disabled={!canGoNext()}
              title="Siguiente postulante (N o Shift+→)"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          <KeyboardShortcutsHelp />
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPostulantData}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Left Panel - User Info & Documents */}
        <div className="lg:col-span-1 space-y-6 overflow-y-auto">
          {/* Personal Information */}
          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{postulant.user.email}</span>
              </div>
              
              {postulant.user.telefono && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{postulant.user.telefono}</span>
                </div>
              )}
              
              {postulant.user.direccion && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-wrap">{postulant.user.direccion}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span>{postulant.inscription.centroDeVida}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Inscrito: {formatDate(postulant.inscription.inscriptionDate)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Contest Information */}
          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Información del Concurso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{postulant.contest.title}</p>
                <p className="text-sm text-muted-foreground">{postulant.contest.position}</p>
              </div>
              <div>
                <p className="text-sm">{postulant.contest.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Estado: {postulant.inscription.state}
                </Badge>
                {(postulant.inscription.state === 'APPROVED' || postulant.inscription.state === 'REJECTED' || postulant.inscription.state === 'COMPLETED') && (
                  <Button variant="outline" size="sm" onClick={revertPostulationState} className="gap-1">
                    <RefreshCw className="w-4 h-4" />
                    Revertir
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documentos ({postulant.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {postulant.documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedDocument === doc.id ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                  onClick={() => setSelectedDocument(doc.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">{doc.fileType}</p>
                    </div>
                    <Badge 
                      variant={getStatusBadgeVariant(doc.status)}
                      className="text-xs"
                    >
                      {getStatusIcon(doc.status)}
                      {doc.status}
                    </Badge>
                  </div>
                  {doc.comments && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {doc.comments}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Validation Decision Panel */}
          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Panel de Decisión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <EnhancedComments
                  label="Comentarios Generales"
                  placeholder="Agregue sus observaciones sobre el postulante..."
                  value={validationComments}
                  onChange={setValidationComments}
                  onFocus={() => setCommentTextareaRef(document.activeElement as HTMLTextAreaElement)}
                  history={postulant.validationHistory?.map(h => ({
                    id: h.id,
                    content: h.comments || '',
                    createdAt: h.performedAt,
                    createdBy: h.performedBy,
                    type: 'general' as const
                  })) || []}
                  disabled={submitting || postulant.validationStatus !== 'PENDING'}
                />
              </div>

              <div className="flex flex-col gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      disabled={submitting || postulant.validationStatus !== 'PENDING'}
                      title="Aprobar postulante (A)"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar Postulante
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Está seguro de que desea aprobar al postulante {postulant.user.fullName}?
                        Esta acción será registrada en el historial.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <div className="flex gap-2">
                        <AlertDialogAction 
                          variant="outline"
                          onClick={() => handleValidationDecision({
                            action: 'approve',
                            comments: validationComments,
                            documentDecisions: documentComments
                          })}
                        >
                          Solo Aprobar
                        </AlertDialogAction>
                        <AlertDialogAction 
                          onClick={handleApproveAndContinue}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Aprobar y Continuar →
                        </AlertDialogAction>
                      </div>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      disabled={submitting || postulant.validationStatus !== 'PENDING'}
                      title="Rechazar postulante (R)"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar Postulante
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Rechazo</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Está seguro de que desea rechazar al postulante {postulant.user.fullName}?
                        Esta acción será registrada en el historial.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <div className="flex gap-2">
                        <AlertDialogAction 
                          variant="outline"
                          onClick={() => handleValidationDecision({
                            action: 'reject',
                            comments: validationComments,
                            documentDecisions: documentComments
                          })}
                        >
                          Solo Rechazar
                        </AlertDialogAction>
                        <AlertDialogAction 
                          variant="destructive"
                          onClick={handleRejectAndContinue}
                        >
                          Rechazar y Continuar →
                        </AlertDialogAction>
                      </div>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Document Viewer */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg flex-1 flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Visor de Documentos
                </div>
                {selectedDoc && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedDoc.fileType}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                )}
              </CardTitle>
              {selectedDoc && (
                <CardDescription>
                  {selectedDoc.fileName} • Subido el {formatDate(selectedDoc.uploadDate)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              {selectedDoc ? (
                <div className="flex-1 min-h-0">
                  <PDFViewer 
                    documentId={selectedDoc.id}
                    fileName={selectedDoc.fileName}
                    className="h-full"
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                    <p className="text-lg font-medium">Selecciona un documento</p>
                    <p className="text-muted-foreground">Elige un documento de la lista para visualizarlo</p>
                  </div>
                </div>
              )}

              {selectedDoc && (
                <div className="flex-shrink-0 mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <EnhancedComments
                      label="Comentarios del documento"
                      placeholder="Agregue comentarios específicos para este documento..."
                      value={documentComments[selectedDoc.id] || ''}
                      onChange={(value) => setDocumentComments(prev => ({
                        ...prev,
                        [selectedDoc.id]: value
                      }))}
                      documentId={selectedDoc.id}
                      disabled={submitting}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PostulantExpedientePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando expediente...</p>
        </div>
      </div>
    }>
      <PostulantExpedienteContent />
    </Suspense>
  );
}
