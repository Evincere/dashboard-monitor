
'use client';

import {
  BrainCircuit,
  Database,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Flame,
  FileArchive,
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
import { cn } from '@/lib/utils';

const menuItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/ai-query',
    label: 'Consulta con IA',
    icon: BrainCircuit,
  },
  {
    href: '/natural-query',
    label: 'Consulta Natural',
    icon: MessageSquare,
  },
  {
    href: '/database',
    label: 'Base de Datos',
    icon: Database,
  },
   {
    href: '/backups',
    label: 'Backups',
    icon: FileArchive,
  },
];

const settingsItem = {
  href: '/settings',
  label: 'Configuración',
  icon: Settings,
};

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <Flame className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold font-headline">MPD Insights</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  className="font-medium"
                >
                  <item.icon />
                  <span>{item.label}</span>
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
              >
                <settingsItem.icon />
                <span>{settingsItem.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
