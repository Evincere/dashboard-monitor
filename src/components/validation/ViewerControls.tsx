import { Button } from '@/components/ui/button';
import { Minimize, Maximize } from 'lucide-react';

interface ViewerControlsProps {
  documentType: string;
  isFullscreen: boolean;
  onFullscreenToggle?: (fullscreen: boolean) => void;
}

export const ViewerControls = ({
  documentType,
  isFullscreen,
  onFullscreenToggle,
}: ViewerControlsProps) => {
  return (
    <div className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{documentType}</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onFullscreenToggle?.(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
