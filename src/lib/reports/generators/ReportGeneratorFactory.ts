import { ReportType } from '../types';
import { ValidationProgressReportGenerator } from './ValidationProgressReportGenerator';
import { FinalResultsReportGenerator } from './FinalResultsReportGenerator';
import { AuditReportGenerator } from './AuditReportGenerator';

export class ReportGeneratorFactory {
    private static generators: { [key in ReportType]?: any } = {
        'VALIDATION_PROGRESS': new ValidationProgressReportGenerator(),
        'FINAL_RESULTS': new FinalResultsReportGenerator(),
        'AUDIT_TRAIL': new AuditReportGenerator(),
    };

    static getGenerator(type: ReportType): any {
        const generator = ReportGeneratorFactory.generators[type];
        if (!generator) {
            throw new Error(`No generator found for report type: ${type}`);
        }
        return generator;
    }
}
