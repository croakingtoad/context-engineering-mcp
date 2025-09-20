/**
 * Unit tests for type definitions and Zod schemas
 */

import { z } from 'zod';
import {
  PRPSectionSchema,
  PRPTemplateSchema,
  PRPGenerationRequestSchema,
  ContextEngineeringWorkflowSchema,
  PRPSection,
  PRPTemplate,
  PRPGenerationRequest,
  ContextEngineeringWorkflow
} from '../index';
import { Factory } from '../../../test/test-helpers/index';

describe('Type Definitions and Schemas', () => {
  describe('PRPSectionSchema', () => {
    it('should validate a valid PRP section', () => {
      const validSection = Factory.createPRPSection();

      expect(() => PRPSectionSchema.parse(validSection)).not.toThrow();

      const result = PRPSectionSchema.parse(validSection);
      expect(result).toMatchObject({
        title: validSection.title,
        content: validSection.content,
        examples: validSection.examples,
        requirements: validSection.requirements
      });
    });

    it('should reject section missing required fields', () => {
      const invalidSection = {
        title: 'Test Section'
        // Missing content field
      };

      expect(() => PRPSectionSchema.parse(invalidSection)).toThrow();
    });

    it('should allow optional fields to be undefined', () => {
      const minimalSection = {
        title: 'Minimal Section',
        content: 'Basic content'
      };

      expect(() => PRPSectionSchema.parse(minimalSection)).not.toThrow();

      const result = PRPSectionSchema.parse(minimalSection);
      expect(result.examples).toBeUndefined();
      expect(result.requirements).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should validate metadata as record of any', () => {
      const sectionWithMetadata = Factory.createPRPSection({
        metadata: {
          priority: 1,
          author: 'Test Author',
          tags: ['important', 'core']
        }
      });

      expect(() => PRPSectionSchema.parse(sectionWithMetadata)).not.toThrow();

      const result = PRPSectionSchema.parse(sectionWithMetadata);
      expect(result.metadata).toEqual({
        priority: 1,
        author: 'Test Author',
        tags: ['important', 'core']
      });
    });
  });

  describe('PRPTemplateSchema', () => {
    it('should validate a complete valid template', () => {
      const validTemplate = Factory.createPRPTemplate();

      expect(() => PRPTemplateSchema.parse(validTemplate)).not.toThrow();

      const result = PRPTemplateSchema.parse(validTemplate);
      expect(result).toMatchObject({
        id: validTemplate.id,
        name: validTemplate.name,
        description: validTemplate.description,
        category: validTemplate.category,
        version: validTemplate.version
      });
      expect(Array.isArray(result.sections)).toBe(true);
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should require all mandatory fields', () => {
      const mandatoryFields = ['id', 'name', 'description', 'category', 'sections', 'version'];

      for (const field of mandatoryFields) {
        const incompleteTemplate = Factory.createPRPTemplate();
        delete (incompleteTemplate as any)[field];

        expect(() => PRPTemplateSchema.parse(incompleteTemplate)).toThrow();
      }
    });

    it('should transform date strings to Date objects', () => {
      const templateWithDates = Factory.createPRPTemplate({
        created: '2024-01-15T10:00:00Z',
        updated: '2024-01-20T14:30:00Z'
      });

      const result = PRPTemplateSchema.parse(templateWithDates);
      expect(result.created).toBeInstanceOf(Date);
      expect(result.updated).toBeInstanceOf(Date);
      expect(result.created?.getTime()).toBe(new Date('2024-01-15T10:00:00Z').getTime());
    });

    it('should handle undefined date fields', () => {
      const templateWithoutDates = Factory.createPRPTemplate();
      delete (templateWithoutDates as any).created;
      delete (templateWithoutDates as any).updated;

      const result = PRPTemplateSchema.parse(templateWithoutDates);
      expect(result.created).toBeUndefined();
      expect(result.updated).toBeUndefined();
    });

    it('should validate nested sections array', () => {
      const templateWithInvalidSection = Factory.createPRPTemplate({
        sections: [
          Factory.createPRPSection(),
          { title: 'Invalid Section' } // Missing content
        ]
      });

      expect(() => PRPTemplateSchema.parse(templateWithInvalidSection)).toThrow();
    });
  });

  describe('PRPGenerationRequestSchema', () => {
    it('should validate a complete generation request', () => {
      const validRequest = Factory.createPRPGenerationRequest();

      expect(() => PRPGenerationRequestSchema.parse(validRequest)).not.toThrow();

      const result = PRPGenerationRequestSchema.parse(validRequest);
      expect(result.templateId).toBe(validRequest.templateId);
      expect(result.projectContext).toMatchObject(validRequest.projectContext);
      expect(result.outputFormat).toBe(validRequest.outputFormat);
    });

    it('should require templateId and projectContext', () => {
      const requestWithoutTemplate = {
        projectContext: Factory.createProjectContext()
      };

      expect(() => PRPGenerationRequestSchema.parse(requestWithoutTemplate)).toThrow();

      const requestWithoutContext = {
        templateId: 'test-template'
      };

      expect(() => PRPGenerationRequestSchema.parse(requestWithoutContext)).toThrow();
    });

    it('should require name and domain in projectContext', () => {
      const requestWithIncompleteContext = {
        templateId: 'test-template',
        projectContext: {
          name: 'Test Project'
          // Missing domain
        }
      };

      expect(() => PRPGenerationRequestSchema.parse(requestWithIncompleteContext)).toThrow();
    });

    it('should default outputFormat to markdown', () => {
      const requestWithoutFormat = {
        templateId: 'test-template',
        projectContext: Factory.createProjectContext()
      };

      const result = PRPGenerationRequestSchema.parse(requestWithoutFormat);
      expect(result.outputFormat).toBe('markdown');
    });

    it('should validate outputFormat enum values', () => {
      const validFormats = ['markdown', 'json', 'html'];

      for (const format of validFormats) {
        const request = Factory.createPRPGenerationRequest({ outputFormat: format as any });
        expect(() => PRPGenerationRequestSchema.parse(request)).not.toThrow();
      }

      const invalidRequest = Factory.createPRPGenerationRequest({ outputFormat: 'xml' as any });
      expect(() => PRPGenerationRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should validate custom sections if provided', () => {
      const requestWithCustomSections = Factory.createPRPGenerationRequest({
        customSections: [
          Factory.createPRPSection({ title: 'Custom Section 1' }),
          Factory.createPRPSection({ title: 'Custom Section 2' })
        ]
      });

      expect(() => PRPGenerationRequestSchema.parse(requestWithCustomSections)).not.toThrow();

      const requestWithInvalidCustomSection = Factory.createPRPGenerationRequest({
        customSections: [
          { title: 'Invalid Custom Section' } // Missing content
        ]
      });

      expect(() => PRPGenerationRequestSchema.parse(requestWithInvalidCustomSection)).toThrow();
    });
  });

  describe('ContextEngineeringWorkflowSchema', () => {
    it('should validate a complete workflow', () => {
      const validWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        steps: [
          {
            id: 'step-1',
            title: 'Step 1',
            description: 'First step',
            tool: 'analyze_context'
          },
          {
            id: 'step-2',
            title: 'Step 2',
            description: 'Second step',
            tool: 'generate_prp',
            parameters: { templateId: 'test' },
            dependencies: ['step-1']
          }
        ]
      };

      expect(() => ContextEngineeringWorkflowSchema.parse(validWorkflow)).not.toThrow();

      const result = ContextEngineeringWorkflowSchema.parse(validWorkflow);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[1].dependencies).toEqual(['step-1']);
    });

    it('should require all mandatory workflow fields', () => {
      const mandatoryFields = ['id', 'name', 'steps'];

      for (const field of mandatoryFields) {
        const incompleteWorkflow = {
          id: 'test',
          name: 'Test',
          steps: []
        };
        delete (incompleteWorkflow as any)[field];

        expect(() => ContextEngineeringWorkflowSchema.parse(incompleteWorkflow)).toThrow();
      }
    });

    it('should validate step structure', () => {
      const workflowWithInvalidStep = {
        id: 'test-workflow',
        name: 'Test Workflow',
        steps: [
          {
            id: 'step-1',
            title: 'Step 1'
            // Missing description and tool
          }
        ]
      };

      expect(() => ContextEngineeringWorkflowSchema.parse(workflowWithInvalidStep)).toThrow();
    });
  });

  describe('Schema Composition and Integration', () => {
    it('should support nested schema validation', () => {
      const complexTemplate = Factory.createPRPTemplate({
        sections: [
          Factory.createPRPSection({
            metadata: {
              workflow: {
                id: 'section-workflow',
                steps: ['analyze', 'generate', 'validate']
              }
            }
          })
        ]
      });

      expect(() => PRPTemplateSchema.parse(complexTemplate)).not.toThrow();
    });

    it('should handle edge cases gracefully', () => {
      // Test with empty arrays
      const templateWithEmptyArrays = Factory.createPRPTemplate({
        tags: [],
        sections: []
      });

      expect(() => PRPTemplateSchema.parse(templateWithEmptyArrays)).not.toThrow();

      // Test with null/undefined values where allowed
      const templateWithNulls = Factory.createPRPTemplate();
      (templateWithNulls as any).author = undefined;
      (templateWithNulls as any).tags = undefined;

      expect(() => PRPTemplateSchema.parse(templateWithNulls)).not.toThrow();
    });
  });

  describe('Type Inference', () => {
    it('should infer correct TypeScript types', () => {
      // This test validates that TypeScript types are correctly inferred from schemas
      const template: PRPTemplate = Factory.createPRPTemplate();
      const section: PRPSection = Factory.createPRPSection();
      const request: PRPGenerationRequest = Factory.createPRPGenerationRequest();
      const workflow: ContextEngineeringWorkflow = {
        id: 'test',
        name: 'Test',
        steps: []
      };

      // If these assignments compile without error, type inference is working
      expect(template.id).toBeDefined();
      expect(section.title).toBeDefined();
      expect(request.templateId).toBeDefined();
      expect(workflow.steps).toBeDefined();
    });

    it('should enforce type safety at compile time', () => {
      // These tests ensure TypeScript catches type errors at compile time
      const template = Factory.createPRPTemplate();

      // Should not compile if accessing non-existent properties
      // @ts-expect-error - intentional type error for testing
      expect(() => console.log(template.nonExistentProperty)).toBeDefined();

      // Should not compile if assigning wrong types
      // @ts-expect-error - intentional type error for testing
      expect(() => { template.version = 123; }).toBeDefined();
    });
  });
});