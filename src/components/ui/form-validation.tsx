'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipos para los diferentes niveles de mensaje
export type ValidationLevel = 'error' | 'warning' | 'success' | 'info';

// Props para el componente de mensaje individual
interface ValidationMessageProps {
  message: string;
  level?: ValidationLevel;
  className?: string;
}

// Props para el contenedor de mensajes de validación
interface ValidationMessagesProps {
  messages: string | string[];
  level?: ValidationLevel;
  className?: string;
  showIcon?: boolean;
}

// Props para el indicador de estado del campo
interface FieldStatusProps {
  hasError?: boolean;
  isValid?: boolean;
  isRequired?: boolean;
  className?: string;
}

// Props para el wrapper del campo con validación
interface ValidatedFieldProps {
  children: React.ReactNode;
  label?: string;
  errors?: string[];
  warnings?: string[];
  success?: string;
  info?: string;
  isRequired?: boolean;
  className?: string;
  labelClassName?: string;
}

// Componente para mensaje individual
export function ValidationMessage({ 
  message, 
  level = 'error', 
  className 
}: ValidationMessageProps) {
  const levelStyles = {
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    success: 'text-green-600 dark:text-green-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  const Icon = {
    error: AlertCircle,
    warning: AlertCircle,
    success: CheckCircle,
    info: Info
  }[level];

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm",
      levelStyles[level],
      className
    )}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Componente para múltiples mensajes
export function ValidationMessages({ 
  messages, 
  level = 'error', 
  className,
  showIcon = true 
}: ValidationMessagesProps) {
  const messagesArray = Array.isArray(messages) ? messages : [messages];

  if (messagesArray.length === 0) return null;

  const levelStyles = {
    error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
    warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
    success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
    info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
  };

  return (
    <div className={cn(
      "border rounded-md p-3 space-y-2",
      levelStyles[level],
      className
    )}>
      {messagesArray.map((message, index) => (
        <ValidationMessage 
          key={index}
          message={message}
          level={level}
          className={showIcon ? '' : 'pl-6'}
        />
      ))}
    </div>
  );
}

// Indicador de estado del campo
export function FieldStatus({ 
  hasError, 
  isValid, 
  isRequired, 
  className 
}: FieldStatusProps) {
  if (hasError) {
    return (
      <AlertCircle className={cn(
        "w-5 h-5 text-red-500",
        className
      )} />
    );
  }

  if (isValid) {
    return (
      <CheckCircle className={cn(
        "w-5 h-5 text-green-500",
        className
      )} />
    );
  }

  if (isRequired) {
    return (
      <span className={cn(
        "text-red-500 font-semibold",
        className
      )}>
        *
      </span>
    );
  }

  return null;
}

// Wrapper completo para campo con validación
export function ValidatedField({
  children,
  label,
  errors = [],
  warnings = [],
  success,
  info,
  isRequired = false,
  className,
  labelClassName
}: ValidatedFieldProps) {
  const hasError = errors.length > 0;
  const isValid = !hasError && !!success;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label con indicador de requerido y estado */}
      {label && (
        <div className="flex items-center justify-between">
          <label className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            hasError && "text-red-600 dark:text-red-400",
            isValid && "text-green-600 dark:text-green-400",
            labelClassName
          )}>
            {label}
            {isRequired && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          <FieldStatus 
            hasError={hasError}
            isValid={isValid}
            className="ml-2"
          />
        </div>
      )}

      {/* Campo del formulario */}
      <div className={cn(
        hasError && "ring-red-500 ring-1 rounded-md",
        isValid && "ring-green-500 ring-1 rounded-md"
      )}>
        {children}
      </div>

      {/* Mensajes de validación */}
      <div className="space-y-2">
        {/* Errores */}
        {errors.length > 0 && (
          <ValidationMessages 
            messages={errors}
            level="error"
          />
        )}

        {/* Advertencias */}
        {warnings.length > 0 && (
          <ValidationMessages 
            messages={warnings}
            level="warning"
          />
        )}

        {/* Mensaje de éxito */}
        {success && !hasError && (
          <ValidationMessage 
            message={success}
            level="success"
          />
        )}

        {/* Información adicional */}
        {info && !hasError && (
          <ValidationMessage 
            message={info}
            level="info"
          />
        )}
      </div>
    </div>
  );
}

// Hook personalizado para manejar errores de validación
export function useFieldValidation(fieldName: string, validationErrors: Record<string, string[]>) {
  const errors = validationErrors[fieldName] || [];
  const hasError = errors.length > 0;

  return {
    errors,
    hasError,
    errorMessage: errors[0] || '',
    allErrors: errors
  };
}

// Componente de resumen de errores para todo el formulario
interface FormSummaryProps {
  errors: Record<string, string[]>;
  className?: string;
  title?: string;
}

export function FormValidationSummary({ 
  errors, 
  className,
  title = "Por favor, corrige los siguientes errores:"
}: FormSummaryProps) {
  const errorEntries = Object.entries(errors).filter(([, msgs]) => msgs.length > 0);
  
  if (errorEntries.length === 0) return null;

  return (
    <div className={cn(
      "border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 rounded-md p-4",
      className
    )}>
      <h3 className="text-red-800 dark:text-red-200 font-semibold text-sm mb-3 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {title}
      </h3>
      <ul className="space-y-2">
        {errorEntries.map(([field, fieldErrors]) => (
          <li key={field} className="text-sm text-red-700 dark:text-red-300">
            <span className="font-medium capitalize">{field.replace('_', ' ')}:</span>
            <ul className="ml-4 mt-1 space-y-1">
              {fieldErrors.map((error, index) => (
                <li key={index} className="list-disc list-inside">
                  {error}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Componente de indicador de campos requeridos
export function RequiredFieldsNote({ className }: { className?: string }) {
  return (
    <p className={cn(
      "text-sm text-muted-foreground flex items-center gap-1",
      className
    )}>
      <span className="text-red-500">*</span>
      Campos obligatorios
    </p>
  );
}
