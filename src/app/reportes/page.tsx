"use client";

import { useEffect, useState } from 'react';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { ReportList } from '@/components/reports/ReportList';
import { GeneratedReport, ReportFormat, ReportType } from '@/lib/reports/types';
import { useToast } from "@/components/ui/use-toast";

export default function ReportesPage() {
    const { toast } = useToast();
    const [reports, setReports] = useState<GeneratedReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReports = async () => {
        try {
            const response = await fetch('/dashboard-monitor/api/reports/list', {
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache',
                }
            });

            if (response.status === 401) {
                toast({
                    title: "Sesión expirada",
                    description: "Por favor, vuelva a iniciar sesión",
                    variant: "destructive"
                });
                sessionStorage.setItem('returnTo', window.location.pathname);
                window.location.href = '/login';
                return;
            }

            if (!response.ok) throw new Error('Error al cargar reportes');

            const result = await response.json();
            console.log('API Response:', result); // Debug

            // Corregir: extraer la propiedad 'data' de la respuesta
            if (result.success && Array.isArray(result.data)) {
                setReports(result.data);
            } else {
                console.error('Invalid response format:', result);
                setReports([]); // Fallback a array vacío
                toast({
                    title: "Error",
                    description: "Formato de respuesta inválido",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            setReports([]); // Fallback importante
            toast({
                title: "Error",
                description: "No se pudieron cargar los reportes",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleGenerate = async (type: ReportType, format: ReportFormat, filters: any) => {
        try {
            const response = await fetch('/dashboard-monitor/api/reports/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                },
                credentials: 'include',
                body: JSON.stringify({ type, format, filters }),
            });

            if (response.status === 401) {
                toast({
                    title: "Sesión expirada",
                    description: "Por favor, vuelva a iniciar sesión",
                    variant: "destructive"
                });
                sessionStorage.setItem('returnTo', window.location.pathname);
                window.location.href = '/login';
                return;
            }

            if (!response.ok) throw new Error('Error al generar reporte');

            const result = await response.json();
            if (result.success) {
                toast({
                    title: "Reporte generado",
                    description: "El reporte se está procesando",
                    variant: "default"
                });
                // Esperar un momento antes de refrescar para que aparezca el reporte
                setTimeout(fetchReports, 1000);
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "No se pudo generar el reporte",
                variant: "destructive"
            });
        }
    };

    const handleDownload = async (reportId: string) => {
        try {
            const response = await fetch(`/dashboard-monitor/api/reports/${reportId}/download`);
            if (!response.ok) throw new Error('Error al descargar reporte');

            // Obtener el nombre del archivo de las cabeceras
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : `report-${reportId}`;

            // Crear y descargar el blob
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast({
                title: "Descarga completada",
                description: `Archivo ${filename} descargado correctamente`,
                variant: "default"
            });
        } catch (error) {
            console.error('Error downloading report:', error);
            toast({
                title: "Error",
                description: "No se pudo descargar el reporte",
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container py-8">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-8 space-y-8">
            <h1 className="text-4xl font-bold">Sistema de Reportes</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <ReportGenerator onGenerate={handleGenerate} />
                </div>
                <div className="lg:col-span-2">
                    <ReportList
                        reports={reports}
                        onDownload={handleDownload}
                        onRefresh={fetchReports}
                    />
                </div>
            </div>
        </div>
    );
}
