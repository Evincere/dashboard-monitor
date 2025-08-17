'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  MapPin,
  FileText,
  Mail,
  Phone,
  Copy,
  Send,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  fileName: string;
  originalName: string;
  documentType: string;
  validationStatus: "PENDING" | "APPROVED" | "REJECTED";
  isRequired: boolean;
  rejectionReason?: string;
  comments?: string;
}

interface PostulantInfo {
  user: {
    dni: string;
    fullName: string;
    email: string;
    telefono?: string;
  };
  inscription: {
    state: string;
    centroDeVida: string;
    createdAt: string;
  };
  contest: {
    id: number;
    title: string;
    category: string;
    position: string;
    department: string;
    contestClass: string;
    status: string;
    statusDescription: string;
    inscriptionStartDate: string;
    inscriptionEndDate: string;
    dependency?: string;
    location?: string;
  };
}

interface ValidationCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: Document[];
  postulant: PostulantInfo;
  onApprovePostulation: () => void;
  onRejectPostulation: () => void;
  onInitiateValidation?: () => void; // Nueva función para iniciar validación
  onGenerateEmailTemplate: (emailContent: string) => void;
  onNextPostulation: () => void;
}

export default function ValidationCompletionModal({
  open,
  onOpenChange,
  documents,
  postulant,
  onApprovePostulation,
  onRejectPostulation,
  onInitiateValidation,
  onGenerateEmailTemplate,
  onNextPostulation,
}: ValidationCompletionModalProps) {
  const { toast } = useToast();
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [customEmailContent, setCustomEmailContent] = useState("");

  // Calculate validation statistics
  const requiredDocs = documents.filter(doc => doc.isRequired);
  const approvedRequiredDocs = requiredDocs.filter(doc => doc.validationStatus === "APPROVED");
  const rejectedRequiredDocs = requiredDocs.filter(doc => doc.validationStatus === "REJECTED");
  const pendingRequiredDocs = requiredDocs.filter(doc => doc.validationStatus === "PENDING");
  
  // Diferentes criterios para "completado"
  const allRequiredApproved = requiredDocs.length > 0 && approvedRequiredDocs.length === requiredDocs.length;
  const allRequiredValidated = requiredDocs.length > 0 && pendingRequiredDocs.length === 0; // Aprobados O rechazados, no pendientes
  const hasRejectedRequired = rejectedRequiredDocs.length > 0;
  
  console.log('📊 Modal validation stats:', {
    requiredDocs: requiredDocs.length,
    approved: approvedRequiredDocs.length,
    rejected: rejectedRequiredDocs.length,
    pending: pendingRequiredDocs.length,
    allRequiredApproved,
    allRequiredValidated,
    inscriptionState: postulant.inscription.state
  });
  
  // Check inscription state - simplified flow
  const inscriptionState = postulant.inscription.state;
  const isReadyToInitiateValidation = inscriptionState === 'COMPLETED_WITH_DOCS' && !allRequiredValidated;
  const canMakeFinalDecision = inscriptionState === 'COMPLETED_WITH_DOCS' || inscriptionState === 'PENDING';
  
  // Si todos los documentos obligatorios están validados (aprobados o rechazados), permitir decisión final
  const showDirectApproval = allRequiredApproved && canMakeFinalDecision;
  const canDecide = allRequiredValidated && canMakeFinalDecision && !showDirectApproval;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const generateEmailTemplate = () => {
    const rejectedDocsList = rejectedRequiredDocs.map(doc => 
      `- ${doc.documentType}: ${doc.rejectionReason || 'Motivo no especificado'}`
    ).join('\n');

    const template = `Estimado/a ${postulant.user.fullName},

Espero que se encuentre bien. Me dirijo a usted en relación a su postulación para el concurso "${postulant.contest.title}" - ${postulant.contest.category}.

Después de revisar su documentación, hemos identificado que algunos documentos requieren ser corregidos y vueltos a subir:

${rejectedDocsList}

Para continuar con el proceso de evaluación, le solicitamos que:

1. Revise los documentos mencionados
2. Corrija los aspectos indicados
3. Vuelva a subir los documentos corregidos a través del sistema

Datos de su postulación:
- Nombre completo: ${postulant.user.fullName}
- DNI: ${postulant.user.dni}${postulant.user.telefono ? `\n- Teléfono: ${postulant.user.telefono}` : ''}
- Email: ${postulant.user.email}
- Fecha de inscripción: ${formatDate(postulant.inscription.createdAt)}
- Circunscripción: ${postulant.inscription.centroDeVida}

Agradecemos su comprensión y quedamos a su disposición para cualquier consulta.

Saludos cordiales,
Equipo de Validación de Documentos`;

    return template;
  };

  const handleCopyEmailTemplate = () => {
    const template = generateEmailTemplate();
    navigator.clipboard.writeText(template);
    toast({
      title: "Plantilla copiada",
      description: "La plantilla del correo electrónico ha sido copiada al portapapeles",
    });
  };

  const handleGenerateAndSendEmail = () => {
    const finalTemplate = customEmailContent.trim() || generateEmailTemplate();
    onGenerateEmailTemplate(finalTemplate);
    setShowEmailTemplate(false);
    setCustomEmailContent("");
    toast({
      title: "Plantilla generada",
      description: "Se ha generado la plantilla del correo electrónico",
    });
  };

  if (showEmailTemplate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Plantilla de Correo Electrónico
            </DialogTitle>
            <DialogDescription>
              Revise y personalice la plantilla del correo para {postulant.user.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Plantilla del correo:
              </label>
              <Textarea
                value={customEmailContent || generateEmailTemplate()}
                onChange={(e) => setCustomEmailContent(e.target.value)}
                rows={20}
                className="font-mono text-sm"
                placeholder="Personalice el contenido del correo electrónico..."
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Datos del Postulante
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Nombre:</strong> {postulant.user.fullName}</div>
                <div><strong>DNI:</strong> {postulant.user.dni}</div>
                <div><strong>Email:</strong> {postulant.user.email}</div>
                {postulant.user.telefono && (
                  <div><strong>Teléfono:</strong> {postulant.user.telefono}</div>
                )}
                <div><strong>Circunscripción:</strong> {postulant.inscription.centroDeVida}</div>
                <div><strong>Fecha inscripción:</strong> {formatDate(postulant.inscription.createdAt)}</div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEmailTemplate(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyEmailTemplate}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar Plantilla
            </Button>
            <Button
              onClick={handleGenerateAndSendEmail}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Generar y Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Validación de Documentación Completa
          </DialogTitle>
          <DialogDescription>
            Se ha completado la validación de todos los documentos obligatorios para este postulante
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Postulant Information */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Postulante
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Nombre completo:</div>
                <div className="font-medium">{postulant.user.fullName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">DNI:</div>
                <div className="font-medium">{postulant.user.dni}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email:</div>
                <div className="font-medium">{postulant.user.email}</div>
              </div>
              {postulant.user.telefono && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Teléfono:</div>
                  <div className="font-medium">{postulant.user.telefono}</div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-muted-foreground">Circunscripción:</div>
                <div className="font-medium">{postulant.inscription.centroDeVida}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Fecha de inscripción:</div>
                <div className="font-medium">{formatDate(postulant.inscription.createdAt)}</div>
              </div>
            </div>
          </div>

          {/* Contest Information */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Información del Concurso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Título:</div>
                <div className="font-medium">{postulant.contest.title}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Categoría:</div>
                <div className="font-medium">{postulant.contest.category}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Posición:</div>
                <div className="font-medium">{postulant.contest.position}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Departamento:</div>
                <div className="font-medium">{postulant.contest.department}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Clase:</div>
                <div className="font-medium">{postulant.contest.contestClass}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Estado:</div>
                <div className="font-medium">{postulant.contest.statusDescription}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Periodo de Inscripciones:</div>
                <div className="font-medium text-sm">
                  {formatDate(postulant.contest.inscriptionStartDate)} - {formatDate(postulant.contest.inscriptionEndDate)}
                </div>
              </div>
              {postulant.contest.dependency && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Dependencia:</div>
                  <div className="font-medium">{postulant.contest.dependency}</div>
                </div>
              )}
            </div>
          </div>

          {/* Document Status Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Estado de la Documentación Obligatoria
            </h3>
            
            <div className="space-y-2">
              {requiredDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-background rounded">
                  <div className="flex items-center gap-2">
                    {doc.validationStatus === "APPROVED" ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : doc.validationStatus === "REJECTED" ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className="text-sm font-medium">{doc.documentType}</span>
                  </div>
                  <Badge 
                    variant={
                      doc.validationStatus === "APPROVED" 
                        ? "default" 
                        : doc.validationStatus === "REJECTED" 
                        ? "destructive" 
                        : "secondary"
                    }
                  >
                    {doc.validationStatus === "APPROVED" ? "Aprobado" : 
                     doc.validationStatus === "REJECTED" ? "Rechazado" : "Pendiente"}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                {allRequiredApproved ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-semibold">
                  {allRequiredApproved ? "Documentación Completa y Aprobada" : "Documentación con Rechazos"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {approvedRequiredDocs.length} de {requiredDocs.length} documentos obligatorios aprobados
                {hasRejectedRequired && ` • ${rejectedRequiredDocs.length} rechazados`}
              </p>
            </div>
          </div>

          {/* Rejected Documents Details (if any) */}
          {hasRejectedRequired && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-700 dark:text-red-400">
                <XCircle className="w-5 h-5" />
                Documentos Rechazados
              </h3>
              <div className="space-y-2">
                {rejectedRequiredDocs.map((doc) => (
                  <div key={doc.id} className="bg-background p-3 rounded border">
                    <div className="font-medium text-sm">{doc.documentType}</div>
                    {doc.rejectionReason && (
                      <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                        <strong>Motivo:</strong> {doc.rejectionReason}
                      </div>
                    )}
                    {doc.comments && (
                      <div className="text-sm text-muted-foreground mt-1">
                        <strong>Comentarios:</strong> {doc.comments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          
          {/* CASO 1: Todos los documentos están aprobados - Permitir aprobación directa */}
          {showDirectApproval ? (
            <Button
              onClick={onApprovePostulation}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Aprobar y Continuar con Siguiente
            </Button>
          
          /* CASO 2: No todos aprobados pero sí validados - Mostrar opciones basadas en estado */
          ) : canDecide ? (
            <>
              {/* Si todos están aprobados, solo mostrar aprobar */}
              {allRequiredApproved ? (
                <Button
                  onClick={onApprovePostulation}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprobar y Continuar
                </Button>
              ) : hasRejectedRequired ? (
                /* Si hay documentos rechazados, mostrar opciones de rechazo */
                <>
                  <Button
                    onClick={() => setShowEmailTemplate(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Generar Email
                  </Button>
                  <Button
                    onClick={onRejectPostulation}
                    variant="destructive"
                    className="gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar y Continuar
                  </Button>
                </>
              ) : null}
            </>
          
          /* CASO 3: Estado COMPLETED_WITH_DOCS sin documentos validados */
          ) : isReadyToInitiateValidation && onInitiateValidation ? (
            <Button
              onClick={onInitiateValidation}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Iniciar Proceso de Validación
            </Button>
          
          /* CASO 4: Estado no válido o no manejado */
          ) : null}
          
          {/* Estado no válido para acción */}
          {!showDirectApproval && !isReadyToInitiateValidation && !canMakeFinalDecision && (
            <div className="text-sm text-muted-foreground p-2">
              Estado de inscripción: {inscriptionState}
              <br />
              Esta postulación no está en un estado válido para tomar acciones.
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
