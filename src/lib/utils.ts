import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// API URL utility that respects basePath
export function apiUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/dashboard-monitor';
  // Remove leading slash from path if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${basePath}/api/${cleanPath}`;
}

// Navigation URL utility - for router.push() use relative paths, Next.js handles basePath
export function routeUrl(path: string): string {
  // For router.push(), Next.js automatically adds basePath, so we return relative paths
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${cleanPath}`;
}

// For cases where you need the full path with basePath (like href attributes)
export function fullRouteUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/dashboard-monitor';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${basePath}/${cleanPath}`;
}
