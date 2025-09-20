/**
 * Test Helper Utilities
 * Provides reusable testing utilities, mocks, and factory functions
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PRPTemplate, PRPSection, PRPGenerationRequest, ProjectAnalysis, Question } from '../../src/types/index';

/**
 * Test data factories for consistent test data generation
 */
export class TestDataFactory {
  /**
   * Create a mock PRP template
   */
  static createPRPTemplate(overrides: Partial<PRPTemplate> = {}): PRPTemplate {
    return {
      id: 'test-template-1',
      name: 'Test Web Application Template',
      description: 'A comprehensive template for web application development',
      category: 'web-development',
      version: '1.0.0',
      author: 'Test Author',
      tags: ['web', 'frontend', 'fullstack'],
      sections: [
        {
          title: 'Project Overview',
          content: 'Define the core purpose and scope of the web application',
          examples: ['E-commerce platform', 'Content management system'],
          requirements: ['Clear value proposition', 'Target audience definition']
        },
        {
          title: 'Technical Requirements',
          content: 'Specify the technical architecture and constraints',
          examples: ['React with TypeScript', 'Node.js backend with PostgreSQL'],
          requirements: ['Technology stack selection', 'Performance requirements']
        }
      ],
      ...overrides
    };
  }

  /**
   * Create a mock PRP section
   */
  static createPRPSection(overrides: Partial<PRPSection> = {}): PRPSection {
    return {
      title: 'Test Section',
      content: 'This is a test section content for validation',
      examples: ['Example 1', 'Example 2'],
      requirements: ['Requirement 1', 'Requirement 2'],
      ...overrides
    };
  }

  /**
   * Create a mock project context
   */
  static createProjectContext(overrides: any = {}) {
    return {
      name: 'Test Project',
      domain: 'web-development',
      stakeholders: ['Product Manager', 'Developer', 'Designer'],
      constraints: ['Budget: $50,000', 'Timeline: 3 months'],
      objectives: ['Increase user engagement', 'Reduce operational costs'],
      ...overrides
    };
  }

  /**
   * Create a mock PRP generation request
   */
  static createPRPGenerationRequest(overrides: Partial<PRPGenerationRequest> = {}): PRPGenerationRequest {
    return {
      templateId: 'test-template-1',
      projectContext: this.createProjectContext(),
      outputFormat: 'markdown',
      ...overrides
    };
  }

  /**
   * Create multiple templates for testing collections
   */
  static createMultipleTemplates(count: number = 3): PRPTemplate[] {
    return Array.from({ length: count }, (_, index) =>
      this.createPRPTemplate({
        id: `test-template-${index + 1}`,
        name: `Test Template ${index + 1}`,
        category: index % 2 === 0 ? 'web-development' : 'mobile-development'
      })
    );
  }

