'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DocumentSkeleton() {
  return (
    <div className="h-full bg-slate-100 dark:bg-slate-900 p-4">
      <div className="h-full bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentListSkeleton() {
  return (
    <div className="p-3 space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <Skeleton className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ValidationPanelSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-auto p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="mt-8">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}