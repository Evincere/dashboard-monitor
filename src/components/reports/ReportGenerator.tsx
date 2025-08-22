"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ReportFormat, ReportType } from '@/lib/reports/types';
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/components/ui/use-toast";
import { useToast } from "@/components/ui/use-toast";

interface ReportGeneratorProps {
    onGenerate: (type: ReportType, format: ReportFormat, filters: any) => Promise<void>;
}

export function ReportGenerator({ onGenerate }: ReportGeneratorProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [reportType, setReportType] = useState<ReportType>('FINAL_RESULTS');
    const [format, setFormat] = useState<ReportFormat>('PDF');
    const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
        start: null,
        end: null
    });

    const handleGenerate = async () => {
        if (!dateRange.start || !dateRange.end) {
            toast({
                title: "Error",
                description: "Por favor seleccione un rango de fechas",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            await onGenerate(reportType, format, {
                dateRange: {
                    start: dateRange.start.toISOString(),
                    end: dateRange.end.toISOString()
                }
            });
            toast({
                title: "Éxito",
                description: "El reporte se está generando"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Error al generar el reporte",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">Generar Reporte</h2>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Reporte</label>
                    <Select
                        value={reportType}
                        onValueChange={(value) => setReportType(value as ReportType)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione tipo de reporte" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="FINAL_RESULTS">Resultados Finales</SelectItem>
                            <SelectItem value="VALIDATION_PROGRESS">Progreso de Validación</SelectItem>
                            <SelectItem value="AUDIT_TRAIL">Auditoría</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Formato</label>
                    <Select
                        value={format}
                        onValueChange={(value) => setFormat(value as ReportFormat)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione formato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PDF">PDF</SelectItem>
                            <SelectItem value="EXCEL">Excel</SelectItem>
                            <SelectItem value="CSV">CSV</SelectItem>
                            <SelectItem value="JSON">JSON</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Fecha Inicio</label>
                        <DatePicker
                            date={dateRange.start}
                            setDate={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Fecha Fin</label>
                        <DatePicker
                            date={dateRange.end}
                            setDate={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                        />
                    </div>
                </div>

                <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={isLoading}
                >
                    {isLoading ? "Generando..." : "Generar Reporte"}
                </Button>
            </div>
        </Card>
    );
}
