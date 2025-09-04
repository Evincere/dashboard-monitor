import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NavigationFooterProps {
  onNext: () => void;
  onPrev: () => void;
  currentIndex: number;
  total: number;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export const NavigationFooter = ({
  onNext,
  onPrev,
  currentIndex,
  total,
  canGoNext,
  canGoPrev,
}: NavigationFooterProps) => {
  return (
    <div className="bg-card border-t border-border px-6 py-4 shadow-sm">
      <div className="flex justify-between items-center">
        {/* Previous button */}
        <Button
          onClick={onPrev}
          variant="outline"
          className="flex items-center gap-2 min-w-32"
          disabled={!canGoPrev}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        {/* Center information */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {currentIndex + 1} de {total}
            </span>
          </div>
          
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            Documento {currentIndex + 1}
          </Badge>
        </div>

        {/* Next button */}
        <Button
          onClick={onNext}
          variant="outline"
          className="flex items-center gap-2 min-w-32"
          disabled={!canGoNext}
        >
          Siguiente
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
