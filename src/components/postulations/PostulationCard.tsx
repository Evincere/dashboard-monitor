"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Mail,
  Calendar,
  FileText,
  Target,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { DocumentTypeBadge } from "@/components/ui/document-type-badge";

interface PostulationCardProps {
  postulation: {
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
    validationStatus: "PENDING" | "PARTIAL" | "COMPLETED" | "REJECTED";
    priority: "HIGH" | "MEDIUM" | "LOW";
    completionPercentage: number;
  };
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

// Función para obtener el icono y color según el estado de validación
function getValidationStatusDisplay(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        badgeColor:
          "bg-emerald-100/80 text-emerald-800 border-emerald-300/70 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border-emerald-600/50",
        icon: (
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        ),
        text: "Completado",
        description: "Todos los documentos aprobados",
      };
    case "REJECTED":
      return {
        badgeColor:
          "bg-red-100/80 text-red-800 border-red-300/70 dark:bg-red-900/50 dark:text-red-100 dark:border-red-600/50",
        icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
        text: "Rechazado",
        description: "Documentación rechazada",
      };
    case "PARTIAL":
      return {
        badgeColor:
          "bg-amber-100/80 text-amber-800 border-amber-300/70 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-600/50",
        icon: (
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        ),
        text: "Parcial",
        description: "Validación en progreso",
      };
    default:
      return {
        badgeColor:
          "bg-blue-100/80 text-blue-800 border-blue-300/70 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-600/50",
        icon: <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
        text: "Pendiente",
        description: "Requiere validación",
      };
  }
}

// Función para obtener el color de prioridad
function getPriorityDisplay(priority: string) {
  switch (priority) {
    case "HIGH":
      return {
        color:
          "bg-red-100/80 text-red-800 border-red-300/70 dark:bg-red-900/50 dark:text-red-100 dark:border-red-600/50",
        text: "Alta",
        dot: "bg-red-500",
      };
    case "MEDIUM":
      return {
        color:
          "bg-amber-100/80 text-amber-800 border-amber-300/70 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-600/50",
        text: "Media",
        dot: "bg-amber-500",
      };
    default:
      return {
        color:
          "bg-slate-100/80 text-slate-800 border-slate-300/70 dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-600/50",
        text: "Baja",
        dot: "bg-slate-500",
      };
  }
}

// Función para obtener el color del estado de inscripción
function getInscriptionStatusColor(status: string) {
  switch (status) {
    case "COMPLETED_WITH_DOCS":
      return "bg-emerald-100/80 text-emerald-800 border-emerald-300/70 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border-emerald-600/50";
    case "ACTIVE":
      return "bg-blue-100/80 text-blue-800 border-blue-300/70 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-600/50";
    case "COMPLETED_PENDING_DOCS":
      return "bg-amber-100/80 text-amber-800 border-amber-300/70 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-600/50";
    case "REJECTED":
      return "bg-red-100/80 text-red-800 border-red-300/70 dark:bg-red-900/50 dark:text-red-100 dark:border-red-600/50";
    default:
      return "bg-slate-100/80 text-slate-800 border-slate-300/70 dark:bg-slate-800/50 dark:text-slate-100 dark:border-slate-600/50";
  }
}

// Función para formatear estado de inscripción
function formatInscriptionStatus(status: string) {
  switch (status) {
    case "COMPLETED_WITH_DOCS":
      return "Documentos Completos";
    case "ACTIVE":
      return "Activa";
    case "COMPLETED_PENDING_DOCS":
      return "Pendiente de Docs";
    case "REJECTED":
      return "Rechazada";
    default:
      return status;
  }
}

export default function PostulationCard({
  postulation,
  onClick,
  selected = false,
  className = "",
}: PostulationCardProps) {
  const {
    user,
    inscription,
    contest,
    documents,
    validationStatus,
    priority,
    completionPercentage,
  } = postulation;
  const validationDisplay = getValidationStatusDisplay(validationStatus);
  const priorityDisplay = getPriorityDisplay(priority);
  const inscriptionStatusColor = getInscriptionStatusColor(inscription.state);

  return (
    <Card
      className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        selected ? "ring-2 ring-primary shadow-xl bg-accent/20" : "hover:ring-1 hover:ring-border"
      } ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {/* Información Principal */}
          <div className="flex-1 space-y-4">
            {/* Header con información del usuario */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-muted border border-border rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-foreground text-lg truncate group-hover:text-primary transition-colors">
                      {user.fullName}
                    </h3>
                    <div
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${priorityDisplay.color}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${priorityDisplay.dot}`}
                      ></div>
                      {priorityDisplay.text}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">DNI:</span>
                      <span>{user.dni}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Mail className="w-4 h-4" />
                      <span className="truncate max-w-xs">{user.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado de Validación */}
              <div className="flex-shrink-0 ml-4">
                <div
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-sm ${validationDisplay.badgeColor}`}
                >
                  {validationDisplay.icon}
                  <div>
                    <div className="font-semibold text-sm">
                      {validationDisplay.text}
                    </div>
                    <div className="text-xs opacity-80">
                      {validationDisplay.description}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Información del concurso e inscripción */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 rounded-xl p-4 border border-border">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">
                    Concurso:
                  </span>
                  <span className="text-foreground font-medium">{contest.title}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">
                    Centro de Vida:
                  </span>
                  <span className="text-foreground font-medium">
                    {inscription.centroDeVida}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">
                    Inscrito:
                  </span>
                  <span className="text-foreground font-medium">
                    {new Date(inscription.createdAt).toLocaleDateString(
                      "es-ES"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Información de documentos y progreso */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">
                    Documentos:
                  </span>
                  <span className="text-sm text-foreground font-medium">
                    {documents.total} total • {documents.required}/7 obligatorios
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${inscriptionStatusColor}`}>
                    {formatInscriptionStatus(inscription.state)}
                  </div>
                </div>
              </div>

              {/* Estadísticas de documentos */}
              <div className="flex items-center space-x-6 text-sm">
                {documents.approved > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 dark:text-green-400 font-semibold text-sm">
                      {documents.approved} aprobados
                    </span>
                  </div>
                )}

                {documents.pending > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-700 dark:text-blue-400 font-semibold text-sm">
                      {documents.pending} pendientes
                    </span>
                  </div>
                )}

                {documents.rejected > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-700 dark:text-red-400 font-semibold text-sm">
                      {documents.rejected} rechazados
                    </span>
                  </div>
                )}
              </div>

              {/* Barra de progreso */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">
                    Progreso de validación
                  </span>
                  <span className="font-bold text-foreground">
                    {completionPercentage}%
                  </span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>

            {/* Tipos de documentos visados */}
            {documents.types && documents.types.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {documents.types.map((type, index) => {
                  const isValidated = validationStatus === 'COMPLETED' || validationStatus === 'PARTIAL';
                  return (
                    <div key={index} className="relative">
                      <DocumentTypeBadge
                        documentType={type}
                        variant="compact"
                      />
                      {/* Tilde verde para documentos visados */}
                      {isValidated && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 shadow-sm">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>

          {/* Flecha de navegación */}
          <div className="flex-shrink-0 ml-6">
            <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200 border border-transparent group-hover:border-primary/20">
              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
