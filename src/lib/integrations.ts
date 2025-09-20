import { PRPTemplate, PRPSection } from '../types/index.js';
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
  project_id?: string;
  assigned_to?: string;
  created: Date;
  updated: Date;
  metadata: Record<string, any>;
}

export interface ArchonProject {
  id: string;
  title: string;
  description: string;
  created: Date;
  github_repo?: string;
}

export interface IntegrationConfig {
  archonEnabled: boolean;
  archonHealthCheckInterval: number;
  maxRetries: number;
  retryDelay: number;
  fallbackToLocal: boolean;
  syncInterval: number;
}

export interface HealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  latency?: number;
  error?: string;
  capabilities: string[];
}

// Mock Archon MCP client interface
interface ArchonMCPClient {
  isAvailable(): Promise<boolean>;
  createDocument(doc: Partial<ArchonDocument>): Promise<ArchonDocument>;
  updateDocument(id: string, updates: Partial<ArchonDocument>): Promise<ArchonDocument>;
  getDocument(id: string): Promise<ArchonDocument | null>;
  deleteDocument(id: string): Promise<void>;
  createTask(task: Partial<ArchonTask>): Promise<ArchonTask>;
  updateTask(id: string, updates: Partial<ArchonTask>): Promise<ArchonTask>;
  getTask(id: string): Promise<ArchonTask | null>;
  listTasks(projectId?: string): Promise<ArchonTask[]>;
  createProject(project: Partial<ArchonProject>): Promise<ArchonProject>;
  getProject(id: string): Promise<ArchonProject | null>;
  listProjects(): Promise<ArchonProject[]>;
}

/**
 * Integration system for optional Archon MCP server
 * Features: Runtime detection, health monitoring, graceful fallback, task creation
 */
export class IntegrationsManager {
  private config: IntegrationConfig;
  private storageSystem: StorageSystem;
  private archonClient: ArchonMCPClient | null = null;
  private healthStatus: HealthStatus;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private retryAttempts: Map<string, number> = new Map();

  constructor(
    storageSystem: StorageSystem,
    config: Partial<IntegrationConfig> = {}
  ) {
    this.storageSystem = storageSystem;
    this.config = {
      archonEnabled: config.archonEnabled !== false,
      archonHealthCheckInterval: config.archonHealthCheckInterval || 30000, // 30 seconds
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      fallbackToLocal: config.fallbackToLocal !== false,
      syncInterval: config.syncInterval || 300000, // 5 minutes
      ...config,
    };

    this.healthStatus = {
      isHealthy: false,
      lastCheck: new Date(),
      capabilities: [],
    };
  }

  /**
   * Initialize integrations and detect available services
   */
  async initialize(): Promise<void> {
    console.log('[Integrations] Initializing integrations manager...');

    if (this.config.archonEnabled) {
      await this.detectArchonMCP();
      this.startHealthMonitoring();
    }

    console.log('[Integrations] Integrations initialized');
    console.log(`[Integrations] Archon available: ${this.isArchonAvailable()}`);
  }

  /**
   * Store a PRP with optional Archon integration
   */
  async storePRP(
    filename: string,
    content: string,
    metadata: Partial<FileMetadata> = {},
    options: {
      createArchonDocument?: boolean;
      createTasks?: boolean;
      projectId?: string;
    } = {}
  ): Promise<{
    fileMetadata: FileMetadata;
    archonDocument?: ArchonDocument;
    tasks?: ArchonTask[];
  }> {
    // Always store locally first
    const fileMetadata = await this.storageSystem.storePRP(filename, content, metadata);

    const result: any = { fileMetadata };

    // Store in Archon if available and requested
    if (this.isArchonAvailable() && options.createArchonDocument) {
      try {
        const archonDocument = await this.storeInArchon(fileMetadata, content, options.projectId);
        result.archonDocument = archonDocument;

        // Create tasks from PRP sections if requested
        if (options.createTasks && archonDocument) {
          const tasks = await this.createTasksFromPRP(content, archonDocument.id, options.projectId);
          result.tasks = tasks;
        }
      } catch (error) {
        console.warn('[Integrations] Failed to store in Archon:', error);
        if (!this.config.fallbackToLocal) {
          throw error;
        }
      }
    }

    return result;
  }

  /**
   * Update a PRP with Archon synchronization
   */
  async updatePRP(
    id: string,
    content: string,
    changes: string[] = [],
    archonDocumentId?: string
  ): Promise<{
    fileMetadata: FileMetadata;
    archonDocument?: ArchonDocument;
  }> {
    // Update locally first
    const fileMetadata = await this.storageSystem.updatePRP(id, content, changes);

    const result: any = { fileMetadata };

    // Update in Archon if available and document exists
    if (this.isArchonAvailable() && archonDocumentId) {
      try {
        const archonDocument = await this.updateInArchon(archonDocumentId, content);
        result.archonDocument = archonDocument;
      } catch (error) {
        console.warn('[Integrations] Failed to update in Archon:', error);
        if (!this.config.fallbackToLocal) {
          throw error;
        }
      }
    }

    return result;
  }

