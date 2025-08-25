// ================================================
// PÁGINA REPORTES - INTERFAZ LIMPIA Y PROFESIONAL
// ================================================

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Search, Settings, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { ExecutiveDashboard } from '@/components/reports/dashboard/ExecutiveDashboard';
import { ReportGeneratorEnhanced } from '@/components/reports/ReportGeneratorEnhanced';

type TabValue = 'dashboard' | 'reports' | 'diagnostics' | 'config';

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('reports');

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
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold tracking-tight">Sistema de Reportes Administrativos</h1>
        </div>
        <p className="text-muted-foreground">
          Genera, visualiza y gestiona reportes del sistema de concursos
        </p>
      </div>

      {/* Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Descriptions */}
        <div className="mt-2">
          {tabs.map((tab) => (
            activeTab === tab.id && (
              <p key={tab.id} className="text-sm text-muted-foreground">
                {tab.description}
              </p>
            )
          ))}
        </div>

        {/* Tab Contents */}
        <div className="mt-6">
          <TabsContent value="dashboard" className="space-y-6">
            <ExecutiveDashboard />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Enhanced Report Generator */}
            <ReportGeneratorEnhanced />
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Herramientas de Diagnóstico
                </CardTitle>
                <CardDescription>
                  Sistema de diagnóstico - Próximamente disponible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Funcionalidad en desarrollo</p>
                  <p className="text-sm text-gray-500">
                    Las herramientas de diagnóstico estarán disponibles en la próxima actualización
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  Configuración del Sistema
                </CardTitle>
                <CardDescription>
                  Configuraciones y plantillas del sistema de reportes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Configuraciones disponibles</p>
                  <p className="text-sm text-gray-500">
                    Accede a las configuraciones del sistema desde el menú principal
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
