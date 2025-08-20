import { z } from 'zod';
import { DocumentKind } from '@prisma/client';

// Document kind enum validation
export const documentKindSchema = z.enum([
  'PRD',
  'TECH_OVERVIEW', 
  'SPRINT_OVERVIEW',
  'SPRINT',
  'FREEFORM'
]);

// Base document schemas
export const createDocumentSchema = z.object({
  projectId: z.string().cuid('Invalid project ID format'),
  kind: documentKindSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
});

export const updateDocumentSchema = z.object({
  kind: documentKindSchema.optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
});

export const documentParamsSchema = z.object({
  id: z.string().cuid('Invalid document ID format'),
});

export const listDocumentsQuerySchema = z.object({
  projectId: z.string().cuid('Invalid project ID format').optional(),
  kind: documentKindSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Response schemas
export const documentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  kind: documentKindSchema,
  title: z.string(),
  content: z.string(),
  slug: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const documentListSchema = z.object({
  documents: z.array(documentSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

// TypeScript types
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentParams = z.infer<typeof documentParamsSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
export type DocumentResponse = z.infer<typeof documentSchema>;
export type DocumentListResponse = z.infer<typeof documentListSchema>;

// Helper function to generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

