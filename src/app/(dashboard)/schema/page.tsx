// src/app/(dashboard)/schema/page.tsx
import { SchemaInspector } from '@/components/dashboard/schema-inspector';

export default function SchemaPage() {
  return (
    <div className="container mx-auto py-6">
      <SchemaInspector />
    </div>
  );
}

export const metadata = {
  title: 'Database Schema Inspector',
  description: 'Complete database structure introspection with dynamic schema mapping',
};