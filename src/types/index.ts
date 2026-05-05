import { Request, Response, NextFunction } from 'express';

// main configuration options for hodorGuard middleware //
export interface HodorConfig {
  rateLimit?: boolean;
  honeypot?: boolean;
  autoBlock?: boolean;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  riskScoreThreshold?: number;
  blockTtlSeconds?: number;
  honeypotRoutes?: string[];
  logRequests?: boolean;
}

// risk score entry stored in Redis per IP //
export interface IpRiskData {
  ip: string;
  riskScore: number;
  flags: RiskFlag[];
  blocked: boolean;
  firstSeen: number;
  lastSeen: number;
  requestCount: number;
}

// possible risk flags assigned to an IP //
export type RiskFlag =
  | 'brute_force'
  | 'scanner'
  | 'honeypot_access'
  | 'rate_limit_exceeded'
  | 'flood';

// internal request metadata attached to Express request //
export interface HodorRequestMeta {
  ip: string;
  riskData: IpRiskData;
  blocked: boolean;
}

// stats returned by /hodor/stats endpoint //
export interface HodorStats {
  totalRequests: number;
  blockedRequests: number;
  activeBlocks: number;
  topAttackers: IpRiskData[];
  uptime: number;
}

// log entry stored in 'Redis' //
export interface HodorLogEntry {
  ip: string;
  method: string;
  path: string;
  statusCode: number;
  riskScore: number;
  blocked: boolean;
  timestamp: number;
}

// express middleware type //
export type HodorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;
