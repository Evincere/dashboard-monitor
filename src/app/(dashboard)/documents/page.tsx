
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

interface Document {
    id: string; // binary(16)
    name: string;
    user: string; // From user_entity
    document_type: string; // From document_types
    uploadDate: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    size: string;
}

const initialDocuments: Document[] = [
    { id: 'doc-uuid-001', name: 'CV_Juan_Perez.pdf', user: 'jperez', document_type: 'CV', uploadDate: '2024-07-15', size: '1.2 MB', status: 'APPROVED' },
    { id: 'doc-uuid-002', name: 'Titulo_Abogado_Maria_Gomez.pdf', user: 'mgomez', document_type: 'TITULO_GRADO', uploadDate: '2024-07-14', size: '850 KB', status: 'PENDING' },
    { id: 'doc-uuid-003', name: 'Cert_Antecedentes_Carlos_Lopez.jpg', user: 'clopez', document_type: 'CERT_ANTECEDENTES', uploadDate: '2024-07-12', size: '2.5 MB', status: 'REJECTED' },
    { id: 'doc-uuid-004', name: 'DNI_Ana_Martinez.pdf', user: 'amartinez', document_type: 'DNI', uploadDate: '2024-07-15', size: '500 KB', status: 'APPROVED' },
    { id: 'doc-uuid-005', name: 'Postgrado_Derecho_Penal_Luis_Fernandez.pdf', user: 'lfernandez', document_type: 'TITULO_POSGRADO', uploadDate: '2024-07-13', size: '3.1 MB', status: 'APPROVED' },
];

const docStats = {
    totalDocs: '499',
    totalSize: '25.3 GB'
};

function DocumentsPageContent() {
    const [documents, setDocuments] = useState(initialDocuments);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const searchParams = useSearchParams();

    useEffect(() => {
        const userFilter = searchParams.get('user');
        if (userFilter) {
            setSearchTerm(userFilter);
        }
    }, [searchParams]);

    const handleDelete = (id: string) => {
        setDocuments(documents.filter(doc => doc.id !== id));
        toast({
            title: 'Documento Eliminado',
            description: 'El documento ha sido eliminado permanentemente.',
            variant: 'destructive',
        });
    };

    const getStatusBadgeVariant = (status: Document['status']) => {
        switch (status) {
            case 'APPROVED': return 'default';
            case 'PENDING': return 'secondary';
            case 'REJECTED': return 'destructive';
            default: return 'outline';
        }
    }

    const filteredDocuments = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <CardDescription>Filtre por nombre de archivo, usuario o tipo de documento.</CardDescription>
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
                        <TableHead>Tipo de Documento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha de Carga</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDocuments.map((doc) => (
                            <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.name}</TableCell>
                            <TableCell><Badge variant="secondary">{doc.user}</Badge></TableCell>
                            <TableCell>{doc.document_type}</TableCell>
                             <TableCell><Badge variant={getStatusBadgeVariant(doc.status)}>{doc.status}</Badge></TableCell>
                            <TableCell className="font-mono">{doc.uploadDate}</TableCell>
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

export default function DocumentsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DocumentsPageContent />
        </Suspense>
    );
}
