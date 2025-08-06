// src/lib/rate-limiter.ts
import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from './audit-logger';
import { getClientIP, getUserAgent } from './request-utils';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  private getKey(req: NextRequest): string {
    // Use IP address as primary identifier
    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);
    
    // Include user agent hash for additional uniqueness
    const userAgentHash = this.simpleHash(userAgent);
    return `${ip}:${userAgentHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async isAllowed(req: NextRequest): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
    const key = this.getKey(req);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime,
        blocked: false
      };
      this.store.set(key, entry);
    }

    entry.count++;

    if (entry.count > this.config.maxRequests) {
      if (!entry.blocked) {
        entry.blocked = true;
        
        // Log rate limit violation
        await auditLogger.logSecurityEvent({
          event: 'RATE_LIMIT_EXCEEDED',
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          path: req.nextUrl.pathname,
          requestCount: entry.count,
          limit: this.config.maxRequests,
          windowMs: this.config.windowMs,
          timestamp: new Date()
        });
      }

      return {
        allowed: false,
        resetTime: entry.resetTime,
        remaining: 0
      };
    }

    return {
      allowed: true,
      resetTime: entry.resetTime,
      remaining: Math.max(0, this.config.maxRequests - entry.count)
    };
  }

  middleware() {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      const result = await this.isAllowed(req);

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime! - Date.now()) / 1000);
        
        return NextResponse.json(
          {
            error: this.config.message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter,
            timestamp: new Date().toISOString()
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': this.config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(result.resetTime!).toISOString()
            }
          }
        );
      }

      return null; // Allow request to continue
    };
  }
}

// Pre-configured rate limiters
export const generalRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.'
});

export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.'
});

export const apiRateLimit = new RateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'API rate limit exceeded, please slow down your requests.'
});

export const strictRateLimit = new RateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute for sensitive operations
  message: 'Rate limit exceeded for sensitive operations.'
});

// Middleware wrapper for rate limiting
export const withRateLimit = (rateLimiter: RateLimiter) => {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      const rateLimitResponse = await rateLimiter.middleware()(req);
      
      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      const response = await handler(req);
      
      // Add rate limit headers to successful responses
      const result = await rateLimiter.isAllowed(req);
      if (result.allowed) {
        response.headers.set('X-RateLimit-Limit', rateLimiter['config'].maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', (result.remaining || 0).toString());
        if (result.resetTime) {
          response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
        }
      }

      return response;
    };
  };
};

// DDoS protection with progressive penalties
class DDoSProtection {
  private suspiciousIPs = new Map<string, { count: number; lastSeen: number; blocked: boolean }>();
  private readonly threshold = 1000; // requests per minute
  private readonly blockDuration = 60 * 60 * 1000; // 1 hour

  async checkRequest(req: NextRequest): Promise<boolean> {
    const ip = getClientIP(req);
    const now = Date.now();
    
    let entry = this.suspiciousIPs.get(ip);
    
    if (!entry) {
      entry = { count: 0, lastSeen: now, blocked: false };
      this.suspiciousIPs.set(ip, entry);
    }

    // Reset count if more than a minute has passed
    if (now - entry.lastSeen > 60 * 1000) {
      entry.count = 0;
      entry.blocked = false;
    }

    entry.count++;
    entry.lastSeen = now;

    // Check if IP should be blocked
    if (entry.count > this.threshold && !entry.blocked) {
      entry.blocked = true;
      
      await auditLogger.logSecurityEvent({
        event: 'DDOS_ATTACK_DETECTED',
        ipAddress: ip,
        userAgent: getUserAgent(req),
        requestCount: entry.count,
        threshold: this.threshold,
        timestamp: new Date()
      });

      // Schedule unblock
      setTimeout(() => {
        const currentEntry = this.suspiciousIPs.get(ip);
        if (currentEntry) {
          currentEntry.blocked = false;
          currentEntry.count = 0;
        }
      }, this.blockDuration);
    }

    return !entry.blocked;
  }

  middleware() {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      const allowed = await this.checkRequest(req);
      
      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Request blocked due to suspicious activity',
            code: 'DDOS_PROTECTION',
            timestamp: new Date().toISOString()
          },
          { status: 429 }
        );
      }

      return null;
    };
  }
}

export const ddosProtection = new DDoSProtection();

export const withDDoSProtection = (handler: (req: NextRequest) => Promise<NextResponse>) => {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ddosResponse = await ddosProtection.middleware()(req);
    
    if (ddosResponse) {
      return ddosResponse;
    }

    return handler(req);
  };
};