import React from 'react';
import { Calendar, CheckCircle, Clock, User, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyboardShortcutsHelp } from '@/components/validation/KeyboardShortcuts';
import { ValidationPanelProps, REJECTION_REASONS } from '../types';

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  document,
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
}) => {
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
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-4 ${document.validationStatus === "APPROVED"
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
};

export default ValidationPanel;
