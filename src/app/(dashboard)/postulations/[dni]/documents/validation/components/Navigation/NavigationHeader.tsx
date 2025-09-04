import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileText, User, Calendar, RotateCcw } from 'lucide-react';
import { ValidationProgress } from '@/components/validation/ValidationProgress';
import { Badge } from '@/components/ui/badge';
import { useParams } from 'next/navigation';

interface NavigationHeaderProps {
  onBack: () => void;
  onDownload?: () => void;
  onRevertPostulation?: () => void;
  postulantStatus?: string;
  progress: {
    current: number;
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}

export const NavigationHeader = ({
  onBack,
  onDownload,
  onRevertPostulation,
  postulantStatus,
  progress,
}: NavigationHeaderProps) => {
  const { dni } = useParams() as { dni: string };
  const completionPercentage = progress.total > 0 
    ? Math.round(((progress.approved + progress.rejected) / progress.total) * 100) 
    : 0;

  return (
    <div className="bg-card border-b border-border px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left section with back button and title */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          
          <div className="hidden sm:block w-px h-6 bg-border" />
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Validación de Documentos</h1>
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>DNI: {dni}</span>
            </div>
          </div>
        </div>

        {/* Center section with progress */}
        <div className="flex-1 max-w-md mx-8 hidden lg:block">
          <ValidationProgress {...progress} />
        </div>

        {/* Right section with actions and stats */}
        <div className="flex items-center gap-4">
          {/* Progress stats */}
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
              {completionPercentage}% completado
            </Badge>
            
            <div className="text-sm text-muted-foreground">
              {progress.current + 1}/{progress.total}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Revert Postulation Button - Only show if not PENDING */}
            {onRevertPostulation && postulantStatus && postulantStatus !== 'PENDING' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRevertPostulation}
                title="Revertir estado de la postulación a pendiente"
                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Revertir Postulación</span>
              </Button>
            )}
            
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                title="Descargar documento actual"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Descargar</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile progress section */}
      <div className="lg:hidden mt-4 pt-4 border-t border-border">
        <ValidationProgress {...progress} />
      </div>
    </div>
  );
};
