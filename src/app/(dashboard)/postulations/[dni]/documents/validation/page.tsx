"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useValidationStore } from "@/stores/validationStore";
import { useValidationShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  DocumentSkeleton,
  DocumentListSkeleton,
  ValidationPanelSkeleton,
} from "@/components/validation/DocumentSkeleton";
import { ValidationProgress } from "@/components/validation/ValidationProgress";
import {
  KeyboardShortcuts,
  KeyboardShortcutsHelp,
} from "@/components/validation/KeyboardShortcuts";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Download,
  FileText,
  User,
  Target,
  Calendar,
  MapPin,
  Maximize,
  Minimize,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DocumentTypeBadge } from "@/components/ui/document-type-badge";
import ValidationCompletionModal from "@/components/validation/ValidationCompletionModal";

interface Document {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  documentType: string;
  validationStatus: "PENDING" | "APPROVED" | "REJECTED";
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

interface ValidationData {
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
}

const REJECTION_REASONS = [
  "Documento ilegible o de mala calidad",
  "Documento incompleto",
  "Documento no corresponde al tipo requerido",
  "Información inconsistente con otros documentos",
  "Documento vencido o no vigente",
  "Falta información requerida",
  "Formato de archivo no válido",
  "Documento no pertenece al postulante",
  "Otro (especificar en comentarios)",
];

export default function DocumentValidationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const dni = params.dni as string;

  // Zustand store
  const {
    documents,
    currentDocument,
    postulant,
    stats,
    loading,
    submitting,
    setDocuments,
    setCurrentDocument,
    setPostulant,
    setStats,
    setLoading,
    approveDocument,
    rejectDocument,
    goToNextPending,
    goToPreviousPending,
    updateStats,
    reset,
  } = useValidationStore();

