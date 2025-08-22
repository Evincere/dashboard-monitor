import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';

export class ReportConverter {
    static async toPDF(data: any): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            const doc = new PDFDocument();

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).text('MINISTERIO PÚBLICO DE LA DEFENSA', { align: 'center' });
            doc.fontSize(16).text('CONCURSO MULTIFUERO - RESULTADOS OFICIALES', { align: 'center' });
            doc.moveDown();

            // Fecha y hora de generación
            doc.fontSize(12).text(`Generado: ${new Date().toLocaleString('es-AR')}`, { align: 'right' });
            doc.moveDown(2);

            // Contenido del reporte
            if (data.overview) {
                // Para reportes de progreso de validación
                doc.fontSize(14).text('Resumen General', { underline: true });
                doc.fontSize(12).text(`Total de Postulaciones: ${data.overview.totalPostulations}`);
                doc.text(`Validaciones Completadas: ${data.overview.validationCompleted}`);
                doc.text(`Validaciones Pendientes: ${data.overview.validationPending}`);
                doc.text(`Validaciones en Progreso: ${data.overview.validationInProgress}`);
                doc.moveDown();
            } else if (data.metadata) {
                // Para reportes de resultados finales
                doc.fontSize(14).text('Información del Concurso', { underline: true });
                doc.fontSize(12).text(`Título: ${data.metadata.contestTitle}`);
                doc.text(`Período de Validación: ${new Date(data.metadata.validationPeriod.start).toLocaleDateString('es-AR')} - ${new Date(data.metadata.validationPeriod.end).toLocaleDateString('es-AR')}`);
                doc.moveDown();

                doc.fontSize(14).text('Resultados', { underline: true });
                doc.fontSize(12).text(`Aprobados: ${data.approved.count}`);
                doc.text(`Rechazados: ${data.rejected.count}`);
                doc.moveDown();
            }

            doc.end();
        });
    }

    static async toExcel(data: any): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');

        // TODO: Implementar la generación específica del Excel
        worksheet.addRow(['Data']);
        worksheet.addRow([JSON.stringify(data)]);

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    static async toCSV(data: any): Promise<Buffer> {
        const parser = new Parser();
        const csv = parser.parse(Array.isArray(data) ? data : [data]);
        return Buffer.from(csv);
    }
}
