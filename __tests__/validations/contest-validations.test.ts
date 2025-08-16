import { contestSchema as contestValidation, validateContest, validateTitle, validateDates, validateFiles } from '../../src/lib/validations/contest-validation';

describe('Validaciones de Concursos - Frontend', () => {
  describe('Validación de título', () => {
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
    
    it('debe rechazar títulos con caracteres especiales', () => {
      const result = validateTitle('Concurso <script> malicioso');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El título contiene caracteres no permitidos');
    });
  });

  describe('Validación de funciones', () => {
    it('debe rechazar funciones muy largas', () => {
      const longFunctions = 'a'.repeat(2001);
      const result = contestValidation.safeParse({
        title: 'Concurso Válido',
        functions: longFunctions,
        status: 'DRAFT',
        inscription_start_date: new Date('2024-06-01'),
        inscription_end_date: new Date('2024-06-30')
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('funciones no puede exceder 2000 caracteres')
        )).toBe(true);
      }
    });

    it('debe aceptar funciones válidas', () => {
      const result = contestValidation.safeParse({
        title: 'Concurso Válido',
        functions: 'Funciones específicas del puesto',
        status: 'DRAFT',
        inscription_start_date: new Date('2024-06-01'),
        inscription_end_date: new Date('2024-06-30')
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Validación de fechas', () => {
    it('debe rechazar fechas de inicio inválidas', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: 'fecha-inválida',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: 1
      });
      
      expect(result.success).toBe(false);
    });

    it('debe rechazar fechas de fin inválidas', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: 'fecha-inválida',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: 1
      });
      
      expect(result.success).toBe(false);
    });

    it('debe rechazar cuando la fecha de fin es anterior a la de inicio', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-30',
        end_date: '2024-06-01',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: 1
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('La fecha de fin debe ser posterior a la fecha de inicio');
      }
    });

    it('debe aceptar fechas válidas', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: 1
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Validación de status', () => {
    it('debe aceptar status válidos', () => {
      const validStatuses = ['draft', 'active', 'inactive', 'completed'];
      
      validStatuses.forEach(status => {
        const result = contestValidation.safeParse({
          name: 'Concurso Válido',
          description: 'Descripción válida',
          start_date: '2024-06-01',
          end_date: '2024-06-30',
          status,
          type: 'contest',
          visibility: 'public',
          created_by: 1
        });
        
        expect(result.success).toBe(true);
      });
    });

    it('debe rechazar status inválidos', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'invalid-status',
        type: 'contest',
        visibility: 'public',
        created_by: 1
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('Validación de tipo', () => {
    it('debe aceptar tipos válidos', () => {
      const validTypes = ['contest', 'challenge', 'tournament'];
      
      validTypes.forEach(type => {
        const result = contestValidation.safeParse({
          name: 'Concurso Válido',
          description: 'Descripción válida',
          start_date: '2024-06-01',
          end_date: '2024-06-30',
          status: 'draft',
          type,
          visibility: 'public',
          created_by: 1
        });
        
        expect(result.success).toBe(true);
      });
    });

    it('debe rechazar tipos inválidos', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'invalid-type',
        visibility: 'public',
        created_by: 1
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('Validación de visibilidad', () => {
    it('debe aceptar valores de visibilidad válidos', () => {
      const validVisibilities = ['public', 'private', 'unlisted'];
      
      validVisibilities.forEach(visibility => {
        const result = contestValidation.safeParse({
          name: 'Concurso Válido',
          description: 'Descripción válida',
          start_date: '2024-06-01',
          end_date: '2024-06-30',
          status: 'draft',
          type: 'contest',
          visibility,
          created_by: 1
        });
        
        expect(result.success).toBe(true);
      });
    });

    it('debe rechazar valores de visibilidad inválidos', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'invalid-visibility',
        created_by: 1
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('Validación de created_by', () => {
    it('debe rechazar valores negativos', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: -1
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('El ID del creador debe ser un número positivo');
      }
    });

    it('debe rechazar cero', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: 0
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('El ID del creador debe ser un número positivo');
      }
    });

    it('debe aceptar valores positivos', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: 1
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Validaciones opcionales', () => {
    it('debe aceptar prizes_info como string opcional', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: 1,
        prizes_info: 'Primer lugar: $1000, Segundo lugar: $500'
      });
      
      expect(result.success).toBe(true);
    });

    it('debe aceptar rules como string opcional', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: 1,
        rules: 'Regla 1: No hacer trampa. Regla 2: Seguir las instrucciones.'
      });
      
      expect(result.success).toBe(true);
    });

    it('debe aceptar contact_info como string opcional', () => {
      const result = contestValidation.safeParse({
        name: 'Concurso Válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: 1,
        contact_info: 'contacto@ejemplo.com'
      });
      
      expect(result.success).toBe(true);
    });
  });
});
