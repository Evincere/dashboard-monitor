"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  User,
  FileText,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentTypeBadge } from "@/components/ui/document-type-badge";

interface DocumentData {
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

interface DocumentViewerProps {
  document: DocumentData;
  postulantInfo: PostulantInfo;
  onClose: () => void;
  onApprove: (reason?: string) => void;
  onReject: (reason: string) => void;
  className?: string;
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

export default function DocumentViewer({
  document,
  postulantInfo,
  onClose,
  onApprove,
  onReject,
  className = "",
}: DocumentViewerProps) {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onApprove(comments.trim() || undefined);
      setShowApprovalDialog(false);
      setComments("");
    } catch (error) {
      console.error("Error approving document:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;

    setSubmitting(true);
    try {
      const fullReason = comments.trim()
        ? `${rejectionReason}. ${comments}`
        : rejectionReason;

      await onReject(fullReason);
      setShowRejectionDialog(false);
      setRejectionReason("");
      setComments("");
    } catch (error) {
      console.error("Error rejecting document:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = document.originalName || document.fileName;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error downloading document:", error);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          icon: (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ),
          color:
            "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
          text: "Aprobado",
        };
      case "REJECTED":
        return {
          icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
          color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
          text: "Rechazado",
        };
      default:
        return {
          icon: (
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ),
          color:
            "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
          text: "Pendiente",
        };
    }
  };

  const statusDisplay = getStatusDisplay(document.validationStatus);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <DialogTitle className="sr-only">
          Validación de Documento - {document.originalName || document.fileName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Visualización y validación del documento {document.documentType} del
          postulante {postulantInfo.user.fullName} (DNI:{" "}
          {postulantInfo.user.dni})
        </DialogDescription>
        <div className="grid grid-cols-4 h-full">
          {/* Left Panel - Document Info and Actions */}
          <div className="col-span-1 border-r bg-muted/30 border-border overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  Validación de Documento
                </h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Document Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Información del Documento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Nombre:
                    </div>
                    <div className="text-sm text-foreground break-words">
                      {document.originalName || document.fileName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Tipo:
                    </span>
                    <DocumentTypeBadge
                      documentType={document.documentType}
                      variant="compact"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Estado:
                    </span>
                    <Badge className={statusDisplay.color}>
                      {statusDisplay.icon}
                      <span className="ml-1">{statusDisplay.text}</span>
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Obligatorio:
                    </span>
                    <Badge
                      variant={document.isRequired ? "destructive" : "outline"}
                    >
                      {document.isRequired ? "Sí" : "No"}
                    </Badge>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Subido:
                    </div>
                    <div className="text-sm text-muted-foreground/80">
                      {new Date(document.uploadDate).toLocaleString("es-ES")}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Tamaño:
                    </div>
                    <div className="text-sm text-muted-foreground/80">
                      {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Postulant Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Información del Postulante
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Nombre:
                    </div>
                    <div className="text-sm text-foreground">
                      {postulantInfo.user.fullName}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      DNI:
                    </div>
                    <div className="text-sm text-foreground">
                      {postulantInfo.user.dni}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Email:
                    </div>
                    <div className="text-sm text-foreground break-words">
                      {postulantInfo.user.email}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Concurso:
                    </div>
                    <div className="text-sm text-foreground">
                      {postulantInfo.contest.position}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Circunscripción:
                    </div>
                    <div className="text-sm text-foreground">
                      {postulantInfo.inscription.centroDeVida}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Previous Validation Info */}
              {(document.validatedBy ||
                document.comments ||
                document.rejectionReason) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Validación Anterior
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {document.validatedBy && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Validado por:
                        </div>
                        <div className="text-sm text-foreground">
                          {document.validatedBy}
                        </div>
                      </div>
                    )}

                    {document.validatedAt && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Fecha:
                        </div>
                        <div className="text-sm text-foreground">
                          {new Date(document.validatedAt).toLocaleString(
                            "es-ES"
                          )}
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
                        <div className="text-sm text-foreground">
                          {document.comments}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {document.validationStatus === "PENDING" && (
                <div className="space-y-3">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => setShowApprovalDialog(true)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprobar Documento
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowRejectionDialog(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar Documento
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            </div>
          </div>

          {/* Right Panel - Document Viewer */}
          <div className="col-span-3 flex flex-col">
            {/* Viewer Controls */}
            <div className="border-b p-4 bg-background border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.max(25, zoom - 25))}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium px-2">{zoom}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-6 bg-border mx-2"></div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((rotation + 90) % 360)}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(100)}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  {document.originalName || document.fileName}
                </div>
              </div>
            </div>

            {/* Document Preview */}
            <div className="flex-1 bg-muted/20 flex items-center justify-center overflow-auto p-4">
              <div
                className="bg-background shadow-lg border border-border"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center",
                }}
              >
                {document.fileName.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={`/api/documents/${document.id}/view`}
                    className="w-[800px] h-[1000px] border-0"
                    title={document.originalName}
                  />
                ) : (
                  <img
                    src={`/api/documents/${document.id}/view`}
                    alt={document.originalName}
                    className="max-w-[800px] max-h-[1000px] object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Documento</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea aprobar este documento?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Comentarios (opcional):
              </label>
              <Textarea
                placeholder="Agregue comentarios sobre la aprobación..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={submitting}>
              <CheckCircle className="w-4 h-4 mr-2" />
              {submitting ? "Aprobando..." : "Aprobar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Documento</DialogTitle>
            <DialogDescription>
              Seleccione el motivo del rechazo y agregue comentarios si es
              necesario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo del rechazo:</label>
              <Select
                value={rejectionReason}
                onValueChange={setRejectionReason}
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
              <label className="text-sm font-medium">
                Comentarios adicionales (opcional):
              </label>
              <Textarea
                placeholder="Proporcione detalles específicos sobre el rechazo..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectionDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || submitting}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {submitting ? "Rechazando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
