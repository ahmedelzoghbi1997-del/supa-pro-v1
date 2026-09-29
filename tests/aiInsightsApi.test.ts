import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/ai-insights';

describe('AI Insights API Endpoint (/api/ai-insights)', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    delete process.env.API_KEY;
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

  it('returns 503 if GEMINI_API_KEY is not configured on server', async () => {
    const req = {
      method: 'POST',
      headers: {},
      socket: { remoteAddress: '127.0.0.2' },
      body: {
        summaryData: {
          currentMonth: { revenue: 1000, expenses: 500 },
          activeCycles: [],
        },
      },
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

    expect(statusCode).toBe(503);
    expect(jsonResponse.error).toContain('GEMINI_API_KEY');
  });

  it('returns 400 if summaryData is missing in request body', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const req = {
      method: 'POST',
      headers: {},
      socket: { remoteAddress: '127.0.0.3' },
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

    expect(statusCode).toBe(400);
    expect(jsonResponse.error).toContain('بيانات الملخص المالي مفقودة');
  });
});
