import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ResourceContent, ResourceHandler, ResourceInfo } from './types.js';

/**
 * Manages MCP resources and their handlers
 */
export class ResourceManager {
  private handlers: Map<string, ResourceHandler> = new Map();
  private cache: Map<string, { content: ResourceContent; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Register a resource handler for a specific URI scheme
   */
  registerHandler(scheme: string, handler: ResourceHandler): void {
    this.handlers.set(scheme, handler);
  }

  /**
   * Parse a context URI and extract components
   */
  private parseContextURI(uri: string): {
    scheme: string;
    path: string;
    params: Record<string, string>;
  } {
    if (!uri.startsWith('context://')) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid context URI: ${uri}`
      );
    }

    const withoutProtocol = uri.slice(10); // Remove 'context://'
    const [schemeAndPath, ...queryParts] = withoutProtocol.split('?');
    const [scheme, ...pathParts] = schemeAndPath.split('/');
    const path = pathParts.join('/');

    // Parse query parameters
    const params: Record<string, string> = {};
    if (queryParts.length > 0) {
      const queryString = queryParts.join('?');
      const searchParams = new URLSearchParams(queryString);
      Array.from(searchParams.entries()).forEach(([key, value]) => {
        params[key] = value;
      });
    }

    return { scheme, path, params };
  }

  /**
   * Check if cached content is still valid
   */
  private isCacheValid(cacheEntry: { timestamp: number }): boolean {
    return Date.now() - cacheEntry.timestamp < this.CACHE_TTL;
  }

  /**
   * Get cached content if available and valid
   */
  private getCachedContent(uri: string): ResourceContent | null {
    const cached = this.cache.get(uri);
    if (cached && this.isCacheValid(cached)) {
      return cached.content;
    }
    return null;
  }

  /**
   * Cache content for a URI
   */
  private setCachedContent(uri: string, content: ResourceContent): void {
    this.cache.set(uri, {
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache for a specific URI or all cache if no URI provided
   */
  clearCache(uri?: string): void {
    if (uri) {
      this.cache.delete(uri);
    } else {
      this.cache.clear();
    }
  }

  /**
   * List all available resources from all handlers
   */
  async listResources(): Promise<ResourceInfo[]> {
    const allResources: ResourceInfo[] = [];

    for (const [scheme, handler] of Array.from(this.handlers.entries())) {
      try {
        const resources = await handler.listResources();
        allResources.push(...resources);
      } catch (error) {
        console.warn(`Failed to list resources for scheme ${scheme}:`, error);
      }
    }

    // Sort resources by URI for consistent ordering
    return allResources.sort((a, b) => a.uri.localeCompare(b.uri));
  }

  /**
   * Read a specific resource by URI
   */
  async readResource(uri: string): Promise<ResourceContent> {
    // Check cache first
    const cached = this.getCachedContent(uri);
    if (cached) {
      return cached;
    }

    try {
      const { scheme, path, params } = this.parseContextURI(uri);
      const handler = this.handlers.get(scheme);

      if (!handler) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `No handler registered for scheme: ${scheme}`
        );
      }

      const content = await handler.readResource(path, params);

      // Cache the content
      this.setCachedContent(uri, content);

      return content;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read resource ${uri}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search resources across all handlers
   */
  async searchResources(query: string): Promise<ResourceInfo[]> {
    const allResources = await this.listResources();

    const lowerQuery = query.toLowerCase();
    return allResources.filter(
      resource =>
        resource.name.toLowerCase().includes(lowerQuery) ||
        resource.description.toLowerCase().includes(lowerQuery) ||
        resource.uri.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get resources by mime type
   */
  async getResourcesByType(mimeType: string): Promise<ResourceInfo[]> {
    const allResources = await this.listResources();
    return allResources.filter(resource => resource.mimeType === mimeType);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: 0, // Would need to track this in implementation
      misses: 0, // Would need to track this in implementation
    };
  }

  /**
   * Health check for all handlers
   */
  async healthCheck(): Promise<{ [scheme: string]: boolean }> {
    const health: { [scheme: string]: boolean } = {};

    for (const [scheme, handler] of Array.from(this.handlers.entries())) {
      try {
        if (
          'healthCheck' in handler &&
          typeof handler.healthCheck === 'function'
        ) {
          health[scheme] = await handler.healthCheck();
        } else {
          // If no health check method, try to list resources as a basic health check
          await handler.listResources();
          health[scheme] = true;
        }
      } catch (error) {
        health[scheme] = false;
      }
    }

    return health;
  }
}
