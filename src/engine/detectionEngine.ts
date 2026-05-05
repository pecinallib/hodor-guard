import { Request } from 'express';
import {
  getIpData,
  setIpData,
  incrementStats,
  getIpLogs,
} from '../redis/redisService';
import {
  checkRateLimit,
  detectBruteForce,
  detectFlood,
} from '../modules/rateLimit';
import { checkHoneypot, detectScanner } from '../modules/honeypot';
import { evaluateBlock } from '../modules/autoBlock';
import { IpRiskData, RiskFlag, HodorLogEntry } from '../types';
import type { HodorConfig } from '../types';

// result returned after full detection pipeline //
export interface DetectionResult {
  ip: string;
  blocked: boolean;
  riskData: IpRiskData;
  logEntry: HodorLogEntry;
}

// extract real ip from request, respecting proxy headers //
export function extractIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0])
      .split(',')[0]
      .trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// add a flag to the ip data without duplicating //
function addFlag(ipData: IpRiskData, flag: RiskFlag): void {
  if (!ipData.flags.includes(flag)) {
    ipData.flags.push(flag);
  }
}

// apply a score penalty capped at 100 //
function applyPenalty(ipData: IpRiskData, penalty: number): void {
  ipData.riskScore = Math.min(100, ipData.riskScore + penalty);
}

// initialize a fresh ip risk data entry //
function createIpData(ip: string): IpRiskData {
  return {
    ip,
    riskScore: 0,
    flags: [],
    blocked: false,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    requestCount: 1,
  };
}

// retrieve unique routes accessed by an ip from recent logs //
async function getUniqueRoutes(ip: string): Promise<string[]> {
  const logs = await getIpLogs(ip, 50);
  const routes = logs.map((log) => log.path);
  return [...new Set(routes)];
}

// run the full detection pipeline for a request //
export async function runDetection(
  req: Request,
  config: Required<HodorConfig>,
): Promise<DetectionResult> {
  const ip = extractIp(req);

  // load or initialize ip data //
  let ipData = await getIpData(ip);
  if (!ipData) {
    ipData = createIpData(ip);
  } else {
    ipData.lastSeen = Date.now();
    ipData.requestCount += 1;
  }

  // rate limit check //
  if (config.rateLimit) {
    const rateLimitResult = await checkRateLimit(
      req,
      ip,
      config.rateLimitMax,
      config.rateLimitWindowMs,
    );

    if (rateLimitResult.exceeded) {
      applyPenalty(ipData, rateLimitResult.penalty);
      if (rateLimitResult.flag) addFlag(ipData, rateLimitResult.flag);
    }

    // brute force detection //
    const bruteForceResult = detectBruteForce(
      ipData,
      rateLimitResult.count,
      config.rateLimitMax,
    );
    if (bruteForceResult.detected) {
      applyPenalty(ipData, bruteForceResult.penalty);
      if (bruteForceResult.flag) addFlag(ipData, bruteForceResult.flag);
    }

    // flood detection //
    const floodResult = detectFlood(ipData, config.rateLimitWindowMs);
    if (floodResult.detected) {
      applyPenalty(ipData, floodResult.penalty);
      if (floodResult.flag) addFlag(ipData, floodResult.flag);
    }
  }

  // honeypot check //
  if (config.honeypot) {
    const honeypotResult = checkHoneypot(req, config.honeypotRoutes);
    if (honeypotResult.triggered) {
      applyPenalty(ipData, honeypotResult.penalty);
      if (honeypotResult.flag) addFlag(ipData, honeypotResult.flag);
    }

    // scanner detection based on unique routes accessed //
    const uniqueRoutes = await getUniqueRoutes(ip);
    const scannerResult = detectScanner(uniqueRoutes, config.scannerThreshold);
    if (scannerResult.detected) {
      applyPenalty(ipData, scannerResult.penalty);
      if (scannerResult.flag) addFlag(ipData, scannerResult.flag);
    }
  }

  // auto block evaluation //
  let blocked = false;
  if (config.autoBlock) {
    const blockResult = await evaluateBlock(
      ip,
      ipData,
      config.riskScoreThreshold,
      config.blockTtlSeconds,
    );
    blocked = blockResult.shouldBlock;
    ipData.blocked = blocked;
  }

  // persist updated ip data //
  await setIpData(ip, ipData, config.blockTtlSeconds * 2);

  // increment global stats //
  await incrementStats('totalRequests');
  if (blocked) await incrementStats('blockedRequests');

  // build log entry //
  const logEntry: HodorLogEntry = {
    ip,
    method: req.method,
    path: req.path,
    statusCode: blocked ? 403 : 200,
    riskScore: ipData.riskScore,
    blocked,
    timestamp: Date.now(),
  };

  return { ip, blocked, riskData: ipData, logEntry };
}
