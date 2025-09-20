/**
 * Unit tests for PRPGenerator class
 */

import { PRPGenerator } from '../prp-generator';
import { TemplateManager } from '../template-manager';
import { PRPTemplate, PRPGenerationRequest } from '../../types/index';
import { Factory, Mocks } from '../../../test/test-helpers/index';
import { z } from 'zod';

describe('PRPGenerator', () => {
  let prpGenerator: PRPGenerator;
  let mockTemplateManager: jest.Mocked<TemplateManager>;
  let mockTemplate: PRPTemplate;
  let mockRequest: PRPGenerationRequest;

  beforeEach(() => {
    // Create mock template with context placeholders
    mockTemplate = Factory.createPRPTemplate({
      id: 'test-template',
      name: 'Test Template',
      sections: [
        Factory.createPRPSection({
          title: 'Project Overview for {{projectName}}',
          content: 'This project in {{domain}} aims to serve {{stakeholders}}.',
          examples: [
            'A {{projectName}} application for {{domain}}',
            'Integration with existing {{domain}} systems'
          ],
          requirements: [
            'Define clear objectives: {{objectives}}',
            'Consider constraints: {{constraints}}'
          ]
        }),
        Factory.createPRPSection({
          title: 'Technical Implementation',
          content: 'Technical details for the {{projectName}} project.',
          requirements: ['Technical architecture document']
        })
      ]
    });

    mockRequest = Factory.createPRPGenerationRequest({
      templateId: 'test-template',
      projectContext: {
        name: 'EcoShop',
        domain: 'e-commerce',
        stakeholders: ['customers', 'merchants', 'administrators'],
        objectives: ['Increase sales', 'Improve user experience'],
        constraints: ['Budget: $100k', 'Timeline: 6 months']
      }
    });

    mockTemplateManager = Mocks.createMockTemplateManager([mockTemplate]);
    prpGenerator = new PRPGenerator(mockTemplateManager);
  });

  describe('Constructor', () => {
    it('should create instance with template manager', () => {
      expect(prpGenerator).toBeInstanceOf(PRPGenerator);
    });
  });

  describe('generatePRP', () => {
    it('should generate PRP with valid request', async () => {
      const result = await prpGenerator.generatePRP(mockRequest);

      expect(typeof result).toBe('string');
      expect(result).toContain('EcoShop');
      expect(result).toContain('e-commerce');
      expect(result).toContain('customers, merchants, administrators');
      expect(mockTemplateManager.getTemplate).toHaveBeenCalledWith('test-template');
    });

    it('should validate request with Zod schema', async () => {
      const invalidRequest = {
        templateId: 'test-template'
        // Missing projectContext
      };

      await expect(prpGenerator.generatePRP(invalidRequest as any))
        .rejects
        .toThrow();
    });

    it('should throw error for non-existent template', async () => {
      mockTemplateManager.getTemplate.mockReturnValue(null);

      await expect(prpGenerator.generatePRP(mockRequest))
        .rejects
        .toThrow('Template with ID test-template not found');

      expect(mockTemplateManager.getTemplate).toHaveBeenCalledWith('test-template');
    });

    it('should include custom sections when provided', async () => {
      const requestWithCustomSections = {
        ...mockRequest,
        customSections: [
          Factory.createPRPSection({
            title: 'Custom Requirements',
            content: 'Special project requirements for {{projectName}}'
          })
        ]
      };

      const result = await prpGenerator.generatePRP(requestWithCustomSections);

      expect(result).toContain('Custom Requirements');
      expect(result).toContain('Special project requirements for EcoShop');
    });

    it('should handle different output formats', async () => {
      const markdownResult = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'markdown'
      });
      expect(markdownResult).toContain('# Product Requirements Prompt');
      expect(markdownResult).toContain('## Project Overview for EcoShop');

      const jsonResult = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'json'
      });
      const jsonParsed = JSON.parse(jsonResult);
      expect(jsonParsed.sections).toBeDefined();
      expect(jsonParsed.metadata).toBeDefined();

      const htmlResult = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'html'
      });
      expect(htmlResult).toContain('<!DOCTYPE html>');
      expect(htmlResult).toContain('<h1>Product Requirements Prompt</h1>');
    });
  });

  describe('Context Substitution', () => {
    it('should substitute project name placeholders', async () => {
      const result = await prpGenerator.generatePRP(mockRequest);

      expect(result).toContain('EcoShop');
      expect(result).not.toContain('{{projectName}}');
    });

    it('should substitute domain placeholders', async () => {
      const result = await prpGenerator.generatePRP(mockRequest);

      expect(result).toContain('e-commerce');
      expect(result).not.toContain('{{domain}}');
    });

    it('should substitute stakeholders as comma-separated list', async () => {
      const result = await prpGenerator.generatePRP(mockRequest);

      expect(result).toContain('customers, merchants, administrators');
      expect(result).not.toContain('{{stakeholders}}');
    });

    it('should substitute objectives as numbered list', async () => {
      const result = await prpGenerator.generatePRP(mockRequest);

      expect(result).toContain('1. Increase sales');
      expect(result).toContain('2. Improve user experience');
      expect(result).not.toContain('{{objectives}}');
    });

    it('should substitute constraints as numbered list', async () => {
      const result = await prpGenerator.generatePRP(mockRequest);

      expect(result).toContain('1. Budget: $100k');
      expect(result).toContain('2. Timeline: 6 months');
      expect(result).not.toContain('{{constraints}}');
    });

    it('should handle missing context gracefully with defaults', async () => {
      const minimalRequest = Factory.createPRPGenerationRequest({
        templateId: 'test-template',
        projectContext: {
          name: 'Test Project',
          domain: 'testing'
          // Missing stakeholders, objectives, constraints
        }
      });

      const result = await prpGenerator.generatePRP(minimalRequest);

      expect(result).toContain('Test Project');
      expect(result).toContain('testing');
      // Should not contain unsubstituted placeholders for missing fields
    });

    it('should use default values for missing required context', async () => {
      const templateWithDefaults = Factory.createPRPTemplate({
        sections: [
          Factory.createPRPSection({
            title: 'Project {{projectName}}',
            content: 'Domain: {{domain}}'
          })
        ]
      });

      mockTemplateManager.getTemplate.mockReturnValue(templateWithDefaults);

      const requestWithMissingContext = {
        templateId: 'test-template',
        projectContext: {
          // Missing name and domain - should use defaults
        }
      } as any;

      const result = await prpGenerator.generatePRP(requestWithMissingContext);

      expect(result).toContain('Your Project');
      expect(result).toContain('software development');
    });
  });

  describe('Markdown Formatting', () => {
    it('should generate proper markdown structure', async () => {
      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'markdown'
      });

      expect(result).toMatch(/^# Product Requirements Prompt\n\n/);
      expect(result).toContain('> **Generated from:** Test Template');
      expect(result).toContain('> **Project:** EcoShop');
      expect(result).toContain('> **Domain:** e-commerce');
      expect(result).toContain('## Project Overview for EcoShop');
      expect(result).toContain('## Technical Implementation');
    });

    it('should format examples as bullet points', async () => {
      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'markdown'
      });

      expect(result).toContain('### Examples');
      expect(result).toContain('- A EcoShop application for e-commerce');
    });

    it('should format requirements as bullet points', async () => {
      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'markdown'
      });

      expect(result).toContain('### Requirements');
      expect(result).toContain('- Define clear objectives: 1. Increase sales');
    });

    it('should skip empty examples and requirements sections', async () => {
      const templateWithoutExtras = Factory.createPRPTemplate({
        sections: [
          Factory.createPRPSection({
            title: 'Simple Section',
            content: 'Simple content'
            // No examples or requirements
          })
        ]
      });

      mockTemplateManager.getTemplate.mockReturnValue(templateWithoutExtras);

      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'markdown'
      });

      expect(result).not.toContain('### Examples');
      expect(result).not.toContain('### Requirements');
    });
  });

  describe('JSON Formatting', () => {
    it('should generate valid JSON structure', async () => {
      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'json'
      });

      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('sections');
      expect(parsed).toHaveProperty('metadata');
      expect(Array.isArray(parsed.sections)).toBe(true);
      expect(parsed.sections.length).toBeGreaterThan(0);
      expect(parsed.metadata.template).toBe('Test Template');
      expect(parsed.metadata.projectContext.name).toBe('EcoShop');
    });

    it('should include processed sections in JSON', async () => {
      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'json'
      });

      const parsed = JSON.parse(result);
      const firstSection = parsed.sections[0];

      expect(firstSection.title).toBe('Project Overview for EcoShop');
      expect(firstSection.content).toContain('e-commerce');
      expect(firstSection.examples).toContain('A EcoShop application for e-commerce');
    });

    it('should include generation metadata', async () => {
      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'json'
      });

      const parsed = JSON.parse(result);

      expect(parsed.metadata.template).toBe('Test Template');
      expect(parsed.metadata.templateVersion).toBe(mockTemplate.version);
      expect(parsed.metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(parsed.metadata.projectContext).toEqual(mockRequest.projectContext);
    });
  });

  describe('HTML Formatting', () => {
    it('should generate valid HTML document', async () => {
      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'html'
      });

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html lang="en">');
      expect(result).toContain('<head>');
      expect(result).toContain('<title>Product Requirements Prompt</title>');
      expect(result).toContain('<body>');
      expect(result).toContain('</html>');
    });

    it('should include proper metadata section', async () => {
      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'html'
      });

      expect(result).toContain('<div class="metadata">');
      expect(result).toContain('<strong>Generated from:</strong> Test Template');
      expect(result).toContain('<strong>Project:</strong> EcoShop');
      expect(result).toContain('<strong>Domain:</strong> e-commerce');
    });

    it('should format sections with proper HTML structure', async () => {
      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'html'
      });

      expect(result).toContain('<div class="section">');
      expect(result).toContain('<h2>Project Overview for EcoShop</h2>');
      expect(result).toContain('<h3>Examples</h3>');
      expect(result).toContain('<ul class="examples">');
      expect(result).toContain('<h3>Requirements</h3>');
      expect(result).toContain('<ul class="requirements">');
    });

    it('should handle line breaks in content', async () => {
      const templateWithLineBreaks = Factory.createPRPTemplate({
        sections: [
          Factory.createPRPSection({
            title: 'Multi-line Content',
            content: 'Line 1\nLine 2\nLine 3'
          })
        ]
      });

      mockTemplateManager.getTemplate.mockReturnValue(templateWithLineBreaks);

      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'html'
      });

      expect(result).toContain('Line 1<br>Line 2<br>Line 3');
    });

    it('should include CSS styling', async () => {
      const result = await prpGenerator.generatePRP({
        ...mockRequest,
        outputFormat: 'html'
      });

      expect(result).toContain('<style>');
      expect(result).toContain('font-family: Arial, sans-serif');
      expect(result).toContain('.metadata');
      expect(result).toContain('.section');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle templates with no sections', async () => {
      const emptyTemplate = Factory.createPRPTemplate({
        sections: []
      });

      mockTemplateManager.getTemplate.mockReturnValue(emptyTemplate);

      const result = await prpGenerator.generatePRP(mockRequest);

      expect(result).toContain('Product Requirements Prompt');
      // Should still have metadata even with no sections
      expect(result).toContain('Test Template');
    });

    it('should handle very large templates efficiently', async () => {
      const largeTemplate = Factory.createPRPTemplate({
        sections: Array.from({ length: 50 }, (_, i) =>
          Factory.createPRPSection({
            title: `Section ${i + 1}`,
            content: `Content for section ${i + 1}`.repeat(100)
          })
        )
      });

      mockTemplateManager.getTemplate.mockReturnValue(largeTemplate);

      const start = performance.now();
      const result = await prpGenerator.generatePRP(mockRequest);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle special characters in context values', async () => {
      const specialCharsRequest = Factory.createPRPGenerationRequest({
        templateId: 'test-template',
        projectContext: {
          name: 'Project <with> "special" & characters',
          domain: 'e-commerce & retail',
          stakeholders: ['users & customers', 'admin@company.com']
        }
      });

      const htmlResult = await prpGenerator.generatePRP({
        ...specialCharsRequest,
        outputFormat: 'html'
      });

      // HTML should contain the special characters (basic implementation doesn't escape)
      expect(htmlResult).toContain('Project <with> "special" & characters');
      expect(htmlResult).toContain('users & customers, admin@company.com');
    });

    it('should handle null/undefined template manager gracefully', () => {
      expect(() => new PRPGenerator(null as any)).not.toThrow();

      const nullGenerator = new PRPGenerator(null as any);
      expect(nullGenerator.generatePRP(mockRequest)).rejects.toThrow();
    });

    it('should maintain consistent output across multiple generations', async () => {
      const results = await Promise.all([
        prpGenerator.generatePRP(mockRequest),
        prpGenerator.generatePRP(mockRequest),
        prpGenerator.generatePRP(mockRequest)
      ]);

      // Results should be identical except for generation timestamp
      const result1Clean = results[0].replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, 'TIMESTAMP');
      const result2Clean = results[1].replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, 'TIMESTAMP');
      const result3Clean = results[2].replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, 'TIMESTAMP');

      expect(result1Clean).toBe(result2Clean);
      expect(result2Clean).toBe(result3Clean);
    });
  });

  describe('Integration with TemplateManager', () => {
    it('should pass correct template ID to template manager', async () => {
      await prpGenerator.generatePRP(mockRequest);

      expect(mockTemplateManager.getTemplate).toHaveBeenCalledWith('test-template');
      expect(mockTemplateManager.getTemplate).toHaveBeenCalledTimes(1);
    });

    it('should work with different template managers', async () => {
      const alternateTemplate = Factory.createPRPTemplate({
        id: 'alternate',
        name: 'Alternate Template'
      });

      const alternateManager = Mocks.createMockTemplateManager([alternateTemplate]);
      const alternateGenerator = new PRPGenerator(alternateManager);

      const alternateRequest = Factory.createPRPGenerationRequest({
        templateId: 'alternate'
      });

      const result = await alternateGenerator.generatePRP(alternateRequest);

      expect(result).toContain('Alternate Template');
      expect(alternateManager.getTemplate).toHaveBeenCalledWith('alternate');
    });

    it('should handle template manager errors gracefully', async () => {
      mockTemplateManager.getTemplate.mockImplementation(() => {
        throw new Error('Template manager error');
      });

      await expect(prpGenerator.generatePRP(mockRequest))
        .rejects
        .toThrow('Template manager error');
    });
  });
});