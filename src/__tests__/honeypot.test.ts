import {
  checkHoneypot,
  detectScanner,
  buildHoneypotResponse,
} from '../modules/honeypot';
import { Request } from 'express';

// helper to create a mock express request //
function mockRequest(path: string): Partial<Request> {
  return { path };
}

describe('checkHoneypot', () => {
  const honeypotRoutes = ['/admin', '/wp-admin', '/.env', '/config'];

  it('should trigger when path matches a honeypot route', () => {
    const req = mockRequest('/admin');
    const result = checkHoneypot(req as Request, honeypotRoutes);

    expect(result.triggered).toBe(true);
    expect(result.flag).toBe('honeypot_access');
    expect(result.penalty).toBeGreaterThan(0);
    expect(result.route).toBe('/admin');
  });

  it('should not trigger on a legitimate route', () => {
    const req = mockRequest('/api/hello');
    const result = checkHoneypot(req as Request, honeypotRoutes);

    expect(result.triggered).toBe(false);
    expect(result.flag).toBeNull();
    expect(result.penalty).toBe(0);
  });

  it('should trigger with case-insensitive path matching', () => {
    const req = mockRequest('/ADMIN');
    const result = checkHoneypot(req as Request, honeypotRoutes);

    expect(result.triggered).toBe(true);
  });

  it('should trigger ignoring trailing slashes', () => {
    const req = mockRequest('/admin/');
    const result = checkHoneypot(req as Request, honeypotRoutes);

    expect(result.triggered).toBe(true);
  });

  it('should trigger ignoring query strings', () => {
    const req = mockRequest('/admin?debug=true');
    const result = checkHoneypot(req as Request, honeypotRoutes);

    expect(result.triggered).toBe(true);
  });
});

describe('detectScanner', () => {
  it('should detect scanner when unique routes exceed threshold', () => {
    const routes = Array.from({ length: 12 }, (_, i) => `/route-${i}`);
    const result = detectScanner(routes, 10);

    expect(result.detected).toBe(true);
    expect(result.flag).toBe('scanner');
    expect(result.penalty).toBeGreaterThan(0);
  });

  it('should not detect scanner below threshold', () => {
    const routes = ['/api/hello', '/api/data'];
    const result = detectScanner(routes, 10);

    expect(result.detected).toBe(false);
    expect(result.flag).toBeNull();
  });
});

describe('buildHoneypotResponse', () => {
  it('should return a fake admin response', () => {
    const response = buildHoneypotResponse();

    expect(response).toHaveProperty('status', 'ok');
    expect(response).toHaveProperty('message');
    expect(response).toHaveProperty('timestamp');
  });
});
