import { PrismaClient } from '@prisma/client';
import { ReportService } from '../services/ReportService';

async function testReportGeneration() {
    try {
        const service = new ReportService();

        // Test validation progress report
        const validationReport = await service.generateReport({
            type: 'VALIDATION_PROGRESS',
            format: 'PDF',
            filters: {
                dateRange: {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
                    end: new Date().toISOString()
                }
            }
        }, 'test-user');

        console.log('Validation Progress Report generated:', validationReport);

        // Test final results report
        const finalReport = await service.generateReport({
            type: 'FINAL_RESULTS',
            format: 'PDF',
            filters: {
                dateRange: {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString()
                }
            }
        }, 'test-user');

        console.log('Final Results Report generated:', finalReport);

        process.exit(0);
    } catch (error) {
        console.error('Error testing report generation:', error);
        process.exit(1);
    }
}

testReportGeneration();
