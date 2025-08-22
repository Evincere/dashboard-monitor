"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, FileSpreadsheet, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GeneratedReport, ReportFormat } from '@/lib/reports/types';

interface ReportListProps {
    reports: GeneratedReport[];
    onDownload: (reportId: string) => Promise<void>;
    onRefresh: () => Promise<void>;
}

export function ReportList({ reports, onDownload, onRefresh }: ReportListProps) {
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleDownload = async (reportId: string) => {
        setDownloadingId(reportId);
        try {
            await onDownload(reportId);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setIsRefreshing(false);
        }
    };

    const getFormatIcon = (format: ReportFormat) => {
        switch (format) {
            case 'PDF':
                return <FileText className="w-4 h-4" />;
            case 'EXCEL':
            case 'CSV':
                return <FileSpreadsheet className="w-4 h-4" />;
            default:
                return <FileDown className="w-4 h-4" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge variant="success">Completado</Badge>;
            case 'GENERATING':
                return <Badge variant="warning">Generando</Badge>;
            case 'FAILED':
                return <Badge variant="destructive">Error</Badge>;
            default:
                return null;
        }
    };

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Reportes Generados</h2>
                <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Actualizar
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Formato</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Generado</TableHead>
                        <TableHead>Tamaño</TableHead>
                        <TableHead>Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports.map((report) => (
                        <TableRow key={report.id}>
                            <TableCell>{report.reportType}</TableCell>
                            <TableCell className="flex items-center gap-2">
                                {getFormatIcon(report.format)}
                                {report.format}
                            </TableCell>
                            <TableCell>{getStatusBadge(report.status)}</TableCell>
                            <TableCell>
                                {new Date(report.generatedAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                                {report.fileSize ? `${Math.round(report.fileSize / 1024)} KB` : '-'}
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownload(report.id)}
                                    disabled={report.status !== 'COMPLETED' || downloadingId === report.id}
                                >
                                    {downloadingId === report.id ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Descargando...
                                        </>
                                    ) : (
                                        <>
                                            <FileDown className="w-4 h-4 mr-2" />
                                            Descargar
                                        </>
                                    )}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {reports.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                                No hay reportes generados
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}
