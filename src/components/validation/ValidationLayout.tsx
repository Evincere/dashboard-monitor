import { cn } from '@/lib/utils';

interface ValidationLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function ValidationLayout({ children, className }: ValidationLayoutProps) {
  return (
    <div className={cn(
      "flex-1 w-full min-h-screen bg-background",
      "overflow-auto",
      className
    )}>
      <div className="w-full max-w-none mx-0">
        {children}
      </div>
    </div>
  );
}
