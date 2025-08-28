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
      <main 
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          // Margin-left dinámico para compensar el sidebar fijo
          isCollapsed ? "ml-[60px]" : "ml-[240px]"
        )}
      >
        {children}
      </main>
    </div>
  );
}
