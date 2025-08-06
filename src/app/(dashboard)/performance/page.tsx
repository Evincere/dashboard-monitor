// src/app/(dashboard)/performance/page.tsx

import { PerformanceMonitor } from '../../../components/dashboard/performance-monitor';

export default function PerformancePage() {
  return (
    <div className="container mx-auto p-6">
      <PerformanceMonitor />
    </div>
  );
}