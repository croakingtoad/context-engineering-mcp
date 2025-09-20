/**
 * Types for the MCP Resource system
 */

/**
 * Resource content that can be returned by handlers
 */
export interface ResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: Uint8Array;
}

/**
 * Information about a resource for listing purposes
 */
export interface ResourceInfo {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  lastModified?: Date;
  size?: number;
  tags?: string[];
}

/**
 * Base interface for resource handlers
 */
export interface ResourceHandler {
  /**
   * List all resources available from this handler
   */
  listResources(): Promise<ResourceInfo[]>;

  /**
   * Read a specific resource
   * @param path - The path portion of the URI (after the scheme)
   * @param params - Query parameters from the URI
   */
  readResource(path: string, params: Record<string, string>): Promise<ResourceContent>;

  /**
   * Optional health check method
   */
  healthCheck?(): Promise<boolean>;
}

/**
 * PRP document structure for storage and retrieval
 */
export interface PRPDocument {
  id: string;
  name: string;
  description: string;
  content: string;
  templateId: string;
  projectContext: {
    name: string;
    domain: string;
    stakeholders?: string[];
    constraints?: string[];
    objectives?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  version: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Initial request document structure
 */
export interface InitialRequestDocument {
  id: string;
  name: string;
  projectName: string;
  projectType: string;
  framework?: string;
  domain: string;
  content: string;
  templateId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'review' | 'approved' | 'archived';
  metadata?: Record<string, any>;
}

/**
 * Codebase pattern for language-specific analysis
 */
export interface CodebasePatternInfo extends ResourceInfo {
  language: string;
  framework?: string;
  patternCount: number;
  lastAnalyzed?: Date;
}

/**
 * Template with enhanced metadata for the base resource
 */
export interface EnhancedTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  version: string;
  author?: string;
  created?: Date;
  updated?: Date;
  tags?: string[];
  usage: {
    downloadCount: number;
    lastUsed?: Date;
    averageRating?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Global rule structure for project governance
 */
export interface GlobalRule {
  id: string;
  name: string;
  description: string;
  category: 'coding' | 'architecture' | 'documentation' | 'testing' | 'deployment';
  rule: string;
  severity: 'error' | 'warning' | 'info';
  applicableLanguages?: string[];
  applicableFrameworks?: string[];
  examples?: Array<{
    good: string;
    bad: string;
    explanation: string;
  }>;
  references?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cache entry for resource content
 */
export interface CacheEntry<T = any> {
  content: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Resource search criteria
 */
export interface ResourceSearchCriteria {
  query?: string;
  mimeType?: string;
  tags?: string[];
  lastModified?: {
    after?: Date;
    before?: Date;
  };
  size?: {
    min?: number;
    max?: number;
  };
}

/**
 * Resource access statistics
 */
export interface ResourceStats {
  uri: string;
  accessCount: number;
  lastAccessed: Date;
  averageAccessTime: number;
  errorCount: number;
  lastError?: Date;
}