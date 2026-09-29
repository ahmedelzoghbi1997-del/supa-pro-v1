import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/ai-insights';

describe('AI Insights API Endpoint (/api/ai-insights)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects non-POST methods with 405', async () => {
    const req = {
      method: 'GET',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      body: {},
    } as any;

    let statusCode = 0;
    let jsonResponse: any = null;

    const res = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            jsonResponse = data;
          },
          end: () => {},
        };
      },
      setHeader: () => {},
    } as any;

    await handler(req, res);

    expect(statusCode).toBe(405);
    expect(jsonResponse.error).toContain('Method Not Allowed');
  });

  it('returns 200 disabled message without requiring GEMINI_API_KEY', async () => {
    const req = {
      method: 'POST',
      headers: {},
      socket: { remoteAddress: '127.0.0.2' },
      body: {},
    } as any;

    let statusCode = 0;
    let jsonResponse: any = null;

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

    await handler(req, res);

    expect(statusCode).toBe(200);
    expect(jsonResponse.insight).toBeDefined();
  });
});
