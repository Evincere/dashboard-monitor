
'use client';

import {
  BrainCircuit,
  Database,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Flame,
  FileArchive,
  FolderKanban,
  Users,
  BarChart3,
  FileText,
  User,
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useSidebarStore } from '@/stores/use-sidebar-store';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const { isCollapsed, toggle } = useSidebarStore();

  return (
    <Sidebar className={cn("transition-all duration-300", isCollapsed ? "w-[60px]" : "w-[240px]")}>
      <SidebarHeader>
        <div className={cn(
          "flex items-center gap-2",
          isCollapsed && "justify-center"
        )}>
          <Flame className="w-6 h-6 flex-shrink-0" />
          {!isCollapsed && <span className="text-xl font-bold whitespace-nowrap">MPD Insights</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-3 opacity-50 hover:opacity-100"
          onClick={toggle}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  className="font-medium"
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href={settingsItem.href}>
              <SidebarMenuButton
                isActive={pathname === settingsItem.href}
                className="font-medium"
                title={isCollapsed ? settingsItem.label : undefined}
              >
                <settingsItem.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{settingsItem.label}</span>}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
