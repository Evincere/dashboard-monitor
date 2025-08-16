'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircleIcon, XCircleIcon, ClockIcon, AlertTriangleIcon } from 'lucide-react';

/**
 * @fileOverview Componente PostulantCard para mostrar información resumida de un postulante
 */

interface PostulantCardProps {
  postulant: {
    user: {
      id: string;
      name: string;
      username: string;
      email: string;
      dni?: string;
      status: string;
    };
    inscription: {
      id: string;
      status: string;
      currentStep: string;
      centroDeVida: string;
      documentosCompletos: boolean;
      createdAt: string;
    };
    documents: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    };
    validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    circunscripcion?: {
      code: string;
      name: string;
      region: string;
    };
  };
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

// Función para obtener el color y icono según el estado de validación
function getValidationStatusDisplay(status: string) {
  switch (status) {
    case 'APPROVED':
      return {
        color: 'bg-green-100/80 text-green-800 border-green-300/70 dark:bg-green-900/50 dark:text-green-100 dark:border-green-600/50',
        icon: <CheckCircleIcon className="w-4 h-4" />,
        text: 'Aprobado'
      };
    case 'REJECTED':
      return {
        color: 'bg-red-100/80 text-red-800 border-red-300/70 dark:bg-red-900/50 dark:text-red-100 dark:border-red-600/50',
        icon: <XCircleIcon className="w-4 h-4" />,
        text: 'Rechazado'
      };
    case 'PARTIAL':
      return {
        color: 'bg-amber-100/80 text-amber-800 border-amber-300/70 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-600/50',
        icon: <AlertTriangleIcon className="w-4 h-4" />,
        text: 'Parcial'
      };
    default:
      return {
        color: 'bg-blue-100/80 text-blue-800 border-blue-300/70 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-600/50',
        icon: <ClockIcon className="w-4 h-4" />,
        text: 'Pendiente'
      };
  }
}

// Función para obtener el color del estado de inscripción
function getInscriptionStatusColor(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100/80 text-green-800 dark:bg-green-900/50 dark:text-green-100';
    case 'COMPLETED_WITH_DOCS':
      return 'bg-blue-100/80 text-blue-800 dark:bg-blue-900/50 dark:text-blue-100';
    case 'ACTIVE':
      return 'bg-slate-100/80 text-slate-800 dark:bg-slate-800/50 dark:text-slate-100';
    case 'REJECTED':
      return 'bg-red-100/80 text-red-800 dark:bg-red-900/50 dark:text-red-100';
    default:
      return 'bg-slate-100/80 text-slate-800 dark:bg-slate-800/50 dark:text-slate-100';
  }
}

export default function PostulantCard({
  postulant,
  onClick,
  selected = false,
  className = ''
}: PostulantCardProps) {
  const { user, inscription, documents, validationStatus } = postulant;
  const validationDisplay = getValidationStatusDisplay(validationStatus);
  const inscriptionStatusColor = getInscriptionStatusColor(inscription.status);

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected ? 'ring-2 ring-blue-500 shadow-md' : ''
      } ${className}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 text-sm leading-5">
              {user.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              DNI: {user.dni || user.username}
            </p>
            <p className="text-xs text-gray-500">
              {user.email}
            </p>
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${validationDisplay.color}`}>
              {validationDisplay.icon}
              <span>{validationDisplay.text}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Circunscripción */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Circunscripción:</span>
            <Badge variant="outline" className="text-xs">
              {inscription.centroDeVida}
            </Badge>
          </div>

          {/* Estado de inscripción */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Estado:</span>
            <span className={`px-2 py-1 rounded-full text-xs ${inscriptionStatusColor}`}>
              {inscription.status}
            </span>
          </div>

          {/* Estadísticas de documentos */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Documentos:</span>
              <span className="text-xs font-medium">{documents.total} total</span>
            </div>
            
            <div className="flex space-x-2">
              {documents.approved > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-700">{documents.approved}</span>
                </div>
              )}
              
              {documents.pending > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-blue-700">{documents.pending}</span>
                </div>
              )}
              
              {documents.rejected > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-red-700">{documents.rejected}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progreso visual */}
          {documents.total > 0 && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-green-500 h-1.5 rounded-full" 
                  style={{ 
                    width: `${(documents.approved / documents.total) * 100}%` 
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                {Math.round((documents.approved / documents.total) * 100)}% validado
              </div>
            </div>
          )}

          {/* Fecha de inscripción */}
          <div className="text-xs text-gray-400 text-center border-t pt-2">
            Inscrito: {new Date(inscription.createdAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
