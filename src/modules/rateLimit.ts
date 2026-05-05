import { Request } from 'express';
import { incrementRequestCounter } from '../redis/redisService';
import { RISK_PENALTIES } from '../config/defaults';
import { IpRiskData, RiskFlag } from '../types';

// result returned after rate limit check //
export interface RateLimitResult {
  exceeded: boolean;
  count: number;
  penalty: number;
  flag: RiskFlag | null;
}

// check if the ip has exceeded the request limit within the time window //
export async function checkRateLimit(
  req: Request,
  ip: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const count = await incrementRequestCounter(ip, windowMs);

  if (count > maxRequests) {
    return {
      exceeded: true,
      count,
      penalty: RISK_PENALTIES.rateLimitExceeded,
      flag: 'rate_limit_exceeded',
    };
  }

  return {
    exceeded: false,
    count,
    penalty: 0,
    flag: null,
  };
}

// detect brute force pattern — too many requests in a short burst //
export function detectBruteForce(
  ipData: IpRiskData,
  count: number,
  maxRequests: number,
): { detected: boolean; penalty: number; flag: RiskFlag | null } {
  const burstThreshold = maxRequests * 2;

  if (count > burstThreshold) {
    return {
      detected: true,
      penalty: RISK_PENALTIES.bruteForce,
      flag: 'brute_force',
    };
  }

  return {
    detected: false,
    penalty: 0,
    flag: null,
  };
}

// detect flood pattern — sustained high volume over time //
export function detectFlood(
  ipData: IpRiskData,
  windowMs: number,
): { detected: boolean; penalty: number; flag: RiskFlag | null } {
  const elapsedMs = Date.now() - ipData.firstSeen;
  const requestsPerSecond = (ipData.requestCount / elapsedMs) * 1000;

  if (elapsedMs > windowMs && requestsPerSecond > 10) {
    return {
      detected: true,
      penalty: RISK_PENALTIES.flood,
      flag: 'flood',
    };
  }

  return {
    detected: false,
    penalty: 0,
    flag: null,
  };
}
