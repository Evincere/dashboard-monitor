// Validaciones del lado servidor para APIs
import { z } from 'zod';
import { NextRequest } from 'next/server';

// Esquemas de validación reutilizables
const dateSchema = z.string().datetime().transform((str) => new Date(str));
const optionalDateSchema = z.string().datetime().transform((str) => new Date(str)).optional().nullable();

// Validación de archivos
const fileValidationSchema = z.object({
  name: z.string().min(1, "El nombre del archivo es requerido"),
  size: z.number().max(10 * 1024 * 1024, "El archivo no puede superar los 10MB"),
  type: z.enum([
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ], { errorMap: () => ({ message: "Solo se permiten archivos PDF y Word" }) })
});

// Esquema de validación para crear concurso (servidor)
export const serverCreateContestSchema = z.object({
  title: z.string()
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(200, "El título no puede exceder 200 caracteres")
    .refine((title) => title.trim().length > 0, "El título no puede estar vacío")
    .refine((title) => !/[<>"'&]/.test(title), "El título contiene caracteres no permitidos"),
    
  category: z.enum([
    'FUNCIONARIOS Y PERSONAL JERÁRQUICO',
    'MAGISTRADOS',
    'EMPLEADOS'
  ]).optional(),
  
  class_: z.enum([
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'
  ]).optional(),
  
  department: z.string()
    .max(255, "El departamento no puede exceder 255 caracteres")
    .optional(),
    
  position: z.enum([
    'Defensor/a Civil',
    'Defensor/a Civil Adjunto/a',
    'Defensor/a Penal',
    'Defensor/a Penal Adjunto/a',
    'Defensor/a Penal Juvenil',
    'Defensor/a Penal Juvenil Adjunto/a',
    'Asesor/a de Incapaces',
    'Asesor/a de Incapaces Adjunto/a',
    'Codefensor/a de Familia',
    'Codefensor/a de Familia Adjunto/a',
    'Secretario/a Legal y Técnico/a',
    'Secretario/a General',
    'Jefe/a Administrativo/Contable',
    'Personal de Recursos Humanos',
    'Responsable de Informática',
    'Personal de Servicios',
    'Chófer',
    'Especialista en Desarrollo Tecnológico',
    'Auditor/a de Control de Gestión'
  ]).optional(),
  
  functions: z.string()
    .max(2000, "La descripción de funciones no puede exceder 2000 caracteres")
    .optional(),
    
  status: z.enum([
    'ACTIVE', 'ARCHIVED', 'CANCELLED', 'CLOSED', 'DRAFT', 'FINISHED',
    'IN_EVALUATION', 'PAUSED', 'RESULTS_PUBLISHED', 'SCHEDULED',
    'DOCUMENTATION_VALIDATION', 'APPLICATION_VALIDATION'
  ]),
  
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  
  inscription_start_date: z.date({
    required_error: "La fecha de inicio de inscripciones es obligatoria",
    invalid_type_error: "La fecha de inicio debe ser válida"
  }),
  
  inscription_end_date: z.date({
    required_error: "La fecha de fin de inscripciones es obligatoria",
    invalid_type_error: "La fecha de fin debe ser válida"
  }),
  
  bases_url: z.string()
    .url("La URL de las bases debe ser válida")
    .optional()
    .or(z.literal("")),
    
  description_url: z.string()
    .url("La URL de descripción debe ser válida")
    .optional()
    .or(z.literal(""))
    
}).refine((data) => {
  // Validar que inscription_end_date > inscription_start_date
  return data.inscription_end_date > data.inscription_start_date;
}, {
  message: "La fecha de fin de inscripciones debe ser posterior al inicio",
  path: ["inscription_end_date"]
}).refine((data) => {
  // Validar que end_date > start_date si ambas están definidas
  if (data.start_date && data.end_date) {
    return data.end_date > data.start_date;
  }
  return true;
}, {
  message: "La fecha de fin del concurso debe ser posterior al inicio",
  path: ["end_date"]
}).refine((data) => {
  // Validar que el concurso inicia después del fin de inscripciones
  if (data.start_date) {
    return data.start_date >= data.inscription_end_date;
  }
  return true;
}, {
  message: "El concurso debe iniciar después del fin de inscripciones",
  path: ["start_date"]
}).refine((data) => {
  // Validar que las fechas de inscripción no sean muy en el pasado
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return data.inscription_start_date >= oneDayAgo;
}, {
  message: "La fecha de inicio de inscripciones no puede ser anterior a ayer",
  path: ["inscription_start_date"]
});

// Esquema para actualizar concurso (más flexible)
export const serverUpdateContestSchema = serverCreateContestSchema.partial().extend({
  id: z.number().positive("El ID del concurso es requerido")
});

// Esquema para parámetros de consulta
export const queryParamsSchema = z.object({
  page: z.string().transform(val => Math.max(1, parseInt(val) || 1)),
  limit: z.string().transform(val => Math.min(100, Math.max(1, parseInt(val) || 10))),
  status: z.enum([
    'ACTIVE', 'ARCHIVED', 'CANCELLED', 'CLOSED', 'DRAFT', 'FINISHED',
    'IN_EVALUATION', 'PAUSED', 'RESULTS_PUBLISHED', 'SCHEDULED',
    'DOCUMENTATION_VALIDATION', 'APPLICATION_VALIDATION'
  ]).optional(),
  search: z.string().max(255).optional(),
  category: z.string().max(100).optional(),
  department: z.string().max(255).optional()
});

// Esquema para validar archivos subidos
export const uploadFileSchema = z.object({
  contestId: z.string().regex(/^\d+$/, "El ID del concurso debe ser numérico"),
  fileType: z.enum(['bases', 'description'], {
    errorMap: () => ({ message: "El tipo de archivo debe ser 'bases' o 'description'" })
  }),
  file: fileValidationSchema
});

// Tipos TypeScript
export type ServerCreateContestData = z.infer<typeof serverCreateContestSchema>;
export type ServerUpdateContestData = z.infer<typeof serverUpdateContestSchema>;
export type QueryParams = z.infer<typeof queryParamsSchema>;
export type UploadFileData = z.infer<typeof uploadFileSchema>;

// Funciones de validación
export function validateContestData(data: any, isUpdate: boolean = false): {
  success: boolean;
  data?: any;
  errors: Record<string, string[]>;
} {
  try {
    const schema = isUpdate ? serverUpdateContestSchema : serverCreateContestSchema;
    const validatedData = schema.parse(data);
    
    return {
      success: true,
      data: validatedData,
      errors: {}
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      
      return {
        success: false,
        errors
      };
    }
    
    return {
      success: false,
      errors: {
        general: ['Error de validación desconocido']
      }
    };
  }
}

export function validateQueryParams(searchParams: URLSearchParams): {
  success: boolean;
  data?: QueryParams;
  errors: Record<string, string[]>;
} {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const validatedParams = queryParamsSchema.parse(params);
    
    return {
      success: true,
      data: validatedParams,
      errors: {}
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      
      return {
        success: false,
        errors
      };
    }
    
    return {
      success: false,
      errors: {
        general: ['Error de validación de parámetros']
      }
    };
  }
}

// Validaciones específicas del dominio
export function validateBusinessRules(contestData: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Regla: Los concursos de magistrados requieren documentación
  if (contestData.category === 'MAGISTRADOS' && !contestData.bases_url) {
    warnings.push("Los concursos de magistrados generalmente requieren bases del concurso");
  }

  // Regla: Validar duración del período de inscripciones
  if (contestData.inscription_start_date && contestData.inscription_end_date) {
    const diffDays = Math.ceil(
      (contestData.inscription_end_date.getTime() - contestData.inscription_start_date.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diffDays < 7) {
      warnings.push("El período de inscripciones es muy corto (menos de 7 días)");
    }
    
    if (diffDays > 60) {
      warnings.push("El período de inscripciones es muy largo (más de 60 días)");
    }
  }

  // Regla: Validar coherencia entre posición y categoría
  const managementPositions = ['Secretario/a Legal y Técnico/a', 'Secretario/a General', 'Jefe/a Administrativo/Contable'];
  if (managementPositions.includes(contestData.position) && contestData.category !== 'FUNCIONARIOS Y PERSONAL JERÁRQUICO') {
    warnings.push("Este tipo de posición generalmente corresponde a la categoría 'Funcionarios y Personal Jerárquico'");
  }

  // Regla: Validar fechas en días laborables
  if (contestData.inscription_start_date) {
    const dayOfWeek = contestData.inscription_start_date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Domingo o Sábado
      warnings.push("La fecha de inicio de inscripciones cae en fin de semana");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Función para sanitizar datos de entrada
export function sanitizeContestData(data: any): any {
  const sanitized = { ...data };
  
  // Limpiar strings
  if (sanitized.title) {
    sanitized.title = sanitized.title.trim();
  }
  
  if (sanitized.functions) {
    sanitized.functions = sanitized.functions.trim();
  }
  
  if (sanitized.department) {
    sanitized.department = sanitized.department.trim();
  }
  
  // Convertir fechas si son strings
  ['start_date', 'end_date', 'inscription_start_date', 'inscription_end_date'].forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      try {
        sanitized[field] = new Date(sanitized[field]);
      } catch {
        // Si no se puede parsear, dejarlo como está para que la validación lo capture
      }
    }
  });
  
  return sanitized;
}

// Middleware para validar requests
export async function validateRequest(
  request: NextRequest,
  schema: z.ZodSchema<any>
): Promise<{ success: boolean; data?: any; errors?: Record<string, string[]> }> {
  try {
    const body = await request.json();
    const sanitized = sanitizeContestData(body);
    const result = schema.safeParse(sanitized);
    
    if (result.success) {
      // Validar reglas de negocio
      const businessValidation = validateBusinessRules(result.data);
      
      return {
        success: true,
        data: {
          ...result.data,
          _warnings: businessValidation.warnings
        }
      };
    } else {
      const errors: Record<string, string[]> = {};
      
      result.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      
      return {
        success: false,
        errors
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: {
        general: ['Error al procesar la solicitud. Verifique el formato de los datos.']
      }
    };
  }
}