  /**
   * Create Archon tasks from PRP sections
   */
  async createTasksFromPRP(
    prpContent: string,
    documentId?: string,
    projectId?: string
  ): Promise<ArchonTask[]> {
    if (!this.isArchonAvailable()) {
      throw new Error('Archon MCP server not available');
    }

    const sections = this.extractPRPSections(prpContent);
    const tasks: ArchonTask[] = [];

    for (const section of sections) {
      // Skip metadata and overview sections
      if (this.isTaskableSection(section)) {
        try {
          const task = await this.archonClient!.createTask({
            title: `Implement: ${section.title}`,
            description: this.generateTaskDescription(section),
            status: 'todo',
            project_id: projectId,
            metadata: {
              source: 'prp',
              documentId,
              sectionTitle: section.title,
              requirements: section.requirements || [],
            },
          });

          tasks.push(task);
        } catch (error) {
          console.warn(`[Integrations] Failed to create task for section ${section.title}:`, error);
        }
      }
    }

    return tasks;
  }

  /**
   * Get integration health status
   */
  getHealthStatus(): HealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Check if Archon is available
   */
  isArchonAvailable(): boolean {
    return this.archonClient !== null && this.healthStatus.isHealthy;
  }

  /**
   * Force a health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      if (this.archonClient) {
        const isAvailable = await this.retryOperation(
          'health-check',
          () => this.archonClient!.isAvailable()
        );

        if (isAvailable) {
          this.healthStatus = {
            isHealthy: true,
            lastCheck: new Date(),
            latency: Date.now() - startTime,
            capabilities: ['documents', 'tasks', 'projects'],
          };
        } else {
          this.healthStatus = {
            isHealthy: false,
            lastCheck: new Date(),
            error: 'Archon MCP server not responding',
            capabilities: [],
          };
        }
      } else {
        this.healthStatus = {
          isHealthy: false,
          lastCheck: new Date(),
          error: 'Archon MCP client not initialized',
          capabilities: [],
        };
      }
    } catch (error) {
      this.healthStatus = {
        isHealthy: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        capabilities: [],
      };
    }

    return this.healthStatus;
  }

  /**
   * Manually reconnect to Archon
   */
  async reconnect(): Promise<boolean> {
    console.log('[Integrations] Attempting to reconnect to Archon...');

    try {
      await this.detectArchonMCP();
      await this.performHealthCheck();

      if (this.healthStatus.isHealthy) {
        console.log('[Integrations] Successfully reconnected to Archon');
        this.retryAttempts.clear();
        return true;
      }
    } catch (error) {
      console.error('[Integrations] Failed to reconnect to Archon:', error);
    }

    return false;
  }

