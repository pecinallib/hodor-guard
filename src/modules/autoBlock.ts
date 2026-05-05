import { blockIp, isIpBlocked, unblockIp } from '../redis/redisService';
import { IpRiskData, RiskFlag } from '../types';

// result returned after auto block evaluation //
export interface AutoBlockResult {
  shouldBlock: boolean;
  alreadyBlocked: boolean;
  reason: RiskFlag | null;
}

// evaluate if an ip should be blocked based on its risk score //
export async function evaluateBlock(
  ip: string,
  ipData: IpRiskData,
  riskScoreThreshold: number,
  blockTtlSeconds: number,
): Promise<AutoBlockResult> {
  // check if ip is already blocked //
  const alreadyBlocked = await isIpBlocked(ip);

  if (alreadyBlocked) {
    return {
      shouldBlock: true,
      alreadyBlocked: true,
      reason: null,
    };
  }

  // block if risk score exceeds threshold //
  if (ipData.riskScore >= riskScoreThreshold) {
    const dominantFlag = getDominantFlag(ipData.flags);
    await blockIp(ip, blockTtlSeconds);

    return {
      shouldBlock: true,
      alreadyBlocked: false,
      reason: dominantFlag,
    };
  }

  return {
    shouldBlock: false,
    alreadyBlocked: false,
    reason: null,
  };
}

// get the most severe flag from the ip flags list //
export function getDominantFlag(flags: RiskFlag[]): RiskFlag | null {
  const priority: RiskFlag[] = [
    'honeypot_access',
    'brute_force',
    'scanner',
    'rate_limit_exceeded',
    'flood',
  ];

  for (const flag of priority) {
    if (flags.includes(flag)) return flag;
  }

  return null;
}

// manually unblock an ip //
export async function manualUnblock(ip: string): Promise<void> {
  await unblockIp(ip);
}

// build the blocked response payload //
export function buildBlockedResponse(
  ip: string,
  ipData: IpRiskData,
  blockTtlSeconds: number,
): Record<string, unknown> {
  return {
    error: 'Access denied',
    ip,
    riskScore: ipData.riskScore,
    flags: ipData.flags,
    retryAfter: blockTtlSeconds,
    message: 'Your IP has been temporarily blocked due to suspicious activity',
  };
}
