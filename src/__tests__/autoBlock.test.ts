import { getDominantFlag, buildBlockedResponse } from '../modules/autoBlock';
import { IpRiskData, RiskFlag } from '../types';

// helper to create a mock ip data entry //
function mockIpData(overrides: Partial<IpRiskData> = {}): IpRiskData {
  return {
    ip: '127.0.0.1',
    riskScore: 0,
    flags: [],
    blocked: false,
    firstSeen: Date.now() - 120000,
    lastSeen: Date.now(),
    requestCount: 1,
    ...overrides,
  };
}

describe('getDominantFlag', () => {
  it('should return honeypot_access as highest priority flag', () => {
    const flags: RiskFlag[] = ['brute_force', 'honeypot_access', 'scanner'];
    const result = getDominantFlag(flags);

    expect(result).toBe('honeypot_access');
  });

  it('should return brute_force when honeypot_access is not present', () => {
    const flags: RiskFlag[] = ['scanner', 'brute_force', 'flood'];
    const result = getDominantFlag(flags);

    expect(result).toBe('brute_force');
  });

  it('should return scanner when only scanner and flood are present', () => {
    const flags: RiskFlag[] = ['flood', 'scanner'];
    const result = getDominantFlag(flags);

    expect(result).toBe('scanner');
  });

  it('should return null when flags array is empty', () => {
    const result = getDominantFlag([]);

    expect(result).toBeNull();
  });

  it('should return the only flag when one flag is present', () => {
    const flags: RiskFlag[] = ['flood'];
    const result = getDominantFlag(flags);

    expect(result).toBe('flood');
  });
});

describe('buildBlockedResponse', () => {
  it('should return a properly structured blocked response', () => {
    const ipData = mockIpData({
      riskScore: 85,
      flags: ['honeypot_access', 'brute_force'],
    });

    const response = buildBlockedResponse('127.0.0.1', ipData, 900);

    expect(response).toHaveProperty('error', 'Access denied');
    expect(response).toHaveProperty('ip', '127.0.0.1');
    expect(response).toHaveProperty('riskScore', 85);
    expect(response).toHaveProperty('flags');
    expect(response).toHaveProperty('retryAfter', 900);
    expect(response).toHaveProperty('message');
  });

  it('should include all flags in the response', () => {
    const flags: RiskFlag[] = ['honeypot_access', 'scanner'];
    const ipData = mockIpData({ flags });

    const response = buildBlockedResponse('127.0.0.1', ipData, 900);

    expect(response.flags).toEqual(flags);
  });
});
