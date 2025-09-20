/**
 * Jest Test Setup Configuration
 * Sets up global test environment, mocks, and utilities
 */

import 'jest';
import * as fs from 'fs/promises';
import * as path from 'path';

// Global test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.TEMPLATES_DIR = path.join(__dirname, '../test-fixtures/templates');
process.env.EXTERNAL_TEMPLATES_DIR = path.join(__dirname, '../test-fixtures/external');

// Suppress console.error during tests unless explicitly enabled
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  if (!process.env.VERBOSE_TESTS) {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clean up test fixtures after each test
afterEach(async () => {
  // Clean up any temporary files created during tests
  try {
    const tempDir = path.join(__dirname, '../temp-test-files');
    const exists = await fs.access(tempDir).then(() => true).catch(() => false);
    if (exists) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidZodSchema(): R;
      toHaveValidStructure(): R;
      toMatchMCPProtocol(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidZodSchema(received) {
    try {
      // Basic validation that this looks like a Zod schema
      const hasParseMethod = typeof received?.parse === 'function';
      const hasSafeParse = typeof received?.safeParse === 'function';

      if (hasParseMethod && hasSafeParse) {
        return {
          message: () => `Expected ${received} not to be a valid Zod schema`,
          pass: true,
        };
      }

      return {
        message: () => `Expected ${received} to be a valid Zod schema with parse and safeParse methods`,
        pass: false,
      };
    } catch (error) {
      return {
        message: () => `Expected ${received} to be a valid Zod schema, but got error: ${error}`,
        pass: false,
      };
    }
  },

  toHaveValidStructure(received) {
    const requiredProperties = ['name', 'description'];
    const hasRequiredProperties = requiredProperties.every(prop =>
      received && typeof received[prop] === 'string' && received[prop].length > 0
    );

    if (hasRequiredProperties) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to have valid structure`,
        pass: true,
      };
    }

    return {
      message: () => `Expected ${JSON.stringify(received)} to have valid structure with properties: ${requiredProperties.join(', ')}`,
      pass: false,
    };
  },

  toMatchMCPProtocol(received) {
    // Handle both direct tool array and tools wrapper
    const toolsArray = Array.isArray(received) ? received : received?.tools;

    if (!Array.isArray(toolsArray)) {
      return {
        message: () => `Expected ${JSON.stringify(received)} to have tools array`,
        pass: false,
      };
    }

    const toolsValid = toolsArray.every((tool: any) =>
      tool && typeof tool.name === 'string' && typeof tool.description === 'string' && tool.inputSchema
    );

    if (toolsValid) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to match MCP protocol`,
        pass: true,
      };
    }

    return {
      message: () => `Expected ${JSON.stringify(received)} to match MCP protocol with valid tools array`,
      pass: false,
    };
  }
});