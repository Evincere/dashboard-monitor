'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircleIcon, XCircleIcon, MessageCircleIcon, LoaderIcon } from 'lucide-react';

interface DocumentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  required: number;
  list: { id: string; fileName: string; status: string; }[];
}

// Tipo para los tamaños de botón soportados
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

// Constante para el tamaño de botón usado en el componente
const BUTTON_SIZE: ButtonSize = 'sm';

/**
 * @fileOverview Componente ValidationDecision para aprobar/rechazar postulaciones
 */

interface ValidationDecisionProps {
  /** Datos del postulante */
  postulant: {
    user: {
      id: string;
      name: string;
      dni?: string;
    };
    documents: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      list: Array<{
        id: string;
        fileName: string;
        status: string;
      }>;
    };
    validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL';
  };
  /** Nombre del validador actual */
  validatedBy: string;
  /** Callback cuando se aprueba */
  onApprove: (data: { comments?: string; documentIds?: string[]; approveAll?: boolean }) => Promise<void>;
  /** Callback cuando se rechaza */
  onReject: (data: { reason: string; comments?: string; documentIds?: string[]; rejectAll?: boolean }) => Promise<void>;
  /** Callback cuando se agrega un comentario */
  onComment: (data: { comment: string; commentType: string }) => Promise<void>;
  /** Indica si hay una operación en curso */
  loading?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

type DecisionMode = 'approve' | 'reject' | 'comment' | null;

const REJECTION_REASONS = [
  'Documento ilegible o de mala calidad',
  'Documento incompleto',
  'Documento no corresponde al tipo requerido',
  'Información inconsistente',
  'Documento vencido',
  'Falta información requerida',
  'Otro (especificar en comentarios)'
];

const COMMENT_TYPES = [
  { value: 'OBSERVATION', label: 'Observación' },
  { value: 'NOTE', label: 'Nota administrativa' },
  { value: 'ALERT', label: 'Alerta' },
  { value: 'REMINDER', label: 'Recordatorio' }
];

