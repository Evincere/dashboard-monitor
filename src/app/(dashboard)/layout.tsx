'use client';

import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/use-sidebar-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebarStore();

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
