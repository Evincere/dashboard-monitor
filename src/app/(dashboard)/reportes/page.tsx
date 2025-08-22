// ================================================
// PÁGINA PRINCIPAL SISTEMA REPORTES
// ================================================

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Search, Settings, FileText, AlertTriangle } from 'lucide-react';
import { ExecutiveDashboard } from '@/components/reports/dashboard/ExecutiveDashboard';

type TabValue = 'dashboard' | 'reports' | 'diagnostics' | 'config';

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');

  const tabs = [
    {
      id: 'dashboard' as TabValue,
      label: 'Dashboard',
      icon: BarChart3,
      description: 'Métricas en tiempo real y KPIs principales',
    },
    {
      id: 'reports' as TabValue,
      label: 'Reportes',
      icon: FileText,
      description: 'Generación y gestión de reportes administrativos',
    },
    {
      id: 'diagnostics' as TabValue,
      label: 'Diagnóstico',
      icon: Search,
      description: 'Herramientas de análisis y detección de problemas',
    },
    {
      id: 'config' as TabValue,
      label: 'Configuración',
      icon: Settings,
      description: 'Configuraciones del sistema y plantillas',
    },
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sistema de Reportes Administrativos</h1>
        <p className="text-muted-foreground">
          Herramientas avanzadas para análisis y reporte del proceso de validación de documentos
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Content: Dashboard Ejecutivo */}
        <TabsContent value="dashboard" className="flex-1 space-y-4">
          <ExecutiveDashboard />
        </TabsContent>

        {/* Tab Content: Reportes */}
        <TabsContent value="reports" className="flex-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generación de Reportes
              </CardTitle>
              <CardDescription>
                Generar reportes oficiales y especializados del proceso de validación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Funcionalidad de reportes en desarrollo</p>
                <p className="text-sm">Próximamente: generación automática de reportes oficiales</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content: Diagnóstico */}
        <TabsContent value="diagnostics" className="flex-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Herramientas de Diagnóstico
              </CardTitle>
              <CardDescription>
                Análisis automático y detección de problemas técnicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Herramientas de diagnóstico en desarrollo</p>
                <p className="text-sm">Próximamente: detección automática de problemas técnicos</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content: Configuración */}
        <TabsContent value="config" className="flex-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuración del Sistema
              </CardTitle>
              <CardDescription>
                Configuraciones avanzadas y gestión de plantillas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Settings className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Panel de configuración en desarrollo</p>
                <p className="text-sm">Próximamente: gestión de plantillas y automatización</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
