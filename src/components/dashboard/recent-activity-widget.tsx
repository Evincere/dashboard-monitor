
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
import { FileText, User, UserCheck, Trophy } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'user' | 'inscription' | 'document' | 'contest';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

interface RecentActivityWidgetProps {
  activities?: ActivityItem[];
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'user':
      return <User className="h-4 w-4" />;
    case 'inscription':
      return <UserCheck className="h-4 w-4" />;
    case 'document':
      return <FileText className="h-4 w-4" />;
    case 'contest':
      return <Trophy className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'user':
      return 'text-blue-500';
    case 'inscription':
      return 'text-green-500';
    case 'document':
      return 'text-yellow-500';
    case 'contest':
      return 'text-purple-500';
    default:
      return 'text-gray-500';
  }
}

export function RecentActivityWidget({ activities = [] }: RecentActivityWidgetProps) {
  // Separate activities by type
  const recentUsers = activities.filter(a => a.type === 'user').slice(0, 4);
  const recentInscriptions = activities.filter(a => a.type === 'inscription').slice(0, 4);
  const allActivities = activities.slice(0, 6);
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
                                {recentUsers.length > 0 ? recentUsers.map(activity => (
                                    <TableRow key={activity.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback>{activity.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{activity.user?.name || activity.description}</p>
                                                    <p className="text-xs text-muted-foreground">{activity.user?.email || activity.title}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                          {formatRelativeTime(activity.timestamp)}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                                            No hay actividad reciente de usuarios
                                        </TableCell>
                                    </TableRow>
                                )}
                           </TableBody>
                       </Table>
                    </TabsContent>
                    <TabsContent value="inscriptions">
                         <Table>
                           <TableBody>
                                {recentInscriptions.length > 0 ? recentInscriptions.map(activity => (
                                    <TableRow key={activity.id}>
                                        <TableCell>
                                            <p className="font-medium">{activity.user?.name || activity.description}</p>
                                            <p className="text-xs text-muted-foreground">{activity.title}</p>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                          {formatRelativeTime(activity.timestamp)}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                                            No hay inscripciones recientes
                                        </TableCell>
                                    </TableRow>
                                )}
                           </TableBody>
                       </Table>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