  // Local state for UI
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [allPostulantsList, setAllPostulantsList] = useState<string[]>([]);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Fetch validation data
  const fetchValidationData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/postulations/${dni}/documents`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "API returned success: false");
      }

      // Update store
      setDocuments(result.data.documents);
      setPostulant(result.data.postulant);
      setStats(result.data.stats);

      // Set first pending document as current
      const firstPending = result.data.documents.find(
        (doc: Document) => doc.validationStatus === "PENDING"
      );
      if (firstPending) {
        setCurrentDocument(firstPending);
      } else if (result.data.documents.length > 0) {
        setCurrentDocument(result.data.documents[0]);
      }
    } catch (error) {
      console.error("Error fetching validation data:", error);
      toast({
        title: "Error",
        description: `No se pudieron cargar los documentos: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dni) {
      fetchValidationData();
    }

    // Cleanup on unmount
    return () => {
      reset();
    };
  }, [dni]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!currentDocument) return;
    window.open(`/api/documents/${currentDocument.id}/download`, "_blank");
  }, [currentDocument]);

  // Handle document approval
  const handleApprove = async () => {
    if (!currentDocument) return;

    try {
      await approveDocument(currentDocument.id, comments.trim() || undefined);

      toast({
        title: "Documento Aprobado",
        description: "El documento ha sido aprobado exitosamente",
        variant: "default",
      });

      // Clear form
      setComments("");
    } catch (error) {
      console.error("Error approving document:", error);
      toast({
        title: "Error",
        description: "No se pudo aprobar el documento",
        variant: "destructive",
      });
    }
  };

  // Handle document rejection
  const handleReject = async () => {
    if (!currentDocument || !rejectionReason.trim()) return;

    try {
      const fullReason = comments.trim()
        ? `${rejectionReason}. ${comments}`
        : rejectionReason;

      await rejectDocument(currentDocument.id, fullReason);

      toast({
        title: "Documento Rechazado",
        description: "El documento ha sido rechazado",
        variant: "destructive",
      });

      // Clear form
      setComments("");
      setRejectionReason("");
      setShowRejectionForm(false);
    } catch (error) {
      console.error("Error rejecting document:", error);
      toast({
        title: "Error",
        description: "No se pudo rechazar el documento",
        variant: "destructive",
      });
    }
  };

  // Keyboard shortcuts
  useValidationShortcuts({
    onApprove:
      currentDocument?.validationStatus === "PENDING"
        ? handleApprove
        : undefined,
    onReject:
      currentDocument?.validationStatus === "PENDING"
        ? () => setShowRejectionForm(true)
        : undefined,
    onNext: goToNextPending,
    onCancel: () => setShowRejectionForm(false),
    onDownload: handleDownload,
    enabled: !submitting,
  });

  // Check if all required documents are validated
  useEffect(() => {
    if (documents.length > 0 && postulant) {
      const requiredDocs = documents.filter(doc => doc.isRequired);
      const allRequiredValidated = requiredDocs.length > 0 && requiredDocs.every(doc => doc.validationStatus !== "PENDING");
      
      if (allRequiredValidated && !showCompletionModal) {
        setShowCompletionModal(true);
      }
    }
  }, [documents, postulant, showCompletionModal]);

  // Modal handlers
  const handleApprovePostulation = async () => {
    try {
      // Here you would make an API call to approve the postulation
      toast({
        title: "Postulación Aprobada",
        description: "La postulación ha sido aprobada exitosamente",
      });
      setShowCompletionModal(false);
    } catch (error) {
      console.error('Error approving postulation:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar la postulación",
        variant: "destructive",
      });
    }
  };

  const handleRejectPostulation = async () => {
    try {
      // Here you would make an API call to reject the postulation
      toast({
        title: "Postulación Rechazada",
        description: "La postulación ha sido rechazada",
        variant: "destructive",
      });
      setShowCompletionModal(false);
    } catch (error) {
      console.error('Error rejecting postulation:', error);
      toast({
        title: "Error",
        description: "No se pudo rechazar la postulación",
        variant: "destructive",
      });
    }
  };

  const handleGenerateEmailTemplate = (emailContent: string) => {
    // Here you would handle the email template generation
    console.log('Generated email template:', emailContent);
    toast({
      title: "Template Generado",
      description: "El template del correo electrónico ha sido generado",
    });
  };

  const handleNextPostulation = () => {
    // Here you would navigate to the next postulation
    toast({
      title: "Navegando",
      description: "Navegando a la próxima postulación...",
    });
    setShowCompletionModal(false);
  };

  // Handle revert document status
  const handleRevertStatus = () => {
    if (!currentDocument) return;

    // Reset document status to PENDING
    const updatedDocuments = documents.map(doc =>
      doc.id === currentDocument.id
        ? {
            ...doc,
            validationStatus: 'PENDING' as const,
            validatedAt: undefined,
            validatedBy: undefined,
            comments: undefined,
            rejectionReason: undefined
          }
        : doc
    );
    setDocuments(updatedDocuments);
    updateStats();
    
    toast({
      title: "Estado Revertido",
      description: "El documento ha vuelto al estado pendiente",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando documentos...</p>
        </div>
      </div>
    );
  }

  if (!postulant || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertTriangle className="w-16 h-16 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Postulante no encontrado</h2>
        <p className="text-slate-600 mb-4">
          No se pudo encontrar información para el DNI: {dni}
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">
                Validación de Documentos
              </h1>
              <p className="text-muted-foreground">
                {postulant.user.fullName} • DNI: {postulant.user.dni}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <KeyboardShortcuts />
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Progreso: {stats.approved}/{stats.total} documentos
              </div>
              <div className="w-32">
                <Progress value={stats.completionPercentage} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Dynamic Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Document List (Collapsible) */}
        <div 
          className={`bg-card border-r border-border overflow-y-auto transition-all duration-300 ${
            isSidebarCollapsed ? 'w-16' : 'w-80'
          }`}
        >
          <div className="flex items-center justify-between p-3 border-b border-border">
            {!isSidebarCollapsed && (
              <h3 className="font-semibold text-sm">Documentos</h3>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {!isSidebarCollapsed && (
            <DocumentList
              documents={documents}
              currentDocument={currentDocument}
              onDocumentSelect={setCurrentDocument}
              stats={
                stats || {
                  total: 0,
                  pending: 0,
                  approved: 0,
                  rejected: 0,
                  required: 0,
                  completionPercentage: 0,
                }
              }
            />
          )}
          
          {isSidebarCollapsed && (
            <div className="p-2 space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setCurrentDocument(doc)}
                  className={`w-full p-2 rounded transition-colors ${
                    doc.id === currentDocument?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  title={doc.originalName || doc.fileName}
                >
                  {doc.validationStatus === "APPROVED" ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : doc.validationStatus === "REJECTED" ? (
                    <XCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center Panel - Document Viewer */}
        <div className={`bg-muted flex-1 transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
          <DocumentViewer 
            document={currentDocument} 
            onNext={goToNextPending}
            onPrevious={goToPreviousPending}
            documents={documents}
            stats={stats}
            postulant={postulant}
            isFullscreen={isFullscreen}
            onFullscreenToggle={setIsFullscreen}
          />
        </div>

        {/* Right Panel - Validation Actions */}
        <div className="w-80 bg-card border-l border-border overflow-y-auto">
          {postulant && (
            <ValidationPanel
              document={currentDocument}
              postulant={postulant}
              onApprove={handleApprove}
              onReject={() => setShowRejectionForm(true)}
              onRevertStatus={handleRevertStatus}
              submitting={submitting}
              comments={comments}
              onCommentsChange={setComments}
              showRejectionForm={showRejectionForm}
              rejectionReason={rejectionReason}
              onRejectionReasonChange={setRejectionReason}
              onConfirmReject={handleReject}
              onCancelReject={() => {
                setShowRejectionForm(false);
                setRejectionReason("");
                setComments("");
              }}
            />
          )}
        </div>
      </div>

      {/* Validation Completion Modal */}
      {showCompletionModal && postulant && (
        <ValidationCompletionModal
          open={showCompletionModal}
          onOpenChange={setShowCompletionModal}
          documents={documents}
          postulant={{
            user: {
              dni: postulant.user.dni,
              fullName: postulant.user.fullName,
              email: postulant.user.email,
              telefono: "" // This would need to be added to the PostulantInfo interface
            },
            inscription: postulant.inscription,
            contest: postulant.contest
          }}
          onApprovePostulation={handleApprovePostulation}
          onRejectPostulation={handleRejectPostulation}
          onGenerateEmailTemplate={handleGenerateEmailTemplate}
          onNextPostulation={handleNextPostulation}
        />
      )}
    </div>
  );
}

// Document List Component
function DocumentList({
  documents,
  currentDocument,
  onDocumentSelect,
  stats,
}: {
  documents: Document[];
  currentDocument: Document | null;
  onDocumentSelect: (doc: Document) => void;
  stats: ValidationData["stats"];
}) {
  const pendingDocs = documents.filter(
    (doc) => doc.validationStatus === "PENDING"
  );
  const approvedDocs = documents.filter(
    (doc) => doc.validationStatus === "APPROVED"
  );
  const rejectedDocs = documents.filter(
    (doc) => doc.validationStatus === "REJECTED"
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "REJECTED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
      case "REJECTED":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      default:
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Progress Header */}
      <div className="p-4 border-b border-border">
        <div className="text-sm text-muted-foreground mb-2">
          Progreso: {stats.approved + stats.rejected}/{stats.total} documentos
        </div>
        <Progress
          value={((stats.approved + stats.rejected) / stats.total) * 100}
          className="h-2"
        />

        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          <div className="text-center">
            <div className="font-semibold text-blue-600">{stats.pending}</div>
            <div className="text-slate-500">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-emerald-600">
              {stats.approved}
            </div>
            <div className="text-slate-500">Aprobados</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-red-600">{stats.rejected}</div>
            <div className="text-slate-500">Rechazados</div>
          </div>
        </div>
      </div>

      {/* Document Lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Pending Documents */}
        {pendingDocs.length > 0 && (
          <div className="p-3">
            <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Pendientes ({pendingDocs.length})
            </h3>
            <div className="space-y-2">
              {pendingDocs.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  document={doc}
                  isActive={doc.id === currentDocument?.id}
                  onClick={() => onDocumentSelect(doc)}
                  statusIcon={getStatusIcon(doc.validationStatus)}
                  statusColor={getStatusColor(doc.validationStatus)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Approved Documents */}
        {approvedDocs.length > 0 && (
          <div className="p-3 border-t border-border">
            <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Aprobados ({approvedDocs.length})
            </h3>
            <div className="space-y-2">
              {approvedDocs.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  document={doc}
                  isActive={doc.id === currentDocument?.id}
                  onClick={() => onDocumentSelect(doc)}
                  statusIcon={getStatusIcon(doc.validationStatus)}
                  statusColor={getStatusColor(doc.validationStatus)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Rejected Documents */}
        {rejectedDocs.length > 0 && (
          <div className="p-3 border-t border-border">
            <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Rechazados ({rejectedDocs.length})
            </h3>
            <div className="space-y-2">
              {rejectedDocs.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  document={doc}
                  isActive={doc.id === currentDocument?.id}
                  onClick={() => onDocumentSelect(doc)}
                  statusIcon={getStatusIcon(doc.validationStatus)}
                  statusColor={getStatusColor(doc.validationStatus)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Document List Item Component
function DocumentListItem({
  document,
  isActive,
  onClick,
  statusIcon,
  statusColor,
}: {
  document: Document;
  isActive: boolean;
  onClick: () => void;
  statusIcon: React.ReactNode;
  statusColor: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
        isActive
          ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : statusColor
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{statusIcon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm text-card-foreground truncate">
              {document.originalName || document.fileName}
            </h4>
            {document.isRequired && (
              <div
                className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full p-0.5"
                title="Documento obligatorio"
              >
                <AlertTriangle className="w-3 h-3" />
              </div>
            )}
          </div>

          <DocumentTypeBadge
            documentType={document.documentType}
            variant="compact"
          />

          <div className="text-xs text-muted-foreground mt-1">
            {(document.fileSize / 1024 / 1024).toFixed(1)} MB
          </div>
        </div>
      </div>
    </div>
  );
}

// Document Viewer Component
function DocumentViewer({
  document,
  onNext,
  onPrevious,
  documents,
  stats,
  postulant,
  isFullscreen = false,
  onFullscreenToggle,
}: {
  document: Document | null;
  onNext: () => void;
  onPrevious?: () => void;
  documents?: Document[];
  stats?: ValidationData["stats"];
  postulant?: PostulantInfo;
  isFullscreen?: boolean;
  onFullscreenToggle?: (fullscreen: boolean) => void;
}) {
  // Check if all required documents are validated
  const requiredDocs = documents?.filter(doc => doc.isRequired) || [];
  const requiredValidated = requiredDocs.every(doc => doc.validationStatus !== "PENDING");
  const showNextPostulationButton = requiredValidated && requiredDocs.length > 0;
  if (!document) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Selecciona un documento para visualizar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Viewer Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-card-foreground">
                {document.originalName || document.fileName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {document.documentType} •{" "}
                {(document.fileSize / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFullscreenToggle?.(!isFullscreen)}
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>

            {showNextPostulationButton ? (
              <Button 
                variant="default" 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  // Navigate to next postulation
                  // This would trigger the completion modal first
                  console.log("Navigate to next postulation");
                }}
              >
                <Target className="w-4 h-4 mr-2" />
                Próxima Postulación
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                {onPrevious && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onPrevious}
                    title="Documento anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                
                <Button variant="outline" size="sm" onClick={onNext}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Preview */}
      <div className="flex-1 bg-muted p-4">
        <div className="h-full bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          {document.fileName.toLowerCase().endsWith(".pdf") ? (
            <iframe
              src={`/api/documents/${document.id}/view`}
              className="w-full h-full border-0"
              title={document.originalName}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <img
                src={`/api/documents/${document.id}/view`}
                alt={document.originalName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Validation Panel Component
function ValidationPanel({
  document,
  postulant,
  onApprove,
  onReject,
  onRevertStatus,
  submitting,
  comments,
  onCommentsChange,
  showRejectionForm,
  rejectionReason,
  onRejectionReasonChange,
  onConfirmReject,
  onCancelReject,
}: {
  document: Document | null;
  postulant: PostulantInfo;
  onApprove: () => void;
  onReject: () => void;
  onRevertStatus: () => void;
  submitting: boolean;
  comments: string;
  onCommentsChange: (value: string) => void;
  showRejectionForm: boolean;
  rejectionReason: string;
  onRejectionReasonChange: (value: string) => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
}) {
  if (!document) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Selecciona un documento para validar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Previous Validation Info - Only if exists */}
      {(document.validatedBy ||
        document.comments ||
        document.rejectionReason) && (
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Validación Anterior
          </h3>

          <div className="space-y-3">
            {document.validatedBy && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Validado por:
                </div>
                <div className="text-sm text-card-foreground">
                  {document.validatedBy}
                </div>
              </div>
            )}

            {document.validatedAt && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Fecha:
                </div>
                <div className="text-sm text-card-foreground">
                  {new Date(document.validatedAt).toLocaleString("es-ES")}
                </div>
              </div>
            )}

            {document.rejectionReason && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Motivo de rechazo:
                </div>
                <div className="text-sm text-red-700 dark:text-red-400">
                  {document.rejectionReason}
                </div>
              </div>
            )}

            {document.comments && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Comentarios:
                </div>
                <div className="text-sm text-card-foreground">
                  {document.comments}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Actions */}
      <div className="flex-1 p-6">
        {document.validationStatus === "PENDING" ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-card-foreground">
              Acciones de Validación
            </h3>

            {!showRejectionForm ? (
              <>
                {/* Comments */}
                <div>
                  <label className="text-sm font-medium text-card-foreground mb-2 block">
                    Comentarios (opcional):
                  </label>
                  <Textarea
                    placeholder="Agregue comentarios sobre el documento..."
                    value={comments}
                    onChange={(e) => onCommentsChange(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={onApprove}
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="lg"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {submitting ? "Aprobando..." : "Aprobar Documento (A)"}
                  </Button>

                  <Button
                    onClick={onReject}
                    disabled={submitting}
                    variant="destructive"
                    className="w-full"
                    size="lg"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Rechazar Documento (R)
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Rejection Form */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-card-foreground mb-2 block">
                      Motivo del rechazo:
                    </label>
                    <Select
                      value={rejectionReason}
                      onValueChange={onRejectionReasonChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar motivo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REJECTION_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-card-foreground mb-2 block">
                      Comentarios adicionales (opcional):
                    </label>
                    <Textarea
                      placeholder="Proporcione detalles específicos sobre el rechazo..."
                      value={comments}
                      onChange={(e) => onCommentsChange(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={onCancelReject}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={onConfirmReject}
                      disabled={!rejectionReason.trim() || submitting}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {submitting ? "Rechazando..." : "Confirmar Rechazo"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Keyboard Shortcuts Help */}
            <KeyboardShortcutsHelp className="mt-6" />
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold text-card-foreground">
              Estado del Documento
            </h3>
            
            <div className="text-center py-6">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-4 ${
                  document.validationStatus === "APPROVED"
                    ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                }`}
              >
                {document.validationStatus === "APPROVED" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {document.validationStatus === "APPROVED"
                    ? "Documento Aprobado"
                    : "Documento Rechazado"}
                </span>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Este documento ya ha sido validado
              </p>
              
              <Button
                onClick={onRevertStatus}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Revertir a Pendiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
