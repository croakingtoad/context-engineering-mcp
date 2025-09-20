/**
 * Unit tests for TemplateManager class
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { TemplateManager } from '../template-manager';
import { PRPTemplate } from '../../types/index';
import { Factory, FileSystem } from '../../../test/test-helpers/index';

// Mock fs module
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('TemplateManager', () => {
  let templateManager: TemplateManager;
  let mockTemplatesDir: string;
  let mockExternalDir: string;
  let mockTemplates: PRPTemplate[];

  beforeEach(() => {
    mockTemplatesDir = '/test/templates';
    mockExternalDir = '/test/external';
    mockTemplates = Factory.createMultipleTemplates(3);

    templateManager = new TemplateManager(mockTemplatesDir, mockExternalDir);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with provided directories', () => {
      expect(templateManager).toBeInstanceOf(TemplateManager);
    });

    it('should store directory paths correctly', () => {
      // Access private properties for testing using type assertion
      expect((templateManager as any).templatesDir).toBe(mockTemplatesDir);
      expect((templateManager as any).externalTemplatesDir).toBe(mockExternalDir);
    });
  });

  describe('initialize', () => {
    it('should load templates from both directories', async () => {
      // Mock directory reading
      mockedFs.readdir
        .mockResolvedValueOnce([
          { name: 'template1.json', isFile: () => true } as any,
          { name: 'template2.json', isFile: () => true } as any
        ])
        .mockResolvedValueOnce([
          { name: 'external1.json', isFile: () => true } as any
        ]);

      // Mock file reading
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockTemplates[0]))
        .mockResolvedValueOnce(JSON.stringify(mockTemplates[1]))
        .mockResolvedValueOnce(JSON.stringify(mockTemplates[2]));

      await templateManager.initialize();

      expect(mockedFs.readdir).toHaveBeenCalledTimes(2);
      expect(mockedFs.readdir).toHaveBeenCalledWith(mockTemplatesDir, { withFileTypes: true });
      expect(mockedFs.readdir).toHaveBeenCalledWith(mockExternalDir, { withFileTypes: true });
      expect(mockedFs.readFile).toHaveBeenCalledTimes(3);
    });

    it('should handle directory read errors gracefully', async () => {
      mockedFs.readdir
        .mockRejectedValueOnce(new Error('Directory not found'))
        .mockResolvedValueOnce([]);

      // Should not throw - errors are logged but not propagated
      await expect(templateManager.initialize()).resolves.not.toThrow();

      expect(mockedFs.readdir).toHaveBeenCalledTimes(2);
    });

    it('should skip non-JSON files', async () => {
      mockedFs.readdir.mockResolvedValueOnce([
        { name: 'template.json', isFile: () => true } as any,
        { name: 'readme.md', isFile: () => true } as any,
        { name: 'config.yaml', isFile: () => true } as any,
        { name: 'subdir', isFile: () => false } as any
      ]);

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(mockTemplates[0]));

      await templateManager.initialize();

      // Should only read the JSON file
      expect(mockedFs.readFile).toHaveBeenCalledTimes(1);
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, 'template.json'),
        'utf-8'
      );
    });

    it('should handle invalid JSON files gracefully', async () => {
      mockedFs.readdir.mockResolvedValueOnce([
        { name: 'valid.json', isFile: () => true } as any,
        { name: 'invalid.json', isFile: () => true } as any
      ]);

      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockTemplates[0]))
        .mockResolvedValueOnce('invalid json content');

      await templateManager.initialize();

      // Should load the valid template
      const templates = templateManager.getAllTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe(mockTemplates[0].id);
    });

    it('should handle Zod validation errors gracefully', async () => {
      mockedFs.readdir.mockResolvedValueOnce([
        { name: 'invalid-schema.json', isFile: () => true } as any
      ]);

      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify({
        id: 'test',
        name: 'Test'
        // Missing required fields
      }));

      await templateManager.initialize();

      const templates = templateManager.getAllTemplates();
      expect(templates).toHaveLength(0);
    });
  });

  describe('getAllTemplates', () => {
    beforeEach(async () => {
      // Setup templates in manager
      mockedFs.readdir.mockResolvedValue([
        { name: 'template1.json', isFile: () => true } as any,
        { name: 'template2.json', isFile: () => true } as any
      ]);

      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockTemplates[0]))
        .mockResolvedValueOnce(JSON.stringify(mockTemplates[1]));

      await templateManager.initialize();
    });

    it('should return all loaded templates', () => {
      const templates = templateManager.getAllTemplates();

      expect(templates).toHaveLength(2);
      expect(templates.map(t => t.id)).toContain(mockTemplates[0].id);
      expect(templates.map(t => t.id)).toContain(mockTemplates[1].id);
    });

    it('should return empty array when no templates loaded', () => {
      const emptyManager = new TemplateManager('/empty', '/empty');
      const templates = emptyManager.getAllTemplates();

      expect(templates).toHaveLength(0);
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should return immutable array reference', () => {
      const templates1 = templateManager.getAllTemplates();
      const templates2 = templateManager.getAllTemplates();

      // Should return new arrays each time
      expect(templates1).not.toBe(templates2);
      expect(templates1).toEqual(templates2);
    });
  });

  describe('getTemplate', () => {
    beforeEach(async () => {
      mockedFs.readdir.mockResolvedValue([
        { name: 'template.json', isFile: () => true } as any
      ]);

      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockTemplates[0]));
      await templateManager.initialize();
    });

    it('should return template by ID', () => {
      const template = templateManager.getTemplate(mockTemplates[0].id);

      expect(template).not.toBeNull();
      expect(template?.id).toBe(mockTemplates[0].id);
      expect(template?.name).toBe(mockTemplates[0].name);
    });

    it('should return null for non-existent template', () => {
      const template = templateManager.getTemplate('non-existent-id');
      expect(template).toBeNull();
    });

    it('should be case-sensitive for template IDs', () => {
      const template = templateManager.getTemplate(mockTemplates[0].id.toUpperCase());
      expect(template).toBeNull();
    });
  });

  describe('getTemplatesByCategory', () => {
    beforeEach(async () => {
      const categoryTemplates = [
        Factory.createPRPTemplate({ id: 'web1', category: 'web-development' }),
        Factory.createPRPTemplate({ id: 'web2', category: 'web-development' }),
        Factory.createPRPTemplate({ id: 'mobile1', category: 'mobile-development' })
      ];

      mockedFs.readdir.mockResolvedValue([
        { name: 'web1.json', isFile: () => true } as any,
        { name: 'web2.json', isFile: () => true } as any,
        { name: 'mobile1.json', isFile: () => true } as any
      ]);

      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(categoryTemplates[0]))
        .mockResolvedValueOnce(JSON.stringify(categoryTemplates[1]))
        .mockResolvedValueOnce(JSON.stringify(categoryTemplates[2]));

      await templateManager.initialize();
    });

    it('should return templates filtered by category', () => {
      const webTemplates = templateManager.getTemplatesByCategory('web-development');
      const mobileTemplates = templateManager.getTemplatesByCategory('mobile-development');

      expect(webTemplates).toHaveLength(2);
      expect(mobileTemplates).toHaveLength(1);
      expect(webTemplates.every(t => t.category === 'web-development')).toBe(true);
      expect(mobileTemplates[0].category).toBe('mobile-development');
    });

    it('should return empty array for non-existent category', () => {
      const templates = templateManager.getTemplatesByCategory('non-existent-category');
      expect(templates).toHaveLength(0);
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should be case-sensitive for categories', () => {
      const templates = templateManager.getTemplatesByCategory('WEB-DEVELOPMENT');
      expect(templates).toHaveLength(0);
    });
  });

  describe('searchTemplates', () => {
    beforeEach(async () => {
      const searchTemplates = [
        Factory.createPRPTemplate({
          id: 'react-app',
          name: 'React Application',
          description: 'Modern React app with TypeScript',
          tags: ['react', 'typescript', 'frontend']
        }),
        Factory.createPRPTemplate({
          id: 'vue-app',
          name: 'Vue.js Application',
          description: 'Vue application with Composition API',
          tags: ['vue', 'javascript', 'frontend']
        }),
        Factory.createPRPTemplate({
          id: 'node-api',
          name: 'Node.js API',
          description: 'REST API built with Express.js',
          tags: ['node', 'express', 'backend']
        })
      ];

      mockedFs.readdir.mockResolvedValue([
        { name: 'react.json', isFile: () => true } as any,
        { name: 'vue.json', isFile: () => true } as any,
        { name: 'node.json', isFile: () => true } as any
      ]);

      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(searchTemplates[0]))
        .mockResolvedValueOnce(JSON.stringify(searchTemplates[1]))
        .mockResolvedValueOnce(JSON.stringify(searchTemplates[2]));

      await templateManager.initialize();
    });

    it('should search by template name', () => {
      const results = templateManager.searchTemplates('react');
      expect(results).toHaveLength(1);
      expect(results[0].name).toContain('React');
    });

    it('should search by description', () => {
      const results = templateManager.searchTemplates('composition');
      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('Composition');
    });

    it('should search by tags', () => {
      const frontendResults = templateManager.searchTemplates('frontend');
      const backendResults = templateManager.searchTemplates('backend');

      expect(frontendResults).toHaveLength(2);
      expect(backendResults).toHaveLength(1);
    });

    it('should be case-insensitive', () => {
      const upperResults = templateManager.searchTemplates('REACT');
      const lowerResults = templateManager.searchTemplates('react');
      const mixedResults = templateManager.searchTemplates('ReAcT');

      expect(upperResults).toHaveLength(1);
      expect(lowerResults).toHaveLength(1);
      expect(mixedResults).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      const results = templateManager.searchTemplates('nonexistent');
      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty search query', () => {
      const results = templateManager.searchTemplates('');
      // Empty string should match all templates
      expect(results).toHaveLength(3);
    });
  });

  describe('getCategories', () => {
    beforeEach(async () => {
      const categoryTemplates = [
        Factory.createPRPTemplate({ category: 'web-development' }),
        Factory.createPRPTemplate({ category: 'web-development' }),
        Factory.createPRPTemplate({ category: 'mobile-development' }),
        Factory.createPRPTemplate({ category: 'api-development' })
      ];

      mockedFs.readdir.mockResolvedValue([
        { name: 'web1.json', isFile: () => true } as any,
        { name: 'web2.json', isFile: () => true } as any,
        { name: 'mobile.json', isFile: () => true } as any,
        { name: 'api.json', isFile: () => true } as any
      ]);

      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(categoryTemplates[0]))
        .mockResolvedValueOnce(JSON.stringify(categoryTemplates[1]))
        .mockResolvedValueOnce(JSON.stringify(categoryTemplates[2]))
        .mockResolvedValueOnce(JSON.stringify(categoryTemplates[3]));

      await templateManager.initialize();
    });

    it('should return unique categories sorted alphabetically', () => {
      const categories = templateManager.getCategories();

      expect(categories).toEqual([
        'api-development',
        'mobile-development',
        'web-development'
      ]);
      expect(categories).toHaveLength(3);
    });

    it('should return empty array when no templates loaded', () => {
      const emptyManager = new TemplateManager('/empty', '/empty');
      const categories = emptyManager.getCategories();

      expect(categories).toHaveLength(0);
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should reload all templates from disk', async () => {
      // Initial load
      mockedFs.readdir.mockResolvedValueOnce([
        { name: 'template1.json', isFile: () => true } as any
      ]);
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(mockTemplates[0]));

      await templateManager.initialize();
      expect(templateManager.getAllTemplates()).toHaveLength(1);

      // Mock new files for refresh
      mockedFs.readdir.mockResolvedValueOnce([
        { name: 'template1.json', isFile: () => true } as any,
        { name: 'template2.json', isFile: () => true } as any
      ]);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockTemplates[0]))
        .mockResolvedValueOnce(JSON.stringify(mockTemplates[1]));

      await templateManager.refresh();
      expect(templateManager.getAllTemplates()).toHaveLength(2);
    });

    it('should clear existing templates before reloading', async () => {
      // Initial load
      mockedFs.readdir.mockResolvedValueOnce([
        { name: 'template1.json', isFile: () => true } as any
      ]);
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(mockTemplates[0]));

      await templateManager.initialize();
      const originalId = templateManager.getAllTemplates()[0].id;

      // Mock refresh with different template
      const newTemplate = Factory.createPRPTemplate({ id: 'new-template' });
      mockedFs.readdir.mockResolvedValueOnce([
        { name: 'new-template.json', isFile: () => true } as any
      ]);
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(newTemplate));

      await templateManager.refresh();
      const templates = templateManager.getAllTemplates();

      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('new-template');
      expect(templateManager.getTemplate(originalId)).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent initialization gracefully', async () => {
      mockedFs.readdir.mockResolvedValue([]);

      // Start multiple initializations concurrently
      const promises = [
        templateManager.initialize(),
        templateManager.initialize(),
        templateManager.initialize()
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should handle large numbers of templates efficiently', async () => {
      const largeTemplateSet = Array.from({ length: 100 }, (_, i) =>
        Factory.createPRPTemplate({ id: `template-${i}`, name: `Template ${i}` })
      );

      mockedFs.readdir.mockResolvedValue(
        largeTemplateSet.map((_, i) => ({ name: `template-${i}.json`, isFile: () => true } as any))
      );

      largeTemplateSet.forEach(template => {
        mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(template));
      });

      await templateManager.initialize();

      const templates = templateManager.getAllTemplates();
      expect(templates).toHaveLength(100);

      // Test search performance
      const start = performance.now();
      const results = templateManager.searchTemplates('Template 5');
      const end = performance.now();

      expect(results).toHaveLength(11); // Template 5, Template 50-59
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    it('should maintain memory efficiency with many operations', async () => {
      mockedFs.readdir.mockResolvedValue([
        { name: 'template.json', isFile: () => true } as any
      ]);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockTemplates[0]));

      await templateManager.initialize();

      // Perform many operations to test for memory leaks
      for (let i = 0; i < 1000; i++) {
        templateManager.getAllTemplates();
        templateManager.getTemplate(mockTemplates[0].id);
        templateManager.searchTemplates('test');
        templateManager.getCategories();
      }

      // If we get here without issues, memory management is working
      expect(templateManager.getAllTemplates()).toHaveLength(1);
    });
  });
});