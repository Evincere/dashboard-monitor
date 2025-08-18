'use client';

import { apiUrl } from "@/lib/utils";

import { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { RefreshCw, Users, UserCheck, Clock, CheckCircle, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InscriptionStats {
  totalUsers: number;
  totalInscriptions: number;
  inscriptionRate: number;
  statusBreakdown: {
    status: string;
    count: number;
    percentage: number;
    label: string;
    description: string;
  }[];
  readyForReview: number;
  pendingDocuments: number;
  timeline: {
    month: string;
    inscriptions: number;
    cumulative: number;
  }[];
  contestInfo?: {
    title: string;
    inscriptionPeriod: {
      start: string | null;
      end: string | null;
    };
    documentationPeriod: {
      start: string | null;
      end: string | null;
    };
    status: string;
  };
}

interface Contest {
  id: number;
  title: string;
  category: string;
  department: string;
  status: string;
  inscriptionCount: number;
  startDate: string | null;
  endDate: string | null;
  inscriptionStartDate: string | null;
  inscriptionEndDate: string | null;
}

// Colores para los diferentes estados
const STATUS_COLORS = {
  'COMPLETED_WITH_DOCS': '#10b981', // Verde - Listo para revisión
  'ACTIVE': '#3b82f6', // Azul - En proceso
  'COMPLETED_PENDING_DOCS': '#f59e0b', // Naranja - Documentación pendiente
  'APPROVED': '#06d6a0', // Verde claro - Aprobado
  'REJECTED': '#ef4444', // Rojo - Rechazado
  'CANCELLED': '#6b7280', // Gris - Cancelado
  'FROZEN': '#8b5cf6', // Púrpura - Congelado
  'PENDING': '#fbbf24', // Amarillo - Pendiente
};

const chartConfig = {
  inscriptions: {
    label: "Inscripciones",
    color: "hsl(var(--chart-1))",
  },
  cumulative: {
    label: "Acumulado",
    color: "hsl(var(--chart-2))",
  },
};

export function InscriptionStatsChart() {
  const [data, setData] = useState<InscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<string>('all');
  const [contestsLoading, setContestsLoading] = useState(true);
  const selectedContestRef = useRef<string>('all');

  const fetchContests = async () => {
    try {
      setContestsLoading(true);
      const response = await fetch(apiUrl('dashboard/contests-list'));
      const result = await response.json();

      if (result.success) {
        setContests(result.data);
      } else {
        console.error('Error fetching contests:', result.error);
      }
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setContestsLoading(false);
    }
  };

  const fetchInscriptionStats = async (contestId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const url = contestId && contestId !== 'all' 
        ? apiUrl(`dashboard/inscriptions-stats?contestId=${contestId}`)
        : apiUrl('dashboard/inscriptions-stats');
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError('Error al cargar los datos');
        console.error('Error fetching inscription stats:', result.error);
      }
    } catch (error) {
      setError('Error de conexión');
      console.error('Error fetching inscription stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContestChange = (value: string) => {
    setSelectedContest(value);
    selectedContestRef.current = value;
    fetchInscriptionStats(value);
  };

  useEffect(() => {
    fetchContests();
    fetchInscriptionStats();

    // Refresh every 60 seconds using ref to get current value
    const interval = setInterval(() => {
      fetchInscriptionStats(selectedContestRef.current);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Update ref when selectedContest changes
  useEffect(() => {
    selectedContestRef.current = selectedContest;
  }, [selectedContest]);

  if (error) {
    return (
      <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg h-full">
        <CardHeader>
          <CardTitle className="font-headline">Estado de Inscripciones</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg h-full">
        <CardHeader>
          <CardTitle className="font-headline">Estado de Inscripciones</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para el gráfico de área
  const timelineData = data.timeline.length > 0 ? data.timeline : [
    { month: 'Sin datos', inscriptions: 0, cumulative: 0 }
  ];

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="font-headline">Estado de Inscripciones</CardTitle>
            <CardDescription>
              Evolución y distribución de inscripciones por concurso
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {/* Selector de concursos */}
            {contests.length > 0 && (
              <Select value={selectedContest} onValueChange={handleContestChange} disabled={contestsLoading}>
                <SelectTrigger className="w-[300px] bg-input/90 border-white/20 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 opacity-50" />
                    <SelectValue placeholder={contestsLoading ? "Cargando concursos..." : "Seleccionar concurso"} />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-w-[400px]">
                  <SelectItem value="all" className="cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-medium">📊 Todos los Concursos</span>
                        <p className="text-xs text-muted-foreground mt-1">Vista consolidada de todos los datos</p>
                      </div>
                    </div>
                  </SelectItem>
                  {contests.map((contest) => (
                    <SelectItem key={contest.id} value={contest.id.toString()} className="cursor-pointer py-3">
                      <div className="flex items-start justify-between w-full">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{contest.title}</span>
                            <Badge 
                              variant={contest.status === 'ACTIVE' ? 'default' : 'secondary'} 
                              className="text-xs px-2 py-0.5"
                            >
                              {contest.status === 'ACTIVE' ? 'Activo' : 
                               contest.status === 'CLOSED' ? 'Cerrado' : 
                               contest.status === 'FINISHED' ? 'Finalizado' : contest.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                            <span>📍 {contest.department}</span>
                            <span>👥 {contest.inscriptionCount} inscripciones</span>
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Métricas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">Total Usuarios</span>
            </div>
            <p className="text-2xl font-bold">{data.totalUsers.toLocaleString('es')}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Inscripciones</span>
            </div>
            <p className="text-2xl font-bold">{data.totalInscriptions.toLocaleString('es')}</p>
            <Badge variant="secondary" className="text-xs">
              {data.inscriptionRate}% del total
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-muted-foreground">Listas para Revisión</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{data.readyForReview.toLocaleString('es')}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-muted-foreground">Inscripciones con Documentación Pendiente</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{data.pendingDocuments.toLocaleString('es')}</p>
          </div>
        </div>

        {/* Información del concurso si está seleccionado */}
        {data.contestInfo && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
              <h4 className="font-semibold mb-2 text-blue-300">📋 Información del Concurso: {data.contestInfo.title}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">📅 Período de Inscripción:</span>
                  <div className="mt-1">
                    {data.contestInfo.inscriptionPeriod.start && data.contestInfo.inscriptionPeriod.end ? (
                      <span className="font-mono text-xs">
                        {new Date(data.contestInfo.inscriptionPeriod.start).toLocaleDateString('es-ES')} - {' '}
                        {new Date(data.contestInfo.inscriptionPeriod.end).toLocaleDateString('es-ES')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No definido</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">⏳ Período de Documentación:</span>
                  <div className="mt-1">
                    {data.contestInfo.documentationPeriod.start && data.contestInfo.documentationPeriod.end ? (
                      <span className="font-mono text-xs">
                        {new Date(data.contestInfo.documentationPeriod.start).toLocaleDateString('es-ES')} - {' '}
                        {new Date(data.contestInfo.documentationPeriod.end).toLocaleDateString('es-ES')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">3 días hábiles después del cierre</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gráfico de timeline */}
        {data.timeline.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">
              {data.contestInfo 
                ? `Evolución Diaria - ${data.contestInfo.title}` 
                : 'Evolución de Inscripciones (últimos 6 meses)'
              }
            </h4>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inscriptionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    className="text-xs"
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <div className="grid gap-2">
                              <div className="font-medium">{label}</div>
                              {payload.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-sm">
                                    {entry.dataKey === 'inscriptions' ? 'Nuevas: ' : 'Total: '}
                                    <span className="font-bold">{entry.value}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inscriptions"
                    stroke="hsl(var(--chart-1))"
                    fillOpacity={1}
                    fill="url(#inscriptionsGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}

        {/* Estados de inscripciones */}
        <div>
          <h4 className="text-sm font-medium mb-3">Distribución por Estado</h4>
          <div className="space-y-2">
            {data.statusBreakdown.map((status) => (
              <div 
                key={status.status}
                className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-white/5 to-transparent border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[status.status as keyof typeof STATUS_COLORS] || '#6b7280' }}
                  />
                  <div>
                    <span className="text-sm font-medium">{status.label}</span>
                    <p className="text-xs text-muted-foreground">{status.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{status.count}</span>
                  <span className="text-xs text-muted-foreground ml-1">({status.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
