import { HodorConfig } from '../types';

// default honeypot routes — common attack targets //
export const DEFAULT_HONEYPOT_ROUTES: string[] = [
  '/admin',
  '/admin/login',
  '/wp-admin',
  '/wp-login.php',
  '/phpmyadmin',
  '/config',
  '/.env',
  '/backup',
  '/shell',
  '/console',
];

// default configuration values for hodorGuard middleware //
export const DEFAULT_CONFIG: Required<HodorConfig> = {
  rateLimit: true,
  honeypot: true,
  autoBlock: true,
  rateLimitMax: 100,
  rateLimitWindowMs: 60000,
  riskScoreThreshold: 70,
  blockTtlSeconds: 900,
  honeypotRoutes: DEFAULT_HONEYPOT_ROUTES,
  logRequests: true,
  scannerThreshold: 10,
};

// risk score penalties per event //
export const RISK_PENALTIES = {
  honeypotAccess: 40,
  rateLimitExceeded: 20,
  bruteForce: 25,
  scanner: 15,
  flood: 10,
} as const;

// redis key prefixes — keeps keyspace organized //
export const REDIS_KEYS = {
  ipData: 'hodor:ip:',
  blocked: 'hodor:blocked:',
  log: 'hodor:log:',
  stats: 'hodor:stats',
  counter: 'hodor:counter:',
} as const;

// log ttl — 24 hours in seconds //
export const LOG_TTL_SECONDS = 86400;
