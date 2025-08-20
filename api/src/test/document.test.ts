import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db.js';
import { 
  createDocumentSchema, 
  updateDocumentSchema, 
  generateSlug 
} from '../types/document.js';

describe('Document Validation', () => {
  describe('createDocumentSchema', () => {
    it('should validate valid document data', () => {
      const validData = {
        projectId: 'cltest123456789012345678',
        kind: 'FREEFORM' as const,
        title: 'Test Document',
        content: 'This is test content',
        slug: 'test-document'
      };

      const result = createDocumentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid kind', () => {
      const invalidData = {
        projectId: 'cltest123456789012345678',
        kind: 'INVALID_KIND',
        title: 'Test Document',
        content: 'This is test content'
      };

      const result = createDocumentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const invalidData = {
        projectId: 'cltest123456789012345678',
        kind: 'FREEFORM' as const,
        title: '',
        content: 'This is test content'
      };

      const result = createDocumentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid slug format', () => {
      const invalidData = {
        projectId: 'cltest123456789012345678',
        kind: 'FREEFORM' as const,
        title: 'Test Document',
        content: 'This is test content',
        slug: 'Invalid Slug!'
      };

      const result = createDocumentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateDocumentSchema', () => {
    it('should validate partial updates', () => {
      const validData = {
        title: 'Updated Title'
      };

      const result = updateDocumentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateDocumentSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('generateSlug', () => {
    it('should generate slug from title', () => {
      expect(generateSlug('Test Document')).toBe('test-document');
    });

    it('should handle special characters', () => {
      expect(generateSlug('Test & Document!')).toBe('test-document');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('Test   Multiple   Spaces')).toBe('test-multiple-spaces');
    });

    it('should handle leading/trailing hyphens', () => {
      expect(generateSlug('-Test Document-')).toBe('test-document');
    });
  });
});

describe('Document Database Operations', () => {
  let testProject: any;

  beforeEach(async () => {
    // Create a test project
    testProject = await db.project.create({
      data: {
        name: 'Test Project'
      }
    });
  });

  it('should create document with valid data', async () => {
    const documentData = {
      projectId: testProject.id,
      kind: 'FREEFORM' as const,
      title: 'Test Document',
      content: 'Test content',
      slug: 'test-document'
    };

    const document = await db.document.create({
      data: documentData
    });

    expect(document.id).toBeDefined();
    expect(document.title).toBe('Test Document');
    expect(document.slug).toBe('test-document');
    expect(document.projectId).toBe(testProject.id);
  });

  it('should enforce unique slug per project', async () => {
    const documentData = {
      projectId: testProject.id,
      kind: 'FREEFORM' as const,
      title: 'Test Document',
      content: 'Test content',
      slug: 'test-document'
    };

    // Create first document
    await db.document.create({
      data: documentData
    });

    // Try to create second document with same slug
    await expect(
      db.document.create({
        data: documentData
      })
    ).rejects.toThrow();
  });

  it('should allow same slug in different projects', async () => {
    // Create second project
    const secondProject = await db.project.create({
      data: {
        name: 'Second Project'
      }
    });

    const documentData = {
      kind: 'FREEFORM' as const,
      title: 'Test Document',
      content: 'Test content',
      slug: 'test-document'
    };

    // Create document in first project
    const doc1 = await db.document.create({
      data: {
        ...documentData,
        projectId: testProject.id
      }
    });

    // Create document with same slug in second project
    const doc2 = await db.document.create({
      data: {
        ...documentData,
        projectId: secondProject.id
      }
    });

    expect(doc1.slug).toBe(doc2.slug);
    expect(doc1.projectId).not.toBe(doc2.projectId);
  });
});
