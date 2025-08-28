'use client';

import { useState, useEffect } from 'react';
import { cn, apiUrl } from '@/lib/utils';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Dialog Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

// Dropdown Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
import {
  Download,
  Trash2,
  RefreshCw,
  Plus,
  Database,
  FolderOpen,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  FileText,
  Archive,
  Package
} from 'lucide-react';

// Hooks
import { useToast } from '@/hooks/use-toast';

interface BackupInfo {
  id: string;
  name: string;
  description?: string;
  date: string;
  size: string;
  sizeBytes: number;
  integrity: 'verified' | 'pending' | 'failed';
  type: 'full' | 'incremental';
  includesDocuments: boolean;
  path: string;
}

interface DocumentTypeOption {
  key: string;
  label: string;
  description: string;
  estimatedSize: string;
}

interface CreateBackupForm {
  name: string;
  description: string;
  includeDocuments: boolean;
  documentTypes: {
    documents: boolean;
    cvDocuments: boolean;
    profileImages: boolean;
  };
}

// Document type options with estimated sizes
const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  {
    key: 'documents',
    label: 'Documentos de Postulación',
    description: 'Documentos principales de las postulaciones (DNI, certificados, etc.)',
    estimatedSize: '~1.1GB'
  },
  {
    key: 'cvDocuments',
    label: 'Currículums Vitae',
    description: 'CVs y documentos profesionales',
    estimatedSize: '~141MB'
  },
  {
    key: 'profileImages',
    label: 'Imágenes de Perfil',
    description: 'Fotos de perfil y documentos visuales',
    estimatedSize: '~1.6MB'
  }
];

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBackupForm>({
    name: '',
    description: '',
    includeDocuments: true,
    documentTypes: {
      documents: true,
      cvDocuments: true,
      profileImages: false
    }
  });
  const { toast } = useToast();

  // Async download states

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl('backups'));
      const result = await response.json();

      if (result.success) {
        setBackups(result.data);
      } else {
        toast({
          title: 'Error',
          description: 'Error al cargar los backups',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los backups',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    if (!createForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del backup es requerido',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    // Validate document types selection
    if (createForm.includeDocuments && !Object.values(createForm.documentTypes).some(Boolean)) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar al menos un tipo de documento',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(apiUrl('backups'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Backup creado exitosamente',
          duration: 5000,
        });
        setCreateDialogOpen(false);
        setCreateForm({
          name: '',
          description: '',
          includeDocuments: true,
          documentTypes: {
            documents: true,
            cvDocuments: true,
            profileImages: false
          }
        });
        fetchBackups();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Error al crear el backup',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: 'Error',
        description: 'Error al crear el backup',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setCreating(false);
    }
  };

  // Direct download function - Enhanced for better UX
  const downloadBackup = async (backupId: string, backupName: string, downloadType: string = 'auto') => {
    try {
      setDownloading(backupId);
      
      // Obtener información del backup para mostrar tamaño
      const backup = backups.find(b => b.id === backupId);
      const estimatedTimeText = backup && backup.sizeBytes > 50 * 1024 * 1024 
        ? `Tiempo estimado: ${Math.ceil(backup.sizeBytes / (5 * 1024 * 1024))}min aprox.` 
        : '';

      const fileSizeText = backup ? backup.size : 'calculando...';
      
      // Mostrar toast informativo mejorado
      toast({
        title: '🚀 Preparando descarga',
        description: `Generando archivo de ${fileSizeText}. ${estimatedTimeText} Por favor espere...`,
        duration: 8000,
      });

      // Create download URL
      const url = apiUrl(`backups/download?backup=${backupId}&type=${downloadType}`);

      // Create invisible download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${backupName}_${downloadType}_${new Date().toISOString().slice(0, 10)}.zip`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Mostrar mensaje de progreso adicional para archivos grandes
      if (backup && backup.sizeBytes > 100 * 1024 * 1024) { // > 100MB
        setTimeout(() => {
          toast({
            title: '⏱️  Archivo grande detectado',
            description: 'El diálogo de descarga aparecerá en unos momentos para archivos grandes',
            duration: 5000,
          });
        }, 2000);
      }

    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({
        title: 'Error',
        description: 'Error al descargar el backup',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      // Mantener el estado de descarga un poco más para UX
      setTimeout(() => {
        setDownloading(null);
      }, 3000);
    }
  };


  const restoreBackup = async (backupId: string) => {
    try {
      setRestoring(backupId);
      const response = await fetch(apiUrl('backups'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backupId,
          confirmRestore: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Backup restaurado exitosamente',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Error al restaurar el backup',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast({
        title: 'Error',
        description: 'Error al restaurar el backup',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setRestoring(null);
    }
  };

  const deleteBackup = async (backupId: string) => {
    try {
      setDeleting(backupId);
      const response = await fetch(apiUrl(`backups?id=${backupId}`), {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Backup eliminado exitosamente',
          duration: 5000,
        });
        fetchBackups();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Error al eliminar el backup',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar el backup',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setDeleting(null);
    }
  };

  const getIntegrityIcon = (integrity: string) => {
    switch (integrity) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getIntegrityBadge = (integrity: string) => {
    switch (integrity) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800">Verificado</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fallido</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Database className="w-8 h-8 text-primary" />
            Gestión de Backups
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra y gestiona las copias de seguridad del sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => fetchBackups()}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Backup
          </Button>
        </div>
      </header>

      <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg flex-grow">
        <CardContent className="p-6">
          {loading && backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Cargando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Database className="w-8 h-8 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay backups disponibles.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {backup.type === 'full' ? (
                            <Package className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Archive className="w-4 h-4 text-muted-foreground" />
                          )}
                          {backup.name}
                        </div>
                        {backup.description && (
                          <span className="text-xs text-muted-foreground block mt-1">
                            {backup.description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {backup.type === 'full' ? 'Completo' : 'Incremental'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {new Date(backup.date).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono">{backup.size}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getIntegrityIcon(backup.integrity)}
                          {getIntegrityBadge(backup.integrity)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {backup.includesDocuments ? (
                          <Badge variant="default" className="bg-blue-100 text-blue-800">
                            Incluidos
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No incluidos</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => downloadBackup(backup.id, backup.name)}>
                              <Download className="w-4 h-4 mr-2" />
                              Descargar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => restoreBackup(backup.id)}>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Restaurar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteBackup(backup.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Backup</DialogTitle>
            <DialogDescription>
              Configura los detalles del nuevo backup a crear.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Nombre del backup"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descripción o notas adicionales"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeDocuments"
                checked={createForm.includeDocuments}
                onCheckedChange={(checked) =>
                  setCreateForm({ ...createForm, includeDocuments: checked as boolean })
                }
              />
              <Label htmlFor="includeDocuments">Incluir documentos</Label>
            </div>
            {createForm.includeDocuments && (
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium">Tipos de documentos a incluir:</h4>
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <div key={option.key} className="flex items-start gap-2">
                    <Checkbox
                      id={option.key}
                      checked={createForm.documentTypes[option.key as keyof typeof createForm.documentTypes]}
                      onCheckedChange={(checked) =>
                        setCreateForm({
                          ...createForm,
                          documentTypes: {
                            ...createForm.documentTypes,
                            [option.key]: checked as boolean
                          }
                        })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor={option.key} className="text-sm">
                        {option.label}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {option.estimatedSize}
                        </span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={createBackup} disabled={creating}>
              {creating && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              Crear Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
