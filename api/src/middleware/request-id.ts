import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

export interface RequestWithId extends FastifyRequest {
  id: string;
}

export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Use existing request ID from header or generate a new one
  const requestId = 
    request.headers['x-request-id'] as string ||
    request.headers['x-correlation-id'] as string ||
    randomUUID();

  // Add request ID to request object
  (request as RequestWithId).id = requestId;

  // Add request ID to response headers
  reply.header('x-request-id', requestId);

  // Add request ID to logger context
  request.log = request.log.child({ requestId });
}

