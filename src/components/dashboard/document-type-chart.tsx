
'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { RefreshCw } from "lucide-react"
import { DocumentTypeBadge, useDocumentTypeInfo } from "@/components/ui/document-type-badge"

interface DocumentCategory {
  name: string;
  count: number;
  percentage: number;
}

const chartConfig = {
  count: {
    label: "Documentos",
    color: "hsl(var(--chart-1))",
  },
}

export function DocumentTypeChart() {
  const [data, setData] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocumentsByCategory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/dashboard/documents-by-category');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError('Error al cargar los datos');
        console.error('Error fetching documents by category:', result.error);
      }
    } catch (error) {
      setError('Error de conexión');
      console.error('Error fetching documents by category:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentsByCategory();

    // Refresh every 60 seconds
    const interval = setInterval(fetchDocumentsByCategory, 60000);
    return () => clearInterval(interval);
  }, []);

  // Transform data for the chart (keep names short for display)
  const chartData = data.map(item => ({
    type: item.name.length > 20 ? `${item.name.substring(0, 17)}...` : item.name,
    count: item.count,
    fullName: item.name,
    percentage: item.percentage
  }));

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-headline">Documentos por Categoría</CardTitle>
            <CardDescription>Distribución de los tipos de documentos subidos</CardDescription>
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>{error}</p>
          </div>
        ) : chartData.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No hay datos disponibles</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
            {data.map((item, index) => {
              const maxCount = Math.max(...data.map(d => d.count));
              const widthPercentage = (item.count / maxCount) * 100;
              
              return (
                <div 
                  key={item.name} 
                  className="group relative p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/2 border border-white/10 backdrop-blur-sm hover:from-white/8 hover:to-white/4 transition-all duration-300"
                >
                  {/* Background progress bar */}
                  <div 
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 to-transparent transition-all duration-500 ease-out"
                    style={{ width: `${widthPercentage}%` }}
                  />
                  
                  {/* Content */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DocumentTypeBadge 
                        documentType={item.name} 
                        variant="compact"
                        className="shadow-md"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {item.percentage}% del total
                          </span>
                          {useDocumentTypeInfo(item.name).required && (
                            <span className="text-xs text-yellow-400 font-medium">
                              • Obligatorio
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold text-foreground">
                        {item.count.toLocaleString('es')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        documentos
                      </span>
                    </div>
                  </div>
                  
                  {/* Glassmorphism overlay on hover */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              );
            })}
            
            {/* Summary footer */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  Total de documentos:
                </span>
                <span className="font-bold text-foreground">
                  {data.reduce((sum, item) => sum + item.count, 0).toLocaleString('es')}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
