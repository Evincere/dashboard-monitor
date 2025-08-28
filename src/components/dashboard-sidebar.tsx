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
  FileBarChart
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
