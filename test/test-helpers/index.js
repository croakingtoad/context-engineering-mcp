"use strict";
/**
 * Test Helper Utilities
 * Provides reusable testing utilities, mocks, and factory functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Performance = exports.Async = exports.Mocks = exports.MCP = exports.FileSystem = exports.Factory = exports.PerformanceTestUtils = exports.AsyncTestUtils = exports.MockImplementations = exports.MCPTestUtils = exports.FileSystemTestUtils = exports.TestDataFactory = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * Test data factories for consistent test data generation
 */
class TestDataFactory {
    /**
     * Create a mock PRP template
     */
    static createPRPTemplate(overrides = {}) {
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
    static createPRPSection(overrides = {}) {
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
    static createProjectContext(overrides = {}) {
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
    static createPRPGenerationRequest(overrides = {}) {
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
    static createMultipleTemplates(count = 3) {
        return Array.from({ length: count }, (_, index) => this.createPRPTemplate({
            id: `test-template-${index + 1}`,
            name: `Test Template ${index + 1}`,
            category: index % 2 === 0 ? 'web-development' : 'mobile-development'
        }));
    }
    /**
     * Create a mock project analysis
     */
    static createProjectAnalysis(overrides = {}) {
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
    static createQuestion(overrides = {}) {
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
exports.TestDataFactory = TestDataFactory;
exports.Factory = TestDataFactory;
/**
 * File system test utilities
 */
class FileSystemTestUtils {
    /**
     * Create temporary test directory
     */
    static async createTempDir(name) {
        const tempDir = path.join(__dirname, '../../temp-test-files', name);
        await fs.mkdir(tempDir, { recursive: true });
        return tempDir;
    }
    /**
     * Create mock template files for testing
     */
    static async createMockTemplateFiles(dir, templates) {
        await fs.mkdir(dir, { recursive: true });
        for (const template of templates) {
            const filePath = path.join(dir, `${template.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(template, null, 2));
        }
    }
    /**
     * Clean up temporary files
     */
    static async cleanup(dir) {
        try {
            await fs.rm(dir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
    }
}
exports.FileSystemTestUtils = FileSystemTestUtils;
exports.FileSystem = FileSystemTestUtils;
/**
 * MCP Protocol test utilities
 */
class MCPTestUtils {
    /**
     * Create mock MCP server request
     */
    static createMCPRequest(tool, args = {}) {
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
    static createMCPResponse(content, isError = false) {
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
    static validateToolDefinition(tool) {
        return (tool &&
            typeof tool.name === 'string' &&
            typeof tool.description === 'string' &&
            tool.inputSchema &&
            typeof tool.inputSchema === 'object');
    }
}
exports.MCPTestUtils = MCPTestUtils;
exports.MCP = MCPTestUtils;
/**
 * Mock implementations for external dependencies
 */
class MockImplementations {
    /**
     * Create mock template manager
     */
    static createMockTemplateManager(templates = []) {
        return {
            initialize: jest.fn().mockResolvedValue(undefined),
            getAllTemplates: jest.fn().mockReturnValue(templates),
            getTemplate: jest.fn().mockImplementation((id) => templates.find(t => t.id === id) || null),
            getTemplatesByCategory: jest.fn().mockImplementation((category) => templates.filter(t => t.category === category)),
            searchTemplates: jest.fn().mockImplementation((query) => templates.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) ||
                t.description.toLowerCase().includes(query.toLowerCase()))),
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
            _simulateRequest: (schema, request) => {
                const handler = handlers.get(schema);
                return handler ? handler(request) : Promise.reject(new Error('No handler'));
            }
        };
    }
}
exports.MockImplementations = MockImplementations;
exports.Mocks = MockImplementations;
/**
 * Async test utilities
 */
class AsyncTestUtils {
    /**
     * Wait for a specific condition with timeout
     */
    static async waitFor(condition, timeout = 5000, interval = 100) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const result = await condition();
            if (result)
                return;
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        throw new Error(`Condition not met within ${timeout}ms`);
    }
    /**
     * Create a promise that resolves after a delay
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.AsyncTestUtils = AsyncTestUtils;
exports.Async = AsyncTestUtils;
/**
 * Performance testing utilities
 */
class PerformanceTestUtils {
    /**
     * Measure execution time of a function
     */
    static async measureTime(fn) {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;
        return { result, duration };
    }
    /**
     * Run performance benchmark
     */
    static async benchmark(fn, iterations = 100) {
        const times = [];
        const results = [];
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
exports.PerformanceTestUtils = PerformanceTestUtils;
exports.Performance = PerformanceTestUtils;
//# sourceMappingURL=index.js.map