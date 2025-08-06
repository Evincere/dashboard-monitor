// src/lib/request-utils.ts
import { NextRequest } from 'next/server';

/**
 * Extract IP address from NextRequest
 * Checks various headers in order of preference
 */
export function getClientIP(request: NextRequest): string {
  // Check for forwarded IP addresses (common in production behind proxies)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }

  // Check for real IP (some proxies use this)
  const xRealIP = request.headers.get('x-real-ip');
  if (xRealIP) {
    return xRealIP.trim();
  }

  // Check for CF-Connecting-IP (Cloudflare)
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  // Check for X-Client-IP
  const xClientIP = request.headers.get('x-client-ip');
  if (xClientIP) {
    return xClientIP.trim();
  }

  // Fallback to connection remote address (may not be available in all environments)
  return 'unknown';
}

/**
 * Extract User Agent from NextRequest
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Get request metadata for logging
 */
export function getRequestMetadata(request: NextRequest) {
  return {
    ip: getClientIP(request),
    userAgent: getUserAgent(request),
    method: request.method,
    url: request.url,
    pathname: request.nextUrl?.pathname || '',
    timestamp: new Date().toISOString()
  };
}