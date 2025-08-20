import { describe, it, expect, vi } from 'vitest';
import type { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { errorHandler, ValidationError } from '../middleware/error-handler.js';

function mockRequest(url = '/test'): FastifyRequest {
  return {
    url,
    id: 'test-request-id',
    log: {
      error: vi.fn(),
      info: vi.fn(),
    },
  } as unknown as FastifyRequest;
}

function mockReply() {
  let statusCode: number | undefined;
  let contentType: string | undefined;
  let payload: any;

  const reply: Partial<FastifyReply> & {
    _status?: number;
    _type?: string;
    _payload?: any;
  } = {
    status(code: number) {
      statusCode = code;
      this._status = code;
      return this as FastifyReply;
    },
    type(ct: string) {
      contentType = ct;
      this._type = ct;
      return this as FastifyReply;
    },
    send(body: any) {
      payload = body;
      this._payload = body;
      return this as FastifyReply;
    },
  };

  return { reply: reply as FastifyReply, get status() { return statusCode; }, get type() { return contentType; }, get body() { return payload; } };
}

describe('errorHandler', () => {
  it('maps rate limit (429) errors to Problem+JSON with mirrored statusCode', async () => {
    const req = mockRequest('/api/v1/documents');
    const { reply, status, type, body } = mockReply();

    const rateLimitErr = { statusCode: 429, message: 'Too many requests' } as FastifyError;

    await errorHandler(rateLimitErr, req, reply);

    expect((reply as any)._status).toBe(429);
    expect((reply as any)._type).toBe('application/problem+json');

    const res = (reply as any)._payload as any;
    expect(res.title).toBe('Rate Limit Exceeded');
    expect(res.status).toBe(429);
    expect(res.statusCode).toBe(429);
    expect(res.error).toBe('Too Many Requests');
    expect(res.instance).toBe('/api/v1/documents');
    expect(res.requestId).toBe('test-request-id');
  });

  it('maps ValidationError to Problem+JSON and includes details', async () => {
    const req = mockRequest('/api/v1/projects');
    const { reply } = mockReply();

    const err = new ValidationError('Invalid input', { field: 'name' });

    await errorHandler(err as unknown as FastifyError, req, reply);

    const res = (reply as any)._payload as any;
    expect((reply as any)._status).toBe(400);
    expect((reply as any)._type).toBe('application/problem+json');
    expect(res.title).toBe('Validation Error');
    expect(res.status).toBe(400);
    expect(res.statusCode).toBe(400);
    expect(res.details).toEqual({ field: 'name' });
  });

  it('maps generic errors to 500 Internal Server Error', async () => {
    const req = mockRequest('/any');
    const { reply } = mockReply();

    await errorHandler(new Error('boom') as unknown as FastifyError, req, reply);

    const res = (reply as any)._payload as any;
    expect((reply as any)._status).toBe(500);
    expect(res.title).toBe('Internal Server Error');
    expect(res.status).toBe(500);
    expect(res.statusCode).toBe(500);
  });
});