export default function ValidationDecision({
  postulant,
  validatedBy,
  onApprove,
  onReject,
  onComment,
  loading = false,
  className = ''
}: ValidationDecisionProps) {
  const [decisionMode, setDecisionMode] = useState<DecisionMode>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [comments, setComments] = useState('');
  const [commentType, setCommentType] = useState('OBSERVATION');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingDocuments = postulant.documents.list.filter(doc => doc.status === 'PENDING');
  const hasDocumentsToValidate = pendingDocuments.length > 0;

  // Función para manejar la selección de documentos
  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  // Función para seleccionar todos los documentos pendientes
  const selectAllPendingDocuments = () => {
    setSelectedDocuments(pendingDocuments.map(doc => doc.id));
  };

  // Función para limpiar selección
  const clearSelection = () => {
    setSelectedDocuments([]);
  };

  // Función para manejar aprobación
  const handleApprove = async () => {
    if (!hasDocumentsToValidate) return;

    setIsSubmitting(true);
    try {
      await onApprove({
        comments: comments.trim() || undefined,
        documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
        approveAll: selectedDocuments.length === 0 || selectedDocuments.length === pendingDocuments.length
      });

      // Limpiar formulario
      setDecisionMode(null);
      setSelectedDocuments([]);
      setComments('');
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para manejar rechazo
  const handleReject = async () => {
    if (!rejectionReason.trim()) return;

    setIsSubmitting(true);
    try {
      await onReject({
        reason: rejectionReason,
        comments: comments.trim() || undefined,
        documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
        rejectAll: selectedDocuments.length === 0 || selectedDocuments.length === pendingDocuments.length
      });

      // Limpiar formulario
      setDecisionMode(null);
      setSelectedDocuments([]);
      setRejectionReason('');
      setComments('');
    } catch (error) {
      console.error('Error rejecting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para manejar comentario
  const handleComment = async () => {
    if (!comments.trim()) return;

    setIsSubmitting(true);
    try {
      await onComment({
        comment: comments,
        commentType
      });

      // Limpiar formulario
      setDecisionMode(null);
      setComments('');
      setCommentType('OBSERVATION');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para cancelar operación
  const handleCancel = () => {
    setDecisionMode(null);
    setSelectedDocuments([]);
    setRejectionReason('');
    setComments('');
    setCommentType('OBSERVATION');
  };

  const canSubmit = () => {
    if (decisionMode === 'approve') return true;
    if (decisionMode === 'reject') return rejectionReason.trim().length > 0;
    if (decisionMode === 'comment') return comments.trim().length > 0;
    return false;
  };

  return (
    <Card className={`validation-decision ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Decisión de Validación</span>
          <Badge
            variant={postulant.validationStatus === 'APPROVED' ? 'default' :
              postulant.validationStatus === 'REJECTED' ? 'destructive' : 'secondary'}
          >
            {postulant.validationStatus === 'APPROVED' ? 'Aprobado' :
              postulant.validationStatus === 'REJECTED' ? 'Rechazado' :
                postulant.validationStatus === 'PARTIAL' ? 'Parcial' : 'Pendiente'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Información del postulante */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Postulante: {postulant.user.name}</h4>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>DNI: {postulant.user.dni}</div>
            <div>Docs. Obligatorios: 7</div>
            <div className="text-green-600">Aprobados: {postulant.documents.approved}</div>
            <div className="text-blue-600">Pendientes: {postulant.documents.pending}</div>
            <div className="text-red-600">Rechazados: {postulant.documents.rejected}</div>
          </div>
        </div>

        {/* Botones principales de decisión */}
        {!decisionMode && (
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => setDecisionMode('approve')}
              disabled={!hasDocumentsToValidate || loading}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              Aprobar
            </Button>

            <Button
              onClick={() => setDecisionMode('reject')}
              disabled={!hasDocumentsToValidate || loading}
              variant="destructive"
              size="sm"
            >
              <XCircleIcon className="w-4 h-4 mr-1" />
              Rechazar
            </Button>

            <Button
              onClick={() => setDecisionMode('comment')}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <MessageCircleIcon className="w-4 h-4 mr-1" />
              Comentar
            </Button>
          </div>
        )}

        {/* Formulario de aprobación */}
        {decisionMode === 'approve' && (
          <div className="space-y-3 border-l-4 border-green-500 pl-4">
            <h4 className="font-medium text-green-800">Aprobar documentos</h4>

            {pendingDocuments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Documentos a aprobar:</label>
                  <div className="space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size={BUTTON_SIZE}
                      onClick={selectAllPendingDocuments}
                    >
                      Seleccionar todos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size={BUTTON_SIZE}
                      onClick={clearSelection}
                    >
                      Limpiar
                    </Button>
                  </div>
                </div>

                <div className="max-h-32 overflow-y-auto space-y-1">
                  {pendingDocuments.map(doc => (
                    <label key={doc.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="rounded"
                      />
                      <span className="truncate">{doc.fileName}</span>
                    </label>
                  ))}
                </div>

                {selectedDocuments.length === 0 && (
                  <p className="text-xs text-gray-600">Se aprobarán todos los documentos pendientes</p>
                )}
              </div>
            )}

            <Textarea
              placeholder="Comentarios (opcional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Formulario de rechazo */}
        {decisionMode === 'reject' && (
          <div className="space-y-3 border-l-4 border-red-500 pl-4">
            <h4 className="font-medium text-red-800">Rechazar documentos</h4>

            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo del rechazo:</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                required
              >
                <option value="">Seleccionar motivo...</option>
                {REJECTION_REASONS.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            {pendingDocuments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Documentos a rechazar:</label>
                  <div className="space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size={BUTTON_SIZE}
                      onClick={selectAllPendingDocuments}
                    >
                      Seleccionar todos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size={BUTTON_SIZE}
                      onClick={clearSelection}
                    >
                      Limpiar
                    </Button>
                  </div>
                </div>

                <div className="max-h-32 overflow-y-auto space-y-1">
                  {pendingDocuments.map(doc => (
                    <label key={doc.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="rounded"
                      />
                      <span className="truncate">{doc.fileName}</span>
                    </label>
                  ))}
                </div>

                {selectedDocuments.length === 0 && (
                  <p className="text-xs text-gray-600">Se rechazarán todos los documentos pendientes</p>
                )}
              </div>
            )}

            <Textarea
              placeholder="Comentarios adicionales (opcional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Formulario de comentario */}
        {decisionMode === 'comment' && (
          <div className="space-y-3 border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium text-blue-800">Agregar comentario</h4>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de comentario:</label>
              <select
                value={commentType}
                onChange={(e) => setCommentType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                {COMMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <Textarea
              placeholder="Escribir comentario..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              required
            />
          </div>
        )}

        {/* Botones de acción */}
        {decisionMode && (
          <div className="flex space-x-2 pt-2 border-t">
            <Button
              onClick={
                decisionMode === 'approve' ? handleApprove :
                  decisionMode === 'reject' ? handleReject :
                    handleComment
              }
              disabled={!canSubmit() || isSubmitting}
              className={
                decisionMode === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  decisionMode === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-blue-600 hover:bg-blue-700'
              }
              size="sm"
            >
              {isSubmitting ? (
                <LoaderIcon className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                decisionMode === 'approve' ? <CheckCircleIcon className="w-4 h-4 mr-1" /> :
                  decisionMode === 'reject' ? <XCircleIcon className="w-4 h-4 mr-1" /> :
                    <MessageCircleIcon className="w-4 h-4 mr-1" />
              )}
              {decisionMode === 'approve' ? 'Aprobar' :
                decisionMode === 'reject' ? 'Rechazar' :
                  'Agregar comentario'}
            </Button>

            <Button
              onClick={handleCancel}
              disabled={isSubmitting}
              variant="outline"
              size="sm"
            >
              Cancelar
            </Button>
          </div>
        )}

        {/* Información del validador */}
        <div className="text-xs text-gray-500 border-t pt-2">
          Validador: {validatedBy}
        </div>
      </CardContent>
    </Card>
  );
}
