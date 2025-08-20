import { z } from 'zod';

// Common schemas
export const idSchema = z.string().cuid('Invalid ID format');
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Document schemas
export const documentKindSchema = z.enum([
  'PRD',
  'TECH_OVERVIEW', 
  'SPRINT_OVERVIEW',
  'SPRINT',
  'FREEFORM'
]);

export const createDocumentSchema = z.object({
  projectId: idSchema,
  kind: documentKindSchema,
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
});

export const updateDocumentSchema = z.object({
  kind: documentKindSchema.optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
});

export const listDocumentsSchema = z.object({
  projectId: idSchema.optional(),
  kind: documentKindSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// Feature schemas (for future use)
export const createFeatureSchema = z.object({
  projectId: idSchema,
  featureId: z.string().regex(/^FEAT-\d{3}$/, 'Feature ID must be in format FEAT-XXX'),
  title: z.string().min(1).max(200),
  version: z.string().default('0.1.0'),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
  area: z.string().min(1).max(50),
});

// Sprint schemas (for future use)
export const createSprintSchema = z.object({
  projectId: idSchema,
  code: z.string().regex(/^SPR-\d{3}$/, 'Sprint code must be in format SPR-XXX'),
  name: z.string().min(1).max(200),
  status: z.enum(['PLANNED', 'ACTIVE', 'DONE', 'CANCELLED']).default('PLANNED'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Tool argument schemas
export const toolArgsSchema = z.object({
  requestId: z.string().uuid().optional(),
  idempotencyKey: z.string().optional(),
});

// Export type definitions
export type DocumentKind = z.infer<typeof documentKindSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type ToolArgs = z.infer<typeof toolArgsSchema>;
