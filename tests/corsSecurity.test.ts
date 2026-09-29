import { describe, it, expect, beforeEach } from 'vitest';
import { isOriginAllowed, handleCors } from '../api/_lib/cors';

describe('CORS and Origin Security (api/_lib/cors.ts)', () => {
  beforeEach(() => {
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.VERCEL_URL;
  });

  it('allows localhost and local dev origins by default', () => {
    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(true);
    expect(isOriginAllowed('capacitor://localhost')).toBe(true);
  });

  it('allows Vercel and Google Cloud Run deployment origins', () => {
    expect(isOriginAllowed('https://my-app-preview-123.vercel.app')).toBe(true);
    expect(isOriginAllowed('https://ais-dev-645buqgjhtq37bgn2nlguw.run.app')).toBe(true);
  });

  it('allows custom domains configured in ALLOWED_ORIGINS', () => {
    process.env.ALLOWED_ORIGINS = 'https://almohaseb.farm,https://app.almohaseb.farm';
    expect(isOriginAllowed('https://almohaseb.farm')).toBe(true);
    expect(isOriginAllowed('https://app.almohaseb.farm')).toBe(true);
  });

  it('rejects disallowed external origins', () => {
    expect(isOriginAllowed('https://malicious-attacker-site.com')).toBe(false);
    expect(isOriginAllowed('https://evil-phishing.org')).toBe(false);
  });

  it('allows same-origin requests where Origin header is absent', () => {
    expect(isOriginAllowed(undefined)).toBe(true);
  });

  it('handleCors sets 403 status and error JSON for forbidden origins', () => {
    let statusCode = 0;
    let jsonResponse: any = null;

    const req = {
      method: 'POST',
      headers: {
        origin: 'https://unauthorized-domain.com',
      },
    } as any;

    const res = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            jsonResponse = data;
          },
        };
      },
      setHeader: () => {},
    } as any;

    const result = handleCors(req, res);

    expect(result).toBe(false);
    expect(statusCode).toBe(403);
    expect(jsonResponse.error).toContain('غير مصرح');
  });

  it('handleCors sets appropriate CORS headers for allowed origins', () => {
    const headersSet: Record<string, string> = {};

    const req = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
      },
    } as any;

    const res = {
      setHeader: (key: string, value: string) => {
        headersSet[key] = value;
      },
      status: () => ({ json: () => {} }),
    } as any;

    const result = handleCors(req, res);

    expect(result).toBe(true);
    expect(headersSet['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    expect(headersSet['Access-Control-Allow-Credentials']).toBe('true');
  });
});