  /**
   * Shutdown integrations
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    console.log('[Integrations] Integrations manager shutdown complete');
  }

  // Private implementation methods

  private async detectArchonMCP(): Promise<void> {
    try {
      // In a real implementation, this would connect to the actual Archon MCP server
      // For now, we'll simulate the detection
      this.archonClient = this.createMockArchonClient();

      const isAvailable = await this.archonClient.isAvailable();

      if (isAvailable) {
        console.log('[Integrations] Archon MCP server detected and connected');
        await this.performHealthCheck();
      } else {
        console.log('[Integrations] Archon MCP server not available');
        this.archonClient = null;
      }
    } catch (error) {
      console.log('[Integrations] Archon MCP server not found:', error);
      this.archonClient = null;
    }
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();

      // Attempt reconnection if unhealthy
      if (!this.healthStatus.isHealthy && this.config.archonEnabled) {
        await this.reconnect();
      }
    }, this.config.archonHealthCheckInterval);
  }

  private async storeInArchon(
    fileMetadata: FileMetadata,
    content: string,
    projectId?: string
  ): Promise<ArchonDocument> {
    if (!this.archonClient) {
      throw new Error('Archon client not available');
    }

    return await this.retryOperation('store-document', () =>
      this.archonClient!.createDocument({
        title: fileMetadata.name,
        content,
        tags: fileMetadata.tags,
        project_id: projectId,
      })
    );
  }

  private async updateInArchon(
    documentId: string,
    content: string
  ): Promise<ArchonDocument> {
    if (!this.archonClient) {
      throw new Error('Archon client not available');
    }

    return await this.retryOperation('update-document', () =>
      this.archonClient!.updateDocument(documentId, {
        content,
        modified: new Date(),
      })
    );
  }

  private extractPRPSections(prpContent: string): PRPSection[] {
    const sections: PRPSection[] = [];
    const lines = prpContent.split('\n');

    let currentSection: PRPSection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Detect section headers (## Title)
      if (trimmedLine.startsWith('## ')) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }

        // Start new section
        const title = trimmedLine.replace('## ', '');
        currentSection = {
          title,
          content: '',
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save the last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }

    return sections;
  }

  private isTaskableSection(section: PRPSection): boolean {
    const nonTaskableTitles = [
      'overview',
      'introduction',
      'background',
      'context',
      'summary',
      'conclusion',
      'metadata',
    ];

    const lowerTitle = section.title.toLowerCase();
    return !nonTaskableTitles.some(title => lowerTitle.includes(title));
  }

  private generateTaskDescription(section: PRPSection): string {
    let description = section.content;

    if (section.requirements && section.requirements.length > 0) {
      description += '\n\n### Requirements:\n';
      description += section.requirements.map(req => `- ${req}`).join('\n');
    }

    if (section.examples && section.examples.length > 0) {
      description += '\n\n### Examples:\n';
      description += section.examples.map(example => `- ${example}`).join('\n');
    }

    return description;
  }

  private async retryOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const attempts = this.retryAttempts.get(operationName) || 0;

    try {
      const result = await operation();
      this.retryAttempts.delete(operationName);
      return result;
    } catch (error) {
      if (attempts < this.config.maxRetries) {
        this.retryAttempts.set(operationName, attempts + 1);

        console.warn(
          `[Integrations] Operation ${operationName} failed (attempt ${attempts + 1}/${this.config.maxRetries}), retrying...`
        );

        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return await this.retryOperation(operationName, operation);
      }

      this.retryAttempts.delete(operationName);
      throw error;
    }
  }

  // Mock Archon client for testing/development
  private createMockArchonClient(): ArchonMCPClient {
    const mockStorage = {
      documents: new Map<string, ArchonDocument>(),
      tasks: new Map<string, ArchonTask>(),
      projects: new Map<string, ArchonProject>(),
    };

    const generateId = (): string => {
      return Math.random().toString(36).substring(2, 15);
    };

    return {
      async isAvailable(): Promise<boolean> {
        // Simulate availability check with some randomness for testing
        return Math.random() > 0.1; // 90% success rate
      },

      async createDocument(doc: Partial<ArchonDocument>): Promise<ArchonDocument> {
        const id = generateId();
        const document: ArchonDocument = {
          id,
          title: doc.title || 'Untitled',
          content: doc.content || '',
          tags: doc.tags || [],
          created: new Date(),
          modified: new Date(),
          project_id: doc.project_id,
        };

        mockStorage.documents.set(id, document);
        return document;
      },

      async updateDocument(id: string, updates: Partial<ArchonDocument>): Promise<ArchonDocument> {
        const existing = mockStorage.documents.get(id);
        if (!existing) {
          throw new Error(`Document ${id} not found`);
        }

        const updated = {
          ...existing,
          ...updates,
          modified: new Date(),
        };

        mockStorage.documents.set(id, updated);
        return updated;
      },

      async getDocument(id: string): Promise<ArchonDocument | null> {
        return mockStorage.documents.get(id) || null;
      },

      async deleteDocument(id: string): Promise<void> {
        mockStorage.documents.delete(id);
      },

      async createTask(task: Partial<ArchonTask>): Promise<ArchonTask> {
        const id = generateId();
        const newTask: ArchonTask = {
          id,
          title: task.title || 'Untitled Task',
          description: task.description || '',
          status: task.status || 'todo',
          project_id: task.project_id,
          assigned_to: task.assigned_to,
          created: new Date(),
          updated: new Date(),
          metadata: task.metadata || {},
        };

        mockStorage.tasks.set(id, newTask);
        return newTask;
      },

      async updateTask(id: string, updates: Partial<ArchonTask>): Promise<ArchonTask> {
        const existing = mockStorage.tasks.get(id);
        if (!existing) {
          throw new Error(`Task ${id} not found`);
        }

        const updated = {
          ...existing,
          ...updates,
          updated: new Date(),
        };

        mockStorage.tasks.set(id, updated);
        return updated;
      },

      async getTask(id: string): Promise<ArchonTask | null> {
        return mockStorage.tasks.get(id) || null;
      },

      async listTasks(projectId?: string): Promise<ArchonTask[]> {
        const tasks = Array.from(mockStorage.tasks.values());
        if (projectId) {
          return tasks.filter(task => task.project_id === projectId);
        }
        return tasks;
      },

      async createProject(project: Partial<ArchonProject>): Promise<ArchonProject> {
        const id = generateId();
        const newProject: ArchonProject = {
          id,
          title: project.title || 'Untitled Project',
          description: project.description || '',
          created: new Date(),
          github_repo: project.github_repo,
        };

        mockStorage.projects.set(id, newProject);
        return newProject;
      },

      async getProject(id: string): Promise<ArchonProject | null> {
        return mockStorage.projects.get(id) || null;
      },

      async listProjects(): Promise<ArchonProject[]> {
        return Array.from(mockStorage.projects.values());
      },
    };
  }
}