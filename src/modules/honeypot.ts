import { Request } from 'express';
import { RISK_PENALTIES } from '../config/defaults';
import { RiskFlag } from '../types';

// result returned after honeypot check //
export interface HoneypotResult {
  triggered: boolean;
  route: string | null;
  penalty: number;
  flag: RiskFlag | null;
}

// normalize a path by removing query strings and trailing slashes //
function normalizePath(path: string): string {
  return path.split('?')[0].toLowerCase().replace(/\/+$/, '');
}

// check if the request path matches any honeypot route //
export function checkHoneypot(
  req: Request,
  honeypotRoutes: string[],
): HoneypotResult {
  const requestPath = normalizePath(req.path);

  const matchedRoute = honeypotRoutes.find(
    (route) => normalizePath(route) === requestPath,
  );

  if (matchedRoute) {
    return {
      triggered: true,
      route: matchedRoute,
      penalty: RISK_PENALTIES.honeypotAccess,
      flag: 'honeypot_access',
    };
  }

  return {
    triggered: false,
    route: null,
    penalty: 0,
    flag: null,
  };
}

// detect scanner pattern — too many different routes accessed by the same ip //
export function detectScanner(
  uniqueRoutes: string[],
  threshold: number = 10,
): { detected: boolean; penalty: number; flag: RiskFlag | null } {
  if (uniqueRoutes.length >= threshold) {
    return {
      detected: true,
      penalty: RISK_PENALTIES.scanner,
      flag: 'scanner',
    };
  }

  return {
    detected: false,
    penalty: 0,
    flag: null,
  };
}

// build a fake response for honeypot routes to mislead attackers //
export function buildHoneypotResponse(): Record<string, unknown> {
  return {
    status: 'ok',
    version: '1.0.0',
    message: 'Welcome to the admin panel',
    timestamp: new Date().toISOString(),
  };
}
