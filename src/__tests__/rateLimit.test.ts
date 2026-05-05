import { detectBruteForce, detectFlood } from '../modules/rateLimit';
import { IpRiskData } from '../types';

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

describe('detectBruteForce', () => {
  it('should detect brute force when count exceeds burst threshold', () => {
    const ipData = mockIpData();
    const result = detectBruteForce(ipData, 250, 100);

    expect(result.detected).toBe(true);
    expect(result.flag).toBe('brute_force');
    expect(result.penalty).toBeGreaterThan(0);
  });

  it('should not detect brute force within normal range', () => {
    const ipData = mockIpData();
    const result = detectBruteForce(ipData, 50, 100);

    expect(result.detected).toBe(false);
    expect(result.flag).toBeNull();
    expect(result.penalty).toBe(0);
  });

  it('should not detect brute force exactly at threshold', () => {
    const ipData = mockIpData();
    const result = detectBruteForce(ipData, 200, 100);

    expect(result.detected).toBe(false);
  });
});

describe('detectFlood', () => {
  it('should detect flood when request rate is too high', () => {
    const ipData = mockIpData({
      firstSeen: Date.now() - 70000,
      requestCount: 1500,
    });
    const result = detectFlood(ipData, 60000);

    expect(result.detected).toBe(true);
    expect(result.flag).toBe('flood');
    expect(result.penalty).toBeGreaterThan(0);
  });

  it('should not detect flood within normal request rate', () => {
    const ipData = mockIpData({
      firstSeen: Date.now() - 70000,
      requestCount: 10,
    });
    const result = detectFlood(ipData, 60000);

    expect(result.detected).toBe(false);
    expect(result.flag).toBeNull();
  });

  it('should not detect flood if elapsed time is within the window', () => {
    const ipData = mockIpData({
      firstSeen: Date.now() - 5000,
      requestCount: 1500,
    });
    const result = detectFlood(ipData, 60000);

    expect(result.detected).toBe(false);
  });
});
