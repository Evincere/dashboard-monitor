import { z } from 'zod';

// Esquemas de validación para diferentes tipos de datos
const contestStatusSchema = z.enum([
  'ACTIVE',
  'ARCHIVED', 
  'CANCELLED',
  'CLOSED',
  'DRAFT',
  'FINISHED',
  'IN_EVALUATION',
  'PAUSED',
  'RESULTS_PUBLISHED',
  'SCHEDULED',
  'DOCUMENTATION_VALIDATION',
  'APPLICATION_VALIDATION'
]);

const categorySchema = z.enum([
  'FUNCIONARIOS Y PERSONAL JERÁRQUICO',
  'MAGISTRADOS',
  'EMPLEADOS'
]);

const classSchema = z.enum([
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'
]);

const circumscriptionSchema = z.enum([
  'PRIMERA CIRCUNSCRIPCIÓN',
  'SEGUNDA CIRCUNSCRIPCIÓN',
  'SEGUNDA CIRCUNSCRIPCIÓN - San Rafael',
  'SEGUNDA CIRCUNSCRIPCIÓN - General Alvear',
  'SEGUNDA CIRCUNSCRIPCIÓN - Malargüe',
  'TERCERA CIRCUNSCRIPCIÓN',
  'CUARTA CIRCUNSCRIPCIÓN'
]);

const positionSchema = z.enum([
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
]);

// Validación de fechas personalizada
const futureDateSchema = z.date().refine((date) => {
  return date > new Date();
}, {
  message: "La fecha debe ser posterior a la fecha actual"
});

const pastOrCurrentDateSchema = z.date().refine((date) => {
  return date <= new Date();
}, {
  message: "La fecha no puede ser futura"
});

// Esquema principal del concurso
export const contestSchema = z.object({
  title: z.string()
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(200, "El título no puede exceder 200 caracteres")
    .refine((title) => {
      // Validar que no contenga solo espacios
      return title.trim().length > 0;
    }, "El título no puede estar vacío"),
  
  category: categorySchema.optional(),
  
  class_: classSchema.optional(),
  
  department: z.string().optional().or(z.array(z.string()).optional()),
  
  position: positionSchema.optional(),
  
  functions: z.string()
    .max(2000, "La descripción de funciones no puede exceder 2000 caracteres")
    .optional(),
  
  status: contestStatusSchema,
  
  start_date: z.date().optional().nullable(),
  
  end_date: z.date().optional().nullable(),
  
  inscription_start_date: z.date({
    required_error: "La fecha de inicio de inscripciones es obligatoria",
    invalid_type_error: "La fecha de inicio de inscripciones debe ser una fecha válida",
  }),
  
  inscription_end_date: z.date({
    required_error: "La fecha de fin de inscripciones es obligatoria", 
    invalid_type_error: "La fecha de fin de inscripciones debe ser una fecha válida",
  }),
  
  bases_url: z.string()
    .url("La URL de las bases debe ser válida")
    .optional()
    .or(z.literal("")),
  
  description_url: z.string()
    .url("La URL de descripción debe ser válida") 
    .optional()
    .or(z.literal("")),
}).refine((data) => {
  // Validar que inscription_end_date sea posterior a inscription_start_date
  if (data.inscription_start_date && data.inscription_end_date) {
    return data.inscription_end_date > data.inscription_start_date;
  }
  return true;
}, {
  message: "La fecha de fin de inscripciones debe ser posterior al inicio",
  path: ["inscription_end_date"]
}).refine((data) => {
  // Validar que end_date sea posterior a start_date si ambas están definidas
  if (data.start_date && data.end_date) {
    return data.end_date > data.start_date;
  }
  return true;
}, {
  message: "La fecha de fin del concurso debe ser posterior al inicio",
  path: ["end_date"]
}).refine((data) => {
  // Validar que las fechas del concurso sean compatibles con las de inscripción
  if (data.start_date && data.inscription_end_date) {
    return data.start_date >= data.inscription_end_date;
  }
  return true;
}, {
  message: "El concurso debe iniciar después del fin de inscripciones",
  path: ["start_date"]
});

// Esquema base sin refinements para permitir extend
const baseContestSchema = z.object({
  title: z.string()
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(200, "El título no puede exceder 200 caracteres")
    .refine((title) => {
      // Validar que no contenga solo espacios
      return title.trim().length > 0;
    }, "El título no puede estar vacío"),
  
  category: categorySchema.optional(),
  
  class_: classSchema.optional(),
  
  department: z.string().optional().or(z.array(z.string()).optional()),
  
  position: positionSchema.optional(),
  
  functions: z.string()
    .max(2000, "La descripción de funciones no puede exceder 2000 caracteres")
    .optional(),
  
  status: contestStatusSchema,
  
  start_date: z.date().optional().nullable(),
  
  end_date: z.date().optional().nullable(),
  
  inscription_start_date: z.date({
    required_error: "La fecha de inicio de inscripciones es obligatoria",
    invalid_type_error: "La fecha de inicio de inscripciones debe ser una fecha válida",
  }),
  
  inscription_end_date: z.date({
    required_error: "La fecha de fin de inscripciones es obligatoria", 
    invalid_type_error: "La fecha de fin de inscripciones debe ser una fecha válida",
  }),
  
  bases_url: z.string()
    .url("La URL de las bases debe ser válida")
    .optional()
    .or(z.literal("")),
  
  description_url: z.string()
    .url("La URL de descripción debe ser válida") 
    .optional()
    .or(z.literal(""))
});

// Esquema para crear concurso (campos requeridos más estrictos)
export const createContestSchema = baseContestSchema.extend({
  title: z.string()
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(200, "El título no puede exceder 200 caracteres"),
  inscription_start_date: z.date({
    required_error: "La fecha de inicio de inscripciones es obligatoria"
  }),
  inscription_end_date: z.date({
    required_error: "La fecha de fin de inscripciones es obligatoria"
  })
}).refine((data) => {
  // Validar que inscription_end_date sea posterior a inscription_start_date
  if (data.inscription_start_date && data.inscription_end_date) {
    return data.inscription_end_date > data.inscription_start_date;
  }
  return true;
}, {
  message: "La fecha de fin de inscripciones debe ser posterior al inicio",
  path: ["inscription_end_date"]
}).refine((data) => {
  // Validar que end_date sea posterior a start_date si ambas están definidas
  if (data.start_date && data.end_date) {
    return data.end_date > data.start_date;
  }
  return true;
}, {
  message: "La fecha de fin del concurso debe ser posterior al inicio",
  path: ["end_date"]
}).refine((data) => {
  // Validar que las fechas del concurso sean compatibles con las de inscripción
  if (data.start_date && data.inscription_end_date) {
    return data.start_date >= data.inscription_end_date;
  }
  return true;
}, {
  message: "El concurso debe iniciar después del fin de inscripciones",
  path: ["start_date"]
});

// Esquema para actualizar concurso (más flexible)
export const updateContestSchema = baseContestSchema.partial().extend({
  id: z.number().positive("El ID del concurso es requerido")
}).refine((data) => {
  // Validar que inscription_end_date sea posterior a inscription_start_date
  if (data.inscription_start_date && data.inscription_end_date) {
    return data.inscription_end_date > data.inscription_start_date;
  }
  return true;
}, {
  message: "La fecha de fin de inscripciones debe ser posterior al inicio",
  path: ["inscription_end_date"]
}).refine((data) => {
  // Validar que end_date sea posterior a start_date si ambas están definidas
  if (data.start_date && data.end_date) {
    return data.end_date > data.start_date;
  }
  return true;
}, {
  message: "La fecha de fin del concurso debe ser posterior al inicio",
  path: ["end_date"]
}).refine((data) => {
  // Validar que las fechas del concurso sean compatibles con las de inscripción
  if (data.start_date && data.inscription_end_date) {
    return data.start_date >= data.inscription_end_date;
  }
  return true;
}, {
  message: "El concurso debe iniciar después del fin de inscripciones",
  path: ["start_date"]
});

// Tipos TypeScript derivados de los esquemas
export type ContestFormData = z.infer<typeof contestSchema>;
export type CreateContestData = z.infer<typeof createContestSchema>;
export type UpdateContestData = z.infer<typeof updateContestSchema>;

// Función de validación personalizada para formularios
export function validateContest(data: any, isEdit: boolean = false): {
  success: boolean;
  errors: Record<string, string[]>;
  data?: any;
} {
  try {
    const schema = isEdit ? updateContestSchema : createContestSchema;
    const validatedData = schema.parse(data);
    
    return {
      success: true,
      errors: {},
      data: validatedData
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

// Funciones de validación específicas
export function validateDates(startDate: Date | null, endDate: Date | null): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!startDate) {
    errors.push("La fecha de inicio es requerida");
  }
  
  if (!endDate) {
    errors.push("La fecha de fin es requerida");
  }
  
  if (startDate && endDate && endDate <= startDate) {
    errors.push("La fecha de fin debe ser posterior a la fecha de inicio");
  }
  
  // Validar que las fechas de inscripción no sean muy en el pasado
  if (startDate && startDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    errors.push("La fecha de inicio no puede ser anterior a ayer");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateTitle(title: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push("El título es requerido");
  } else if (title.trim().length < 5) {
    errors.push("El título debe tener al menos 5 caracteres");
  } else if (title.length > 200) {
    errors.push("El título no puede exceder 200 caracteres");
  }
  
  // Validar caracteres especiales problemáticos
  if (/[<>\"'&]/.test(title)) {
    errors.push("El título contiene caracteres no permitidos");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateFiles(basesUrl?: string, descriptionUrl?: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (basesUrl && basesUrl.trim() !== "") {
    try {
      new URL(basesUrl);
    } catch {
      errors.push("La URL de las bases no es válida");
    }
  }
  
  if (descriptionUrl && descriptionUrl.trim() !== "") {
    try {
      new URL(descriptionUrl);
    } catch {
      errors.push("La URL de descripción no es válida");
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
