'use client';

import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { SidebarInset } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </div>
  );
}
