import {
  validateContest,
  validateDates,
  validateTitle,
  validateFiles,
  contestSchema,
  createContestSchema,
  updateContestSchema
} from '../contest-validation';

describe('Contest Validation', () => {
  describe('validateTitle', () => {
    it('should validate correct titles', () => {
      const result = validateTitle('Defensor Penal - Primera Circunscripción');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty titles', () => {
      const result = validateTitle('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El título es requerido');
    });

    it('should reject titles that are too short', () => {
      const result = validateTitle('Test');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El título debe tener al menos 5 caracteres');
    });

    it('should reject titles that are too long', () => {
      const longTitle = 'A'.repeat(201);
      const result = validateTitle(longTitle);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El título no puede exceder 200 caracteres');
    });

    it('should reject titles with forbidden characters', () => {
      const result = validateTitle('Test <script>alert("xss")</script>');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El título contiene caracteres no permitidos');
    });
  });

  describe('validateDates', () => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    it('should validate correct date range', () => {
      const result = validateDates(today, tomorrow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject when start date is missing', () => {
      const result = validateDates(null, tomorrow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La fecha de inicio es requerida');
    });

    it('should reject when end date is missing', () => {
      const result = validateDates(today, null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La fecha de fin es requerida');
    });

    it('should reject when end date is before start date', () => {
      const result = validateDates(tomorrow, today);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La fecha de fin debe ser posterior a la fecha de inicio');
    });

    it('should reject start dates too far in the past', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(today.getDate() - 2);
      const result = validateDates(twoDaysAgo, tomorrow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La fecha de inicio no puede ser anterior a ayer');
    });
  });

  describe('validateFiles', () => {
    it('should validate correct URLs', () => {
      const result = validateFiles(
        'https://example.com/bases.pdf',
        'https://example.com/description.pdf'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow empty URLs', () => {
      const result = validateFiles('', '');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid URLs', () => {
      const result = validateFiles('not-a-url', 'also-not-a-url');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La URL de las bases no es válida');
      expect(result.errors).toContain('La URL de descripción no es válida');
    });
  });

  describe('validateContest', () => {
    const validContestData = {
      title: 'Test Contest - Defensor Penal',
      category: 'MAGISTRADOS',
      class_: '05',
      department: 'PRIMERA CIRCUNSCRIPCIÓN',
      position: 'Defensor/a Penal',
      functions: 'Función de defensa penal en primera instancia',
      status: 'DRAFT',
      start_date: new Date('2024-12-01'),
      end_date: new Date('2024-12-31'),
      inscription_start_date: new Date('2024-11-01'),
      inscription_end_date: new Date('2024-11-30'),
      bases_url: 'https://example.com/bases.pdf',
      description_url: 'https://example.com/description.pdf'
    };

    it('should validate correct contest data for creation', () => {
      const result = validateContest(validContestData, false);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toEqual({});
    });

    it('should validate correct contest data for update', () => {
      const updateData = { ...validContestData, id: 1 };
      const result = validateContest(updateData, true);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toEqual({});
    });

    it('should reject contest with missing required fields', () => {
      const invalidData = {
        title: '',
        inscription_start_date: new Date(),
        inscription_end_date: new Date()
      };
      const result = validateContest(invalidData, false);
      expect(result.success).toBe(false);
      expect(result.errors.title).toContain('El título debe tener al menos 5 caracteres');
    });

    it('should reject contest with invalid date sequence', () => {
      const invalidData = {
        ...validContestData,
        inscription_start_date: new Date('2024-12-01'),
        inscription_end_date: new Date('2024-11-01') // End before start
      };
      const result = validateContest(invalidData, false);
      expect(result.success).toBe(false);
      expect(result.errors.inscription_end_date).toContain(
        'La fecha de fin de inscripciones debe ser posterior al inicio'
      );
    });

    it('should reject contest when contest starts before inscription ends', () => {
      const invalidData = {
        ...validContestData,
        inscription_start_date: new Date('2024-11-01'),
        inscription_end_date: new Date('2024-12-15'),
        start_date: new Date('2024-12-01') // Contest starts before inscription ends
      };
      const result = validateContest(invalidData, false);
      expect(result.success).toBe(false);
      expect(result.errors.start_date).toContain(
        'El concurso debe iniciar después del fin de inscripciones'
      );
    });
  });

  describe('Schema validation', () => {
    const validData = {
      title: 'Test Contest',
      status: 'DRAFT',
      inscription_start_date: new Date(),
      inscription_end_date: new Date(Date.now() + 86400000), // Tomorrow
    };

    it('should validate with createContestSchema', () => {
      const result = createContestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with updateContestSchema', () => {
      const updateData = { ...validData, id: 1 };
      const result = updateContestSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidData = { ...validData, status: 'INVALID_STATUS' };
      const result = contestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid category', () => {
      const invalidData = { ...validData, category: 'INVALID_CATEGORY' };
      const result = contestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid position', () => {
      const invalidData = { ...validData, position: 'INVALID_POSITION' };
      const result = contestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
