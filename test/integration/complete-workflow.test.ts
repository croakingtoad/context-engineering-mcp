/**
 * Integration tests for complete PRP generation workflows
 * Tests the entire pipeline from template loading to PRP generation
 */

import * as path from 'path';
import { TemplateManager } from '../../src/lib/template-manager';
import { PRPGenerator } from '../../src/lib/prp-generator';
import { Factory, FileSystem } from '../test-helpers/index';
import { PRPTemplate, PRPGenerationRequest } from '../../src/types/index';

describe('Complete Workflow Integration Tests', () => {
  let templateManager: TemplateManager;
  let prpGenerator: PRPGenerator;
  let tempTemplatesDir: string;
  let tempExternalDir: string;

  beforeAll(async () => {
    // Create temporary directories for real file system tests
    tempTemplatesDir = await FileSystem.createTempDir('integration-templates');
    tempExternalDir = await FileSystem.createTempDir('integration-external');

    // Create real template files
    const templates = [
      Factory.createPRPTemplate({
        id: 'web-app-integration',
        name: 'Web Application Integration Test Template',
        category: 'web-development',
        sections: [
          Factory.createPRPSection({
            title: 'Project Overview for {{projectName}}',
            content: 'This {{domain}} project will serve {{stakeholders}} with the following objectives:\\n{{objectives}}\\n\\nConstraints to consider:\\n{{constraints}}',
            examples: [
              'E-commerce platform for {{projectName}}',
              'User management system for {{domain}}'
            ],
            requirements: [
              'Clear project scope definition',
              'Stakeholder analysis: {{stakeholders}}',
              'Technical feasibility study'
            ]
          }),
          Factory.createPRPSection({
            title: 'Technical Architecture',
            content: 'Define the technical architecture for {{projectName}} in the {{domain}} domain.',
            examples: [
              'Microservices architecture with API gateway',
              'Monolithic application with modular design'
            ],
            requirements: [
              'Technology stack selection',
              'Scalability requirements',
              'Security considerations'
            ]
          }),
          Factory.createPRPSection({
            title: 'Implementation Strategy',
            content: 'Implementation approach for {{projectName}} considering {{constraints}}.',
            requirements: [
              'Development methodology selection',
              'Timeline and milestones',
              'Resource allocation'
            ]
          })
        ]
      }),
      Factory.createPRPTemplate({
        id: 'mobile-app-integration',
        name: 'Mobile Application Integration Test Template',
        category: 'mobile-development',
        sections: [
          Factory.createPRPSection({
            title: 'Mobile Strategy for {{projectName}}',
            content: 'Mobile application strategy for {{projectName}} in {{domain}}.',
            examples: [
              'Native iOS and Android apps',
              'Cross-platform solution with React Native'
            ]
          })
        ]
      })
    ];

    await FileSystem.createMockTemplateFiles(tempTemplatesDir, templates);

    // Create external template
    const externalTemplate = Factory.createPRPTemplate({
      id: 'external-template',
      name: 'External Template',
      category: 'external',
      sections: [
        Factory.createPRPSection({
          title: 'External Requirements',
          content: 'External template content for {{projectName}}'
        })
      ]
    });

    await FileSystem.createMockTemplateFiles(tempExternalDir, [externalTemplate]);
  });

  afterAll(async () => {
    await FileSystem.cleanup(tempTemplatesDir);
    await FileSystem.cleanup(tempExternalDir);
  });

  beforeEach(async () => {
    // Initialize components for each test
    templateManager = new TemplateManager(tempTemplatesDir, tempExternalDir);
    await templateManager.initialize();

    prpGenerator = new PRPGenerator(templateManager);
  });

  describe('End-to-End Template Processing', () => {
    it('should load templates from both directories and generate PRP', async () => {
      // Verify templates are loaded
      const allTemplates = templateManager.getAllTemplates();
      expect(allTemplates).toHaveLength(3); // 2 internal + 1 external

      const webTemplate = templateManager.getTemplate('web-app-integration');
      expect(webTemplate).not.toBeNull();
      expect(webTemplate?.sections).toHaveLength(3);

      const externalTemplate = templateManager.getTemplate('external-template');
      expect(externalTemplate).not.toBeNull();

      // Generate PRP using loaded template
      const request: PRPGenerationRequest = {
        templateId: 'web-app-integration',
        projectContext: {
          name: 'EcoShop Platform',
          domain: 'sustainable e-commerce',
          stakeholders: ['eco-conscious consumers', 'sustainable brands', 'logistics partners'],
          objectives: [
            'Reduce environmental impact of online shopping',
            'Connect consumers with sustainable products',
            'Provide transparent supply chain information'
          ],
          constraints: [
            'Budget limitation: $250,000',
            'Launch deadline: 8 months',
            'Compliance with environmental regulations'
          ]
        },
        outputFormat: 'markdown'
      };

      const generatedPRP = await prpGenerator.generatePRP(request);

      // Verify content substitution
      expect(generatedPRP).toContain('# Product Requirements Prompt');
      expect(generatedPRP).toContain('EcoShop Platform');
      expect(generatedPRP).toContain('sustainable e-commerce');
      expect(generatedPRP).toContain('eco-conscious consumers, sustainable brands, logistics partners');
      expect(generatedPRP).toContain('1. Reduce environmental impact');
      expect(generatedPRP).toContain('2. Connect consumers with sustainable products');
      expect(generatedPRP).toContain('1. Budget limitation: $250,000');

      // Verify structure
      expect(generatedPRP).toContain('## Project Overview for EcoShop Platform');
      expect(generatedPRP).toContain('## Technical Architecture');
      expect(generatedPRP).toContain('## Implementation Strategy');
      expect(generatedPRP).toContain('### Examples');
      expect(generatedPRP).toContain('### Requirements');
    });

    it('should handle template categorization and searching', async () => {
      // Test category filtering
      const webTemplates = templateManager.getTemplatesByCategory('web-development');
      const mobileTemplates = templateManager.getTemplatesByCategory('mobile-development');
      const externalTemplates = templateManager.getTemplatesByCategory('external');

      expect(webTemplates).toHaveLength(1);
      expect(mobileTemplates).toHaveLength(1);
      expect(externalTemplates).toHaveLength(1);

      // Test searching
      const searchResults = templateManager.searchTemplates('integration');
      expect(searchResults).toHaveLength(3); // All templates contain 'integration'

      const webSearchResults = templateManager.searchTemplates('web');
      expect(webSearchResults).toHaveLength(1);
      expect(webSearchResults[0].id).toBe('web-app-integration');
    });

    it('should generate different output formats correctly', async () => {
      const request: PRPGenerationRequest = {
        templateId: 'web-app-integration',
        projectContext: {
          name: 'TestApp',
          domain: 'testing',
          stakeholders: ['developers', 'testers'],
          objectives: ['Ensure quality'],
          constraints: ['Time limit']
        }
      };

      // Test Markdown format
      const markdownOutput = await prpGenerator.generatePRP({
        ...request,
        outputFormat: 'markdown'
      });
      expect(markdownOutput).toContain('# Product Requirements Prompt');
      expect(markdownOutput).toContain('## Project Overview for TestApp');

      // Test JSON format
      const jsonOutput = await prpGenerator.generatePRP({
        ...request,
        outputFormat: 'json'
      });
      const jsonParsed = JSON.parse(jsonOutput);
      expect(jsonParsed.sections).toHaveLength(3);
      expect(jsonParsed.metadata.template).toBe('Web Application Integration Test Template');
      expect(jsonParsed.sections[0].title).toBe('Project Overview for TestApp');

      // Test HTML format
      const htmlOutput = await prpGenerator.generatePRP({
        ...request,
        outputFormat: 'html'
      });
      expect(htmlOutput).toContain('<!DOCTYPE html>');
      expect(htmlOutput).toContain('<h2>Project Overview for TestApp</h2>');
      expect(htmlOutput).toContain('<strong>Project:</strong> TestApp');
    });

    it('should handle custom sections integration', async () => {
      const request: PRPGenerationRequest = {
        templateId: 'mobile-app-integration',
        projectContext: {
          name: 'MobileApp',
          domain: 'mobile'
        },
        customSections: [
          Factory.createPRPSection({
            title: 'Custom Security Requirements',
            content: 'Security considerations specific to {{projectName}} mobile application.',
            requirements: [
              'Biometric authentication',
              'Data encryption at rest and in transit',
              'OWASP mobile security compliance'
            ]
          }),
          Factory.createPRPSection({
            title: 'Performance Benchmarks',
            content: 'Performance requirements for {{projectName}}.',
            examples: [
              'App launch time < 2 seconds',
              'Smooth 60fps animations',
              'Memory usage < 100MB'
            ]
          })
        ],
        outputFormat: 'markdown'
      };

      const result = await prpGenerator.generatePRP(request);

      // Should contain original template sections
      expect(result).toContain('## Mobile Strategy for MobileApp');

      // Should contain custom sections
      expect(result).toContain('## Custom Security Requirements');
      expect(result).toContain('## Performance Benchmarks');
      expect(result).toContain('Security considerations specific to MobileApp');
      expect(result).toContain('OWASP mobile security compliance');
      expect(result).toContain('App launch time < 2 seconds');
    });
  });

  describe('Error Handling in Complete Workflows', () => {
    it('should handle missing template gracefully', async () => {
      const request: PRPGenerationRequest = {
        templateId: 'non-existent-template',
        projectContext: {
          name: 'Test',
          domain: 'test'
        }
      };

      await expect(prpGenerator.generatePRP(request))
        .rejects
        .toThrow('Template with ID non-existent-template not found');
    });

    it('should handle template refresh during operation', async () => {
      // Initial generation
      const request: PRPGenerationRequest = {
        templateId: 'web-app-integration',
        projectContext: {
          name: 'RefreshTest',
          domain: 'testing'
        }
      };

      const initialResult = await prpGenerator.generatePRP(request);
      expect(initialResult).toContain('RefreshTest');

      // Add new template file
      const newTemplate = Factory.createPRPTemplate({
        id: 'new-template-added',
        name: 'Newly Added Template',
        sections: [
          Factory.createPRPSection({
            title: 'New Section',
            content: 'Content for {{projectName}}'
          })
        ]
      });

      await FileSystem.createMockTemplateFiles(tempTemplatesDir, [newTemplate]);

      // Refresh templates
      await templateManager.refresh();

      // Verify new template is available
      const newTemplateLoaded = templateManager.getTemplate('new-template-added');
      expect(newTemplateLoaded).not.toBeNull();

      // Original template should still work
      const refreshedResult = await prpGenerator.generatePRP(request);
      expect(refreshedResult).toContain('RefreshTest');
    });

    it('should handle concurrent PRP generation requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        templateId: 'web-app-integration',
        projectContext: {
          name: `ConcurrentApp${i}`,
          domain: 'testing',
          stakeholders: [`user${i}`, `admin${i}`]
        },
        outputFormat: 'markdown' as const
      }));

      const results = await Promise.all(
        requests.map(request => prpGenerator.generatePRP(request))
      );

      expect(results).toHaveLength(5);

      results.forEach((result, i) => {
        expect(result).toContain(`ConcurrentApp${i}`);
        expect(result).toContain(`user${i}, admin${i}`);
        expect(result).toContain('# Product Requirements Prompt');
      });

      // Verify each result is unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(5);
    });

    it('should maintain consistency across format changes', async () => {
      const baseRequest: PRPGenerationRequest = {
        templateId: 'web-app-integration',
        projectContext: {
          name: 'ConsistencyTest',
          domain: 'testing',
          stakeholders: ['user1', 'user2'],
          objectives: ['Objective 1', 'Objective 2'],
          constraints: ['Constraint 1']
        }
      };

      const markdownResult = await prpGenerator.generatePRP({
        ...baseRequest,
        outputFormat: 'markdown'
      });

      const jsonResult = await prpGenerator.generatePRP({
        ...baseRequest,
        outputFormat: 'json'
      });

      const htmlResult = await prpGenerator.generatePRP({
        ...baseRequest,
        outputFormat: 'html'
      });

      // Parse JSON to verify content
      const jsonData = JSON.parse(jsonResult);

      // All formats should contain the same core information
      expect(markdownResult).toContain('ConsistencyTest');
      expect(jsonData.metadata.projectContext.name).toBe('ConsistencyTest');
      expect(htmlResult).toContain('ConsistencyTest');

      expect(markdownResult).toContain('user1, user2');
      expect(jsonData.sections[0].content).toContain('user1, user2');
      expect(htmlResult).toContain('user1, user2');

      // Verify section count consistency
      const markdownSectionCount = (markdownResult.match(/^##\s/gm) || []).length;
      const jsonSectionCount = jsonData.sections.length;
      const htmlSectionCount = (htmlResult.match(/<h2>/g) || []).length;

      expect(markdownSectionCount).toBe(jsonSectionCount);
      expect(jsonSectionCount).toBe(htmlSectionCount);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large template files efficiently', async () => {
      // Create a large template with many sections
      const largeTemplate = Factory.createPRPTemplate({
        id: 'large-template',
        name: 'Large Template for Performance Testing',
        sections: Array.from({ length: 50 }, (_, i) =>
          Factory.createPRPSection({
            title: `Section ${i + 1} for {{projectName}}`,
            content: `This is section ${i + 1} content for {{projectName}} in {{domain}}. `.repeat(10),
            examples: Array.from({ length: 10 }, (_, j) => `Example ${j + 1} for {{projectName}}`),
            requirements: Array.from({ length: 10 }, (_, j) => `Requirement ${j + 1} for {{domain}}`)
          })
        )
      });

      // Write large template to disk
      await FileSystem.createMockTemplateFiles(tempTemplatesDir, [largeTemplate]);
      await templateManager.refresh();

      const request: PRPGenerationRequest = {
        templateId: 'large-template',
        projectContext: {
          name: 'PerformanceTest',
          domain: 'performance-testing',
          stakeholders: ['performance-testers', 'developers'],
          objectives: ['Test performance', 'Validate scalability'],
          constraints: ['Memory usage', 'Processing time']
        },
        outputFormat: 'markdown'
      };

      // Measure performance
      const start = performance.now();
      const result = await prpGenerator.generatePRP(request);
      const end = performance.now();

      // Should complete within reasonable time (< 1 second for 50 sections)
      expect(end - start).toBeLessThan(1000);

      // Verify all sections are processed
      const sectionCount = (result.match(/^##\s/gm) || []).length;
      expect(sectionCount).toBe(50);

      // Verify content substitution worked
      expect(result).toContain('PerformanceTest');
      expect(result).toContain('performance-testing');
      expect(result).not.toContain('{{projectName}}');
      expect(result).not.toContain('{{domain}}');
    });

    it('should handle memory efficiently with multiple large operations', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        templateId: 'web-app-integration',
        projectContext: {
          name: `MemoryTest${i}`,
          domain: 'memory-testing',
          stakeholders: Array.from({ length: 20 }, (_, j) => `stakeholder${i}-${j}`),
          objectives: Array.from({ length: 10 }, (_, j) => `Objective ${i}-${j}`),
          constraints: Array.from({ length: 10 }, (_, j) => `Constraint ${i}-${j}`)
        },
        outputFormat: 'json' as const
      }));

      const results = await Promise.all(
        requests.map(request => prpGenerator.generatePRP(request))
      );

      expect(results).toHaveLength(10);

      results.forEach((result, i) => {
        const parsed = JSON.parse(result);
        expect(parsed.metadata.projectContext.name).toBe(`MemoryTest${i}`);
        expect(parsed.sections).toBeDefined();
      });

      // If we get here without memory issues, the test passes
      expect(true).toBe(true);
    });
  });

  describe('Template Validation Integration', () => {
    it('should reject invalid template files during loading', async () => {
      // Create invalid template file
      const invalidTemplate = {
        id: 'invalid-template',
        name: 'Invalid Template'
        // Missing required fields: description, category, sections, version
      };

      const invalidTempDir = await FileSystem.createTempDir('invalid-templates');
      await FileSystem.createMockTemplateFiles(invalidTempDir, [invalidTemplate as any]);

      const testManager = new TemplateManager(invalidTempDir, tempExternalDir);
      await testManager.initialize();

      // Invalid template should not be loaded
      const invalidTemplateLoaded = testManager.getTemplate('invalid-template');
      expect(invalidTemplateLoaded).toBeNull();

      // Valid external template should still be loaded
      const validExternal = testManager.getTemplate('external-template');
      expect(validExternal).not.toBeNull();

      await FileSystem.cleanup(invalidTempDir);
    });

    it('should handle mixed valid and invalid templates', async () => {
      const mixedTemplates = [
        Factory.createPRPTemplate({ id: 'valid-1', name: 'Valid Template 1' }),
        { id: 'invalid-1', name: 'Invalid Template 1' }, // Missing required fields
        Factory.createPRPTemplate({ id: 'valid-2', name: 'Valid Template 2' }),
        { id: 'invalid-2' } // Severely malformed
      ];

      const mixedTempDir = await FileSystem.createTempDir('mixed-templates');
      await FileSystem.createMockTemplateFiles(mixedTempDir, mixedTemplates as any);

      const testManager = new TemplateManager(mixedTempDir, tempExternalDir);
      await testManager.initialize();

      // Should load only valid templates
      const allTemplates = testManager.getAllTemplates();
      const loadedIds = allTemplates.map(t => t.id);

      expect(loadedIds).toContain('valid-1');
      expect(loadedIds).toContain('valid-2');
      expect(loadedIds).toContain('external-template'); // From external dir
      expect(loadedIds).not.toContain('invalid-1');
      expect(loadedIds).not.toContain('invalid-2');

      await FileSystem.cleanup(mixedTempDir);
    });
  });
});