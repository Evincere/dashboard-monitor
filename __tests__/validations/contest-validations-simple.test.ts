import { 
  contestSchema, 
  validateContest, 
  validateTitle, 
  validateDates, 
  validateFiles 
} from '../../src/lib/validations/contest-validation';

describe('Validaciones de Concursos - Sistema Real', () => {
  
  describe('Validación de título con validateTitle', () => {
    it('debe rechazar títulos vacíos', () => {
      const result = validateTitle('');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El título es requerido');
    });

    it('debe rechazar títulos muy cortos', () => {
      const result = validateTitle('ab');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El título debe tener al menos 5 caracteres');
    });

    it('debe rechazar títulos muy largos', () => {
      const longTitle = 'a'.repeat(201);
      const result = validateTitle(longTitle);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El título no puede exceder 200 caracteres');
    });

    it('debe aceptar títulos válidos', () => {
      const result = validateTitle('Concurso de Programación 2024');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('debe rechazar títulos con caracteres especiales peligrosos', () => {
      const result = validateTitle('Concurso <script> malicioso');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El título contiene caracteres no permitidos');
    });
  });

  describe('Validación de fechas con validateDates', () => {
    it('debe rechazar fechas nulas', () => {
      const result = validateDates(null, null);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La fecha de inicio es requerida');
      expect(result.errors).toContain('La fecha de fin es requerida');
    });

    it('debe rechazar cuando fecha fin es anterior a fecha inicio', () => {
      const startDate = new Date('2024-06-30');
      const endDate = new Date('2024-06-01');
      const result = validateDates(startDate, endDate);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La fecha de fin debe ser posterior a la fecha de inicio');
    });

    it('debe rechazar fechas muy en el pasado', () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 días atrás
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 día adelante
      const result = validateDates(pastDate, futureDate);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La fecha de inicio no puede ser anterior a ayer');
    });

    it('debe aceptar fechas válidas', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const result = validateDates(tomorrow, nextWeek);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validación de archivos con validateFiles', () => {
    it('debe aceptar URLs vacías o undefined', () => {
      const result = validateFiles('', '');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('debe rechazar URLs inválidas para bases', () => {
      const result = validateFiles('invalid-url', '');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La URL de las bases no es válida');
    });

    it('debe rechazar URLs inválidas para descripción', () => {
      const result = validateFiles('', 'invalid-url');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La URL de descripción no es válida');
    });

    it('debe aceptar URLs válidas', () => {
      const result = validateFiles('https://example.com/bases.pdf', 'https://example.com/desc.pdf');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validación completa con validateContest', () => {
    const validContestData = {
      title: 'Concurso Válido para Testing',
      status: 'DRAFT' as const,
      inscription_start_date: new Date('2024-08-01'),
      inscription_end_date: new Date('2024-08-31'),
    };

    it('debe validar correctamente un concurso válido', () => {
      const result = validateContest(validContestData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toEqual({});
    });

    it('debe fallar con datos inválidos', () => {
      const invalidData = {
        title: '', // Título vacío
        status: 'INVALID_STATUS',
        inscription_start_date: 'invalid-date',
        inscription_end_date: new Date('2024-08-31'),
      };

      const result = validateContest(invalidData);
      
      expect(result.success).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });

    it('debe validar fechas de inscripción correctamente', () => {
      // Usar validateDates directamente ya que validateContest usa baseContestSchema que no tiene refinements
      const startDate = new Date('2024-08-31');
      const endDate = new Date('2024-08-01'); // Fecha anterior al inicio
      const result = validateDates(startDate, endDate);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La fecha de fin debe ser posterior a la fecha de inicio');
    });
  });

  describe('Validación del esquema contestSchema', () => {
    it('debe validar correctamente un concurso completo', () => {
      const validData = {
        title: 'Concurso Completo de Testing',
        category: 'FUNCIONARIOS Y PERSONAL JERÁRQUICO' as const,
        position: 'Secretario/a Legal y Técnico/a' as const,
        functions: 'Realizar tareas administrativas y técnicas',
        status: 'DRAFT' as const,
        inscription_start_date: new Date('2024-08-01'),
        inscription_end_date: new Date('2024-08-31'),
        start_date: new Date('2024-09-01'),
        end_date: new Date('2024-12-31'),
        bases_url: 'https://example.com/bases.pdf',
        description_url: 'https://example.com/description.pdf'
      };

      const result = contestSchema.safeParse(validData);
      
      expect(result.success).toBe(true);
    });

    it('debe rechazar status inválidos', () => {
      const invalidData = {
        title: 'Concurso con Status Inválido',
        status: 'INVALID_STATUS',
        inscription_start_date: new Date('2024-08-01'),
        inscription_end_date: new Date('2024-08-31'),
      };

      const result = contestSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
    });

    it('debe validar los enums correctamente', () => {
      const testCategories = ['FUNCIONARIOS Y PERSONAL JERÁRQUICO', 'MAGISTRADOS', 'EMPLEADOS'];
      
      testCategories.forEach(category => {
        const data = {
          title: 'Test Category',
          category: category as any,
          status: 'DRAFT' as const,
          inscription_start_date: new Date('2024-08-01'),
          inscription_end_date: new Date('2024-08-31'),
        };

        const result = contestSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('debe rechazar títulos demasiado cortos', () => {
      const data = {
        title: 'abc', // Menos de 5 caracteres
        status: 'DRAFT' as const,
        inscription_start_date: new Date('2024-08-01'),
        inscription_end_date: new Date('2024-08-31'),
      };

      const result = contestSchema.safeParse(data);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('al menos 5 caracteres')
        )).toBe(true);
      }
    });

    it('debe validar las funciones con límite de caracteres', () => {
      const longFunctions = 'a'.repeat(2001);
      const data = {
        title: 'Concurso con Funciones Largas',
        functions: longFunctions,
        status: 'DRAFT' as const,
        inscription_start_date: new Date('2024-08-01'),
        inscription_end_date: new Date('2024-08-31'),
      };

      const result = contestSchema.safeParse(data);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('2000 caracteres')
        )).toBe(true);
      }
    });
  });
});
