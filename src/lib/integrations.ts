import { FileMetadata } from './storage.js';
import { StorageSystem } from './storage.js';

// Archon integration types
export interface ArchonDocument {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created: Date;
  modified: Date;
  project_id?: string;
}

export interface ArchonTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done' | 'blocked';
  assignee?: string;
  created: Date;
  updated: Date;
  project_id?: string;
}

export interface ArchonProject {
  id: string;
  name: string;
  description?: string;
  created: Date;
  updated: Date;
}

// Integration configuration
export interface IntegrationsConfig {
  archonEnabled: boolean;
  archonHealthCheckInterval: number;
  fallbackToLocal: boolean;
  maxRetries: number;
  retryDelay: number;
}

// Integration status
export interface IntegrationsStatus {
  archonConnected: boolean;
  lastHealthCheck: Date | null;
  errorCount: number;
  lastError: string | null;
}

/**
 * Manages integrations with external systems like Archon MCP
 * Provides graceful fallback to local storage when integrations unavailable
 */
export class IntegrationsManager {
  private storageSystem: StorageSystem;
  private config: IntegrationsConfig;
  private status: IntegrationsStatus;
  private archonClient: any = null;
  private healthCheckTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempts: Map<string, number> = new Map();

  constructor(
    storageSystem: StorageSystem,
    config: Partial<IntegrationsConfig> = {}
  ) {
    this.storageSystem = storageSystem;
    this.config = {
      archonEnabled: config.archonEnabled ?? false,
      archonHealthCheckInterval: config.archonHealthCheckInterval ?? 30000,
      fallbackToLocal: config.fallbackToLocal ?? true,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 5000,
    };

    this.status = {
      archonConnected: false,
      lastHealthCheck: null,
      errorCount: 0,
      lastError: null,
    };
  }

  async initialize(): Promise<void> {
    // Initializing integrations manager

    if (this.config.archonEnabled) {
      await this.detectArchonMCP();
      this.startHealthCheckTimer();
    }

    // Integrations initialized
    // Archon availability checked
  }

  /**
   * Check if Archon integration is available
   */
  isArchonAvailable(): boolean {
    return this.status.archonConnected && this.archonClient !== null;
  }

  /**
   * Store PRP in Archon if available, fallback to local storage
   */
  async storePRP(
    prp: any,
    metadata: FileMetadata
  ): Promise<{ archonDocument?: ArchonDocument }> {
    if (this.isArchonAvailable()) {
      try {
        const document: ArchonDocument = {
          id: metadata.id,
          title: metadata.name,
          content: JSON.stringify(prp),
          tags: metadata.tags,
          created: metadata.created,
          modified: metadata.modified,
        };

        const result = await this.archonClient.createDocument(document);
        return { archonDocument: result };
      } catch (error) {
        // Failed to store in Archon
        if (this.config.fallbackToLocal) {
          // Fall back to local storage (already handled by StorageSystem)
        }
      }
    }
    return {};
  }

  /**
   * Update PRP in Archon if available
   */
  async updatePRP(
    prpId: string,
    prp: any,
    metadata: FileMetadata
  ): Promise<{ archonDocument?: ArchonDocument }> {
    if (this.isArchonAvailable()) {
      try {
        const updates = {
          title: metadata.name,
          content: JSON.stringify(prp),
          tags: metadata.tags,
          modified: metadata.modified,
        };

        const result = await this.archonClient.updateDocument(prpId, updates);
        return { archonDocument: result };
      } catch (error) {
        // Failed to update in Archon
        // Fall back to local storage only
      }
    }
    return {};
  }

  /**
   * Create Archon tasks from PRP sections
   */
  async createTasksFromPRP(
    prp: any,
    projectId?: string
  ): Promise<{ tasks?: ArchonTask[] }> {
    if (!this.isArchonAvailable() || !prp.sections) {
      return {};
    }

    const tasks: ArchonTask[] = [];
    try {
      for (const section of prp.sections) {
        if (section.requirements && section.requirements.length > 0) {
          const task: Partial<ArchonTask> = {
            title: `Implement ${section.title}`,
            description: section.content.substring(0, 500) + '...',
            status: 'todo',
            project_id: projectId,
          };

          const created = await this.archonClient.createTask(task);
          tasks.push(created);
        }
      }
      return { tasks };
    } catch (error) {
      // Failed to create task for section
      return {};
    }
  }

  /**
   * Shutdown integrations
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Integrations manager shutdown complete
  }

  /**
   * Get integration status
   */
  getStatus(): IntegrationsStatus {
    return { ...this.status };
  }

  /**
   * Get health status for tools
   */
  getHealthStatus(): {
    isHealthy: boolean;
    lastCheck: Date | null;
    latency: number;
    error: string | null;
    capabilities: string[];
  } {
    return {
      isHealthy: this.status.archonConnected,
      lastCheck: this.status.lastHealthCheck,
      latency: 0,
      error: this.status.lastError,
      capabilities: this.status.archonConnected
        ? ['documents', 'tasks', 'projects']
        : [],
    };
  }

  /**
   * Reconnect to Archon
   */
  async reconnect(): Promise<void> {
    await this.detectArchonMCP();
  }

  // Private methods

  private async detectArchonMCP(): Promise<void> {
    try {
      // In a real implementation, this would connect to the actual Archon MCP server
      // For now, we'll disable Archon integration
      this.archonClient = null;
      this.status.archonConnected = false;
    } catch (error) {
      this.status.archonConnected = false;
    }
  }

  private startHealthCheckTimer(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.archonHealthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.isArchonAvailable()) {
      return;
    }

    try {
      // In a real implementation, this would ping the Archon server
      this.status.lastHealthCheck = new Date();
      this.status.errorCount = 0;
      this.status.lastError = null;
    } catch (error) {
      this.status.errorCount++;
      this.status.lastError =
        error instanceof Error ? error.message : 'Unknown error';

      if (this.status.errorCount >= 3) {
        this.status.archonConnected = false;
        this.archonClient = null;
      }
    }
  }
}
