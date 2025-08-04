
'use client';

import { useState } from 'react';
import { FolderKanban, Search, FileDown, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const initialDocuments = [
    { id: 'doc-001', name: 'CV_Juan_Perez.pdf', user: 'jperez', contest: 'Juez de Cámara', uploadDate: '2024-07-15', size: '1.2 MB' },
    { id: 'doc-002', name: 'Titulo_Abogado_Maria_Gomez.pdf', user: 'mgomez', contest: 'Fiscal Auxiliar', uploadDate: '2024-07-14', size: '850 KB' },
    { id: 'doc-003', name: 'Certificado_Antecedentes_Carlos_Lopez.jpg', user: 'clopez', contest: 'Defensor Oficial', uploadDate: '2024-07-12', size: '2.5 MB' },
    { id: 'doc-004', name: 'DNI_Ana_Martinez.pdf', user: 'amartinez', contest: 'Juez de Cámara', uploadDate: '2024-07-15', size: '500 KB' },
    { id: 'doc-005', name: 'Postgrado_Derecho_Penal_Luis_Fernandez.pdf', user: 'lfernandez', contest: 'Fiscal Auxiliar', uploadDate: '2024-07-13', size: '3.1 MB' },
];

const docStats = {
    totalDocs: '15,829',
    totalSize: '25.3 GB'
};

export default function DocumentsPage() {
    const [documents, setDocuments] = useState(initialDocuments);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const handleDelete = (id: string) => {
        setDocuments(documents.filter(doc => doc.id !== id));
        toast({
            title: 'Documento Eliminado',
            description: 'El documento ha sido eliminado permanentemente.',
            variant: 'destructive',
        });
    };

    const filteredDocuments = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.contest.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
    <div className="flex flex-col h-full p-4 md:p-8">
        <header className="mb-8">
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                <FolderKanban className="w-8 h-8 text-primary" />
                Gestión de Documentos
            </h1>
            <p className="text-muted-foreground mt-2">
                Busque, visualice y administre todos los documentos cargados por los usuarios.
            </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
             <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg md:col-span-1">
                <CardHeader>
                    <CardTitle className="font-headline">Estadísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="p-4 bg-background/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Total de Documentos</p>
                        <p className="text-3xl font-bold font-headline">{docStats.totalDocs}</p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Espacio Utilizado</p>
                        <p className="text-3xl font-bold font-headline">{docStats.totalSize}</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg md:col-span-2">
                <CardHeader>
                    <CardTitle className="font-headline">Buscar Documentos</CardTitle>
                    <CardDescription>Filtre por nombre de archivo, usuario o concurso.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar documentos..."
                            className="pl-10 w-full bg-input/80 border-white/10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg flex-grow">
            <CardHeader>
                <CardTitle className="font-headline">Archivos de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre del Archivo</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Concurso</TableHead>
                        <TableHead>Fecha de Carga</TableHead>
                        <TableHead>Tamaño</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDocuments.map((doc) => (
                            <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.name}</TableCell>
                            <TableCell><Badge variant="secondary">{doc.user}</Badge></TableCell>
                            <TableCell>{doc.contest}</TableCell>
                            <TableCell className="font-mono">{doc.uploadDate}</TableCell>
                            <TableCell className="font-mono">{doc.size}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="icon">
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">Ver</span>
                                </Button>
                                <Button variant="outline" size="icon">
                                    <FileDown className="h-4 w-4" />
                                    <span className="sr-only">Descargar</span>
                                </Button>
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Eliminar</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está seguro de eliminar este documento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. El archivo '{doc.name}' será eliminado permanentemente.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(doc.id)}>
                                        Eliminar
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
    );
}
