
'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableRow,
  } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';


const recentUsers = [
    { name: 'Sofía Ramirez', email: 'sofia.r@example.com', date: 'Hace 5 min' },
    { name: 'Mateo González', email: 'mateo.g@example.com', date: 'Hace 12 min' },
    { name: 'Valentina Fernández', email: 'valentina.f@example.com', date: 'Hace 28 min' },
    { name: 'Lucas Rodriguez', email: 'lucas.r@example.com', date: 'Hace 45 min' },
]

const recentInscriptions = [
    { name: 'Juan Pérez', contest: 'Juez de Cámara', date: 'Hace 2 min' },
    { name: 'María Gómez', contest: 'Fiscal Auxiliar', date: 'Hace 8 min' },
    { name: 'Carlos Lopez', contest: 'Juez de Cámara', date: 'Hace 15 min' },
    { name: 'Ana Martinez', contest: 'Defensor Oficial', date: 'Hace 22 min' },
]

export function RecentActivityWidget() {
    return (
        <Card className="bg-card/60 backdrop-blur-sm border-white/10 shadow-lg h-full">
            <CardHeader>
                <CardTitle className="font-headline">Actividad Reciente</CardTitle>
                <CardDescription>Últimos usuarios e inscripciones.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="users">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="users">Usuarios</TabsTrigger>
                        <TabsTrigger value="inscriptions">Inscripciones</TabsTrigger>
                    </TabsList>
                    <TabsContent value="users">
                       <Table>
                           <TableBody>
                                {recentUsers.map(user => (
                                    <TableRow key={user.email}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">{user.date}</TableCell>
                                    </TableRow>
                                ))}
                           </TableBody>
                       </Table>
                    </TabsContent>
                    <TabsContent value="inscriptions">
                         <Table>
                           <TableBody>
                                {recentInscriptions.map(inscription => (
                                    <TableRow key={inscription.name + inscription.contest}>
                                        <TableCell>
                                            <p className="font-medium">{inscription.name}</p>
                                            <p className="text-xs text-muted-foreground">{inscription.contest}</p>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">{inscription.date}</TableCell>
                                    </TableRow>
                                ))}
                           </TableBody>
                       </Table>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
