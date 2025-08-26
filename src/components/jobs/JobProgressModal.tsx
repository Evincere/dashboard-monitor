import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download,
  X
} from 'lucide-react';
import { Job } from '@/lib/jobs/types';

interface JobProgressModalProps {
  jobId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (downloadUrl: string, fileName: string) => void;
}

export default function JobProgressModal({ 
  jobId, 
  isOpen, 
  onClose, 
  onDownload 
}: JobProgressModalProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId || !isOpen) {
      setJob(null);
      setLoading(true);
      return;
    }

    const pollJob = async () => {
      try {
        const response = await fetch(`/dashboard-monitor/api/jobs/${jobId}`);
        const result = await response.json();
        
        if (result.success) {
          setJob(result.data);
          setLoading(false);
          
          // Continue polling if job is still running
          if (result.data.status === 'queued' || result.data.status === 'running') {
            setTimeout(pollJob, 2000); // Poll every 2 seconds
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error polling job:', error);
        setLoading(false);
      }
    };

    pollJob();
  }, [jobId, isOpen]);

  const handleCancel = async () => {
    if (!jobId) return;
    
    try {
      await fetch(`/dashboard-monitor/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
    
    onClose();
  };

  const handleDownload = () => {
    if (job?.result?.downloadUrl && job?.result?.fileName && onDownload) {
      onDownload(job.result.downloadUrl, job.result.fileName);
    }
    onClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'cancelled':
        return <X className="h-6 w-6 text-gray-500" />;
      default:
        return <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preparando Backup</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3 text-muted-foreground">Cargando...</span>
            </div>
          ) : job ? (
            <>
              <div className="flex items-center gap-3">
                {getStatusIcon(job.status)}
                <div className="flex-1">
                  <p className="font-medium">{job.message}</p>
                  <p className="text-sm text-muted-foreground">
                    Estado: {job.status === 'completed' ? 'Completado' : 
                            job.status === 'failed' ? 'Falló' : 
                            job.status === 'cancelled' ? 'Cancelado' : 'En progreso'}
                  </p>
                </div>
              </div>

              {(job.status === 'queued' || job.status === 'running') && (
                <div className="space-y-2">
                  <Progress value={job.progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    {job.progress}% completado
                  </p>
                </div>
              )}

              {job.status === 'failed' && job.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{job.error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                {job.status === 'completed' && job.result?.downloadUrl ? (
                  <>
                    <Button variant="outline" onClick={onClose}>
                      Cerrar
                    </Button>
                    <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </>
                ) : (job.status === 'queued' || job.status === 'running') ? (
                  <>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={onClose}>
                    Cerrar
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se pudo cargar la información del trabajo</p>
              <Button variant="outline" onClick={onClose} className="mt-4">
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
