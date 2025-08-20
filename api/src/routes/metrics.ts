import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { register } from '../lib/metrics.js';

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get('/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header('content-type', register.contentType);
    return await register.metrics();
  });
}
