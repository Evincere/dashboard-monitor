'use client';

import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <DashboardSidebar />
          <SidebarInset>
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
