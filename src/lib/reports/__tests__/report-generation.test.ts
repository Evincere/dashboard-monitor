import { describe, test, expect, vi } from 'vitest';
import { ValidationProgressReportGenerator } from '@/lib/reports/generators/ValidationProgressReportGenerator';
import { ReportConverter } from '@/lib/reports/utils/converter';
import { ReportService } from '@/lib/reports/services/ReportService';
import { PrismaClient } from '@prisma/client';

vi.mock('@prisma/client', () => {
    return {
        PrismaClient: vi.fn(() => ({
            document: {
                groupBy: vi.fn(),
                findMany: vi.fn()
            },
            inscription: {
                count: vi.fn()
            },
            user: {
                findMany: vi.fn()
            },
            documentType: {
                findMany: vi.fn()
            },
            $queryRaw: vi.fn(),
            generated_reports: {
                create: vi.fn(),
                update: vi.fn(),
                findUnique: vi.fn(),
                findMany: vi.fn()
            }
        })),
        Prisma: {
            sql: vi.fn(),
            empty: Symbol('empty')
        }
    };
});

describe('Report Generation System', () => {
    let prisma: PrismaClient;
    let generator: ValidationProgressReportGenerator;
    let service: ReportService;

    beforeEach(() => {
        prisma = new PrismaClient();
        generator = new ValidationProgressReportGenerator();
        service = new ReportService();
    });

    describe('ValidationProgressReportGenerator', () => {
        test('generates overview metrics correctly', async () => {
            const mockDocuments = [
                { status: 'VALIDATED', _count: 10 },
                { status: 'PENDING', _count: 5 },
                { status: 'IN_REVIEW', _count: 3 }
            ];

            vi.spyOn(prisma.document, 'groupBy').mockResolvedValue(mockDocuments as any);
            vi.spyOn(prisma.inscription, 'count').mockResolvedValue(20);

            const result = await generator.generate();

            expect(result.overview).toBeDefined();
            expect(result.overview.totalPostulations).toBe(20);
            expect(result.overview.validationCompleted).toBe(10);
            expect(result.overview.validationPending).toBe(5);
            expect(result.overview.validationInProgress).toBe(3);
        });
    });

    describe('ReportConverter', () => {
        test('converts report to PDF format', async () => {
            const testData = {
                overview: {
                    totalPostulations: 100,
                    validationCompleted: 50,
                    validationPending: 30,
                    validationInProgress: 20
                }
            };

            const pdfBuffer = await ReportConverter.toPDF(testData);
            expect(pdfBuffer).toBeInstanceOf(Buffer);
            expect(pdfBuffer.length).toBeGreaterThan(0);
        });

        test('converts report to Excel format', async () => {
            const testData = {
                overview: {
                    totalPostulations: 100,
                    validationCompleted: 50,
                    validationPending: 30,
                    validationInProgress: 20
                }
            };

            const excelBuffer = await ReportConverter.toExcel(testData);
            expect(excelBuffer).toBeInstanceOf(Buffer);
            expect(excelBuffer.length).toBeGreaterThan(0);
        });
    });

    describe('ReportService', () => {
        test('generates and stores report successfully', async () => {
            const mockRequest = {
                type: 'VALIDATION_PROGRESS' as const,
                format: 'PDF' as const,
                filters: {
                    dateRange: {
                        start: '2024-03-01',
                        end: '2024-03-31'
                    }
                }
            };

            vi.spyOn(prisma.generated_reports, 'create').mockResolvedValue({
                id: 'test-report-1',
                reportType: mockRequest.type,
                format: mockRequest.format,
                status: 'GENERATING'
            } as any);

            vi.spyOn(prisma.generated_reports, 'update').mockResolvedValue({
                id: 'test-report-1',
                reportType: mockRequest.type,
                format: mockRequest.format,
                status: 'COMPLETED',
                filePath: '/path/to/report.pdf'
            } as any);

            const result = await service.generateReport(mockRequest, 'test-user');

            expect(result).toBeDefined();
            expect(result.status).toBe('COMPLETED');
            expect(result.filePath).toBeDefined();
        });
    });
});
