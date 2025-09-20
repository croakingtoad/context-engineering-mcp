/**
 * Test Helper Utilities
 * Provides reusable testing utilities, mocks, and factory functions
 */
import { PRPTemplate, PRPSection, PRPGenerationRequest, ProjectAnalysis, Question } from '../../src/types/index.js';
/**
 * Test data factories for consistent test data generation
 */
export declare class TestDataFactory {
    /**
     * Create a mock PRP template
     */
    static createPRPTemplate(overrides?: Partial<PRPTemplate>): PRPTemplate;
    /**
     * Create a mock PRP section
     */
    static createPRPSection(overrides?: Partial<PRPSection>): PRPSection;
    /**
     * Create a mock project context
     */
    static createProjectContext(overrides?: any): any;
    /**
     * Create a mock PRP generation request
     */
    static createPRPGenerationRequest(overrides?: Partial<PRPGenerationRequest>): PRPGenerationRequest;
    /**
     * Create multiple templates for testing collections
     */
    static createMultipleTemplates(count?: number): PRPTemplate[];
    /**
     * Create a mock project analysis
     */
    static createProjectAnalysis(overrides?: Partial<ProjectAnalysis>): ProjectAnalysis;
    /**
     * Create mock questions for testing question engine
     */
    static createQuestion(overrides?: Partial<Question>): Question;
}
/**
 * File system test utilities
 */
export declare class FileSystemTestUtils {
    /**
     * Create temporary test directory
     */
    static createTempDir(name: string): Promise<string>;
    /**
     * Create mock template files for testing
     */
    static createMockTemplateFiles(dir: string, templates: PRPTemplate[]): Promise<void>;
    /**
     * Clean up temporary files
     */
    static cleanup(dir: string): Promise<void>;
}
/**
 * MCP Protocol test utilities
 */
export declare class MCPTestUtils {
    /**
     * Create mock MCP server request
     */
    static createMCPRequest(tool: string, args?: any): {
        method: string;
        params: {
            name: string;
            arguments: any;
        };
    };
    /**
     * Create mock MCP server response
     */
    static createMCPResponse(content: any, isError?: boolean): {
        content: {
            type: string;
            text: string;
        }[];
        isError: boolean;
    };
    /**
     * Validate MCP tool definition structure
     */
    static validateToolDefinition(tool: any): boolean;
}
/**
 * Mock implementations for external dependencies
 */
export declare class MockImplementations {
    /**
     * Create mock template manager
     */
    static createMockTemplateManager(templates?: PRPTemplate[]): {
        initialize: jest.Mock<any, any, any>;
        getAllTemplates: jest.Mock<any, any, any>;
        getTemplate: jest.Mock<any, any, any>;
        getTemplatesByCategory: jest.Mock<any, any, any>;
        searchTemplates: jest.Mock<any, any, any>;
        getCategories: jest.Mock<any, any, any>;
        refresh: jest.Mock<any, any, any>;
    };
    /**
     * Create mock PRP generator
     */
    static createMockPRPGenerator(): {
        generatePRP: jest.Mock<any, any, any>;
        validatePRP: jest.Mock<any, any, any>;
    };
    /**
     * Create mock MCP server
     */
    static createMockMCPServer(): {
        setRequestHandler: jest.Mock<any, any, any>;
        connect: jest.Mock<any, any, any>;
        close: jest.Mock<any, any, any>;
        _simulateRequest: (schema: any, request: any) => any;
    };
}
/**
 * Async test utilities
 */
export declare class AsyncTestUtils {
    /**
     * Wait for a specific condition with timeout
     */
    static waitFor(condition: () => boolean | Promise<boolean>, timeout?: number, interval?: number): Promise<void>;
    /**
     * Create a promise that resolves after a delay
     */
    static delay(ms: number): Promise<void>;
}
/**
 * Performance testing utilities
 */
export declare class PerformanceTestUtils {
    /**
     * Measure execution time of a function
     */
    static measureTime<T>(fn: () => Promise<T>): Promise<{
        result: T;
        duration: number;
    }>;
    /**
     * Run performance benchmark
     */
    static benchmark<T>(fn: () => Promise<T>, iterations?: number): Promise<{
        average: number;
        min: number;
        max: number;
        results: T[];
    }>;
}
/**
 * Export all utilities
 */
export { TestDataFactory as Factory, FileSystemTestUtils as FileSystem, MCPTestUtils as MCP, MockImplementations as Mocks, AsyncTestUtils as Async, PerformanceTestUtils as Performance };
//# sourceMappingURL=index.d.ts.map