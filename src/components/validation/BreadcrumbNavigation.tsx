'use client';

import Link from 'next/link';
import { ChevronRight, Home, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  className?: string;
  showIndex?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export default function BreadcrumbNavigation({
  items,
  className = "",
  showIndex = false,
  currentIndex,
  totalCount
}: BreadcrumbNavigationProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-1", className)}>
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
            )}
            
            {item.href && !item.current ? (
              <Link
                href={item.href}
                className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  item.current 
                    ? "text-foreground" 
                    : "text-muted-foreground"
                )}
              >
                {item.icon}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      
      {showIndex && currentIndex !== undefined && totalCount !== undefined && (
        <>
          <span className="mx-2 text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} de {totalCount}
          </span>
        </>
      )}
    </nav>
  );
}

// Pre-built breadcrumb configurations
export const ValidationBreadcrumbs = {
  // Main validation page
  main: (): BreadcrumbItem[] => [
    {
      label: "Dashboard",
      href: "/",
      icon: <Home className="w-4 h-4" />
    },
    {
      label: "Validación",
      href: "/validation",
      icon: <Users className="w-4 h-4" />,
      current: true
    }
  ],

  // Individual postulant page
  postulant: (postulantName: string): BreadcrumbItem[] => [
    {
      label: "Dashboard",
      href: "/",
      icon: <Home className="w-4 h-4" />
    },
    {
      label: "Validación",
      href: "/validation",
      icon: <Users className="w-4 h-4" />
    },
    {
      label: postulantName,
      icon: <User className="w-4 h-4" />,
      current: true
    }
  ]
};