  /**
   * Create a mock project analysis
   */
  static createProjectAnalysis(overrides: Partial<ProjectAnalysis> = {}): ProjectAnalysis {
    return {
      rootPath: '/test/project',
      language: 'TypeScript',
      framework: 'React',
      architecture: ['component-based', 'client-server'],
      dependencies: { 'react': '18.0.0', 'typescript': '5.0.0' },
      devDependencies: { 'jest': '29.0.0', '@types/node': '20.0.0' },
      fileAnalyses: [],
      patterns: [],
      conventions: {
        naming: 'camelCase',
        structure: ['src/', 'test/', 'dist/'],
        imports: 'ES6'
      },
      recommendations: ['Consider adding error boundaries', 'Implement proper testing'],
      generatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Create mock questions for testing question engine
   */
  static createQuestion(overrides: Partial<Question> = {}): Question {
    return {
      id: 'test-question-1',
      text: 'What is the primary purpose of your application?',
      type: 'text',
      category: 'functional',
      priority: 1,
      required: true,
      ...overrides
    };
  }
}

/**
 * File system test utilities
 */
export class FileSystemTestUtils {
  /**
   * Create temporary test directory
   */
  static async createTempDir(name: string): Promise<string> {
    const tempDir = path.join(__dirname, '../../temp-test-files', name);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Create mock template files for testing
   */
  static async createMockTemplateFiles(dir: string, templates: PRPTemplate[]): Promise<void> {
    await fs.mkdir(dir, { recursive: true });

    for (const template of templates) {
      const filePath = path.join(dir, `${template.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(template, null, 2));
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanup(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * MCP Protocol test utilities
 */
export class MCPTestUtils {
  /**
   * Create mock MCP server request
   */
  static createMCPRequest(tool: string, args: any = {}) {
    return {
      method: 'tools/call',
      params: {
        name: tool,
        arguments: args
      }
    };
  }

  /**
   * Create mock MCP server response
   */
  static createMCPResponse(content: any, isError: boolean = false) {
    if (isError) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${content}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      }],
      isError: false
    };
  }

  /**
   * Validate MCP tool definition structure
   */
  static validateToolDefinition(tool: any): boolean {
    return (
      tool &&
      typeof tool.name === 'string' &&
      typeof tool.description === 'string' &&
      tool.inputSchema &&
      typeof tool.inputSchema === 'object'
    );
  }
}

/**
 * Mock implementations for external dependencies
 */
export class MockImplementations {
  /**
   * Create mock template manager
   */
  static createMockTemplateManager(templates: PRPTemplate[] = []) {
    return {
      initialize: jest.fn().mockResolvedValue(undefined),
      getAllTemplates: jest.fn().mockReturnValue(templates),
      getTemplate: jest.fn().mockImplementation((id: string) =>
        templates.find(t => t.id === id) || null
      ),
      getTemplatesByCategory: jest.fn().mockImplementation((category: string) =>
        templates.filter(t => t.category === category)
      ),
      searchTemplates: jest.fn().mockImplementation((query: string) =>
        templates.filter(t =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.description.toLowerCase().includes(query.toLowerCase())
        )
      ),
      getCategories: jest.fn().mockReturnValue(['web-development', 'mobile-development']),
      refresh: jest.fn().mockResolvedValue(undefined)
    };
  }

  /**
   * Create mock PRP generator
   */
  static createMockPRPGenerator() {
    return {
      generatePRP: jest.fn().mockResolvedValue({
        content: '# Generated PRP\\n\\nThis is a generated Product Requirements Prompt.',
        metadata: {
          templateId: 'test-template-1',
          generatedAt: new Date(),
          version: '1.0.0'
        }
      }),
      validatePRP: jest.fn().mockResolvedValue({
        isValid: true,
        score: 85,
        maxScore: 100,
        sections: [],
        recommendations: [],
        missingElements: [],
        antiPatterns: []
      })
    };
  }

  /**
   * Create mock MCP server
   */
  static createMockMCPServer() {
    const handlers = new Map();

    return {
      setRequestHandler: jest.fn().mockImplementation((schema, handler) => {
        handlers.set(schema, handler);
      }),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      // Helper method to simulate request handling
      _simulateRequest: (schema: any, request: any) => {
        const handler = handlers.get(schema);
        return handler ? handler(request) : Promise.reject(new Error('No handler'));
      }
    };
  }
}

/**
 * Async test utilities
 */
export class AsyncTestUtils {
  /**
   * Wait for a specific condition with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) return;
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Create a promise that resolves after a delay
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    return { result, duration };
  }

  /**
   * Run performance benchmark
   */
  static async benchmark<T>(
    fn: () => Promise<T>,
    iterations: number = 100
  ): Promise<{ average: number; min: number; max: number; results: T[] }> {
    const times: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await this.measureTime(fn);
      times.push(duration);
      results.push(result);
    }

    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      results
    };
  }
}

/**
 * Export all utilities
 */
export {
  TestDataFactory as Factory,
  FileSystemTestUtils as FileSystem,
  MCPTestUtils as MCP,
  MockImplementations as Mocks,
  AsyncTestUtils as Async,
  PerformanceTestUtils as Performance
};