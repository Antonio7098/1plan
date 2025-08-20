import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND';

  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code = 'CONFLICT';

  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

// RFC 7807 Problem Details for HTTP APIs
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  [key: string]: unknown;
}

export async function errorHandler(
  error: FastifyError | ApiError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const requestId = (request as any).id;

  // Log the error
  request.log.error({ error, requestId }, 'Request error');

  let problemDetails: ProblemDetails;

  if (error instanceof ZodError) {
    // Zod validation errors
    problemDetails = {
      type: 'https://1plan.dev/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'Request validation failed',
      instance: request.url,
      errors: error.issues,
    };
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma database errors
    if (error.code === 'P2002') {
      problemDetails = {
        type: 'https://1plan.dev/errors/conflict',
        title: 'Conflict',
        status: 409,
        detail: 'Resource already exists',
        instance: request.url,
        constraint: error.meta?.target,
      };
    } else if (error.code === 'P2025') {
      problemDetails = {
        type: 'https://1plan.dev/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'Resource not found',
        instance: request.url,
      };
    } else {
      problemDetails = {
        type: 'https://1plan.dev/errors/database-error',
        title: 'Database Error',
        status: 500,
        detail: 'An error occurred while accessing the database',
        instance: request.url,
        code: error.code,
      };
    }
  } else if ((error as any).statusCode === 429 || (error as any).status === 429 || /rate\s*limit/i.test(String((error as any).message || ''))) {
    // Rate limit errors (from @fastify/rate-limit)
    problemDetails = {
      type: 'https://1plan.dev/errors/rate-limit-exceeded',
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: (error as any).message || 'Too many requests',
      instance: request.url,
      // Include statusCode to align with tests and plugin expectations
      statusCode: 429,
      error: 'Too Many Requests',
    } as any;
  } else if (error.statusCode) {
    // Custom API errors
    problemDetails = {
      type: `https://1plan.dev/errors/${error.code?.toLowerCase() || 'api-error'}`,
      title: error.name || 'API Error',
      status: error.statusCode,
      detail: error.message,
      instance: request.url,
      ...(error instanceof ValidationError && error.details ? { details: error.details } : {}),
    };
  } else {
    // Generic server errors
    problemDetails = {
      type: 'https://1plan.dev/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
      instance: request.url,
    };
  }

  // Add request ID to problem details
  problemDetails.requestId = requestId;

  // Always include statusCode mirror for clients/tests expecting it
  (problemDetails as any).statusCode = (problemDetails as any).statusCode ?? problemDetails.status;

  reply
    .status(problemDetails.status)
    .type('application/problem+json')
    .send(problemDetails);
}

