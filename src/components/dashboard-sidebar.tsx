'use client';

import {
  BrainCircuit,
  Database,
  Settings,
  Flame,
  BarChart3,
  FileText,
  FileClock,
  BookUser,
  Library,
  Search,
  Activity,
  FileCheck,
  FileBarChart,
  LogOut,
  User
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: BarChart3,
  },
  {
    href: '/unified-query',
    label: 'Consulta Inteligente',
    icon: BrainCircuit,
  },
  {
    href: '/contests',
    label: 'Concursos',
    icon: Library,
  },
  {
    href: '/database',
    label: 'Base de Datos',
    icon: Database,
  },
  {
    href: '/schema',
    label: 'Esquema DB',
    icon: Search,
  },
  {
    href: '/backups',
    label: 'Backups',
    icon: FileClock,
  },
  {
    href: '/documents',
    label: 'Documentos',
    icon: FileText,
  },
  {
    href: '/postulations',
    label: 'Validación Docs',
    icon: FileCheck,
  },
  {
    href: '/users',
    label: 'Usuarios',
    icon: BookUser,
  },
  {
    href: '/performance',
    label: 'Rendimiento',
    icon: Activity,
  },
  {
    href: '/reportes',
    label: 'Reportes',
    icon: FileBarChart,
  }
];

const settingsItem = {
  href: '/settings',
  label: 'Configuración',
  icon: Settings,
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 pr-12">
          <Flame className="w-6 h-6 flex-shrink-0" />
          <span className="text-xl font-bold whitespace-nowrap">MPD Insights</span>
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          {/* User Info Section */}
          {user && (
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="truncate">{user.username}</span>
              </div>
            </SidebarMenuItem>
          )}
          
          {/* Settings */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === settingsItem.href}
              tooltip={settingsItem.label}
            >
              <Link href={settingsItem.href}>
                <settingsItem.icon className="w-5 h-5" />
                <span>{settingsItem.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {/* Logout Button */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Cerrar Sesión">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar Sesión</span>
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
