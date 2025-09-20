import * as fs from 'fs/promises';
import { Stats } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { PRPTemplate, PRPSection } from '../types/index.js';

// Storage configuration
export interface StorageConfig {
  baseDir: string;
  prpsDir: string;
  metadataDir: string;
  versionsDir: string;
  enableLocking: boolean;
  maxConcurrentOperations: number;
}

// File metadata for indexing and search
export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size: number;
  created: Date;
  modified: Date;
  hash: string;
  version: number;
  tags: string[];
  category: string;
  author?: string;
}

// Search and filter options
export interface SearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  sortBy?: 'name' | 'created' | 'modified' | 'size';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// File lock management
interface FileLock {
  path: string;
  lockId: string;
  timestamp: Date;
  operation: string;
}

/**
 * Thread-safe storage system for PRPs and INITIAL.md files
 * Features: File locking, atomic operations, JSON metadata indexing, performance optimization
 */
export class StorageSystem {
  private config: StorageConfig;
  private metadataCache: Map<string, FileMetadata> = new Map();
  private activeLocks: Map<string, FileLock> = new Map();
  private operationQueue: Map<string, Promise<any>> = new Map();
  private initialized = false;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      baseDir: config.baseDir || './data',
      prpsDir: config.prpsDir || 'prps',
      metadataDir: config.metadataDir || '.metadata',
      versionsDir: config.versionsDir || '.versions',
      enableLocking: config.enableLocking !== false,
      maxConcurrentOperations: config.maxConcurrentOperations || 10,
      ...config,
    };
  }

  /**
   * Initialize storage system - create directories and load metadata
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create required directories
      await this.ensureDirectories();

      // Load metadata cache
      await this.loadMetadataCache();

      this.initialized = true;
      console.log('[Storage] Storage system initialized');
    } catch (error) {
      console.error('[Storage] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Store a PRP file with metadata and versioning
   */
  async storePRP(
    filename: string,
    content: string,
    metadata: Partial<FileMetadata> = {}
  ): Promise<FileMetadata> {
    await this.ensureInitialized();

    const filePath = path.join(this.config.baseDir, this.config.prpsDir, filename);
    const lockId = await this.acquireLock(filePath, 'write');

    try {
      // Perform atomic write operation
      const result = await this.atomicWrite(filePath, content, metadata);

      // Update metadata cache
      this.metadataCache.set(result.id, result);

      // Save metadata index
      await this.saveMetadataIndex();

      return result;
    } finally {
      await this.releaseLock(filePath, lockId);
    }
  }

  /**
   * Store INITIAL.md file with metadata
   */
  async storeInitial(
    projectPath: string,
    content: string,
    metadata: Partial<FileMetadata> = {}
  ): Promise<FileMetadata> {
    await this.ensureInitialized();

    const filePath = path.join(projectPath, 'INITIAL.md');
    const lockId = await this.acquireLock(filePath, 'write');

    try {
      const result = await this.atomicWrite(filePath, content, {
        ...metadata,
        category: 'initial',
        name: 'INITIAL.md',
      });

      this.metadataCache.set(result.id, result);
      await this.saveMetadataIndex();

      return result;
    } finally {
      await this.releaseLock(filePath, lockId);
    }
  }

  /**
   * Read a file with concurrent access protection
   */
  async readFile(filePath: string): Promise<{ content: string; metadata: FileMetadata }> {
    await this.ensureInitialized();

    const lockId = await this.acquireLock(filePath, 'read');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);

      // Find metadata by path
      let metadata = Array.from(this.metadataCache.values())
        .find(m => m.path === filePath);

      if (!metadata) {
        // Generate metadata if not found
        metadata = await this.generateMetadata(filePath, content, stats);
        this.metadataCache.set(metadata.id, metadata);
      }

      return { content, metadata };
    } finally {
      await this.releaseLock(filePath, lockId);
    }
  }

  /**
   * List PRPs with search and filter capabilities
   */
  async listPRPs(options: SearchOptions = {}): Promise<{
    files: FileMetadata[];
    total: number;
    hasMore: boolean;
  }> {
    await this.ensureInitialized();

    let files = Array.from(this.metadataCache.values())
      .filter(f => f.category !== 'initial'); // Exclude INITIAL.md files

    // Apply search query
    if (options.query) {
      const query = options.query.toLowerCase();
      files = files.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (options.category) {
      files = files.filter(f => f.category === options.category);
    }

    // Apply tag filter
    if (options.tags?.length) {
      files = files.filter(f =>
        options.tags!.some(tag => f.tags.includes(tag))
      );
    }

    // Apply date range filter
    if (options.dateRange) {
      files = files.filter(f =>
        f.modified >= options.dateRange!.from &&
        f.modified <= options.dateRange!.to
      );
    }

    // Sort results
    const sortBy = options.sortBy || 'modified';
    const sortOrder = options.sortOrder || 'desc';

    files.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (aVal instanceof Date) {
        aVal = aVal.getTime();
        bVal = (bVal as Date).getTime();
      }

      const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'desc' ? -result : result;
    });

    // Apply pagination
    const total = files.length;
    const offset = options.offset || 0;
    const limit = options.limit || total;

    const paginatedFiles = files.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      files: paginatedFiles,
      total,
      hasMore,
    };
  }

  /**
   * Update an existing PRP
   */
  async updatePRP(
    id: string,
    content: string,
    changes: string[] = []
  ): Promise<FileMetadata> {
    await this.ensureInitialized();

    const existing = this.metadataCache.get(id);
    if (!existing) {
      throw new Error(`PRP with ID ${id} not found`);
    }

    const lockId = await this.acquireLock(existing.path, 'write');

    try {
      // Create version backup before updating
      await this.createVersionBackup(existing);

      // Update the file
      const result = await this.atomicWrite(existing.path, content, {
        ...existing,
        version: existing.version + 1,
        modified: new Date(),
      });

      this.metadataCache.set(id, result);
      await this.saveMetadataIndex();

      return result;
    } finally {
      await this.releaseLock(existing.path, lockId);
    }
  }

  /**
   * Delete a PRP
   */
  async deletePRP(id: string): Promise<void> {
    await this.ensureInitialized();

    const existing = this.metadataCache.get(id);
    if (!existing) {
      throw new Error(`PRP with ID ${id} not found`);
    }

    const lockId = await this.acquireLock(existing.path, 'write');

    try {
      // Create final backup
      await this.createVersionBackup(existing);

      // Delete file
      await fs.unlink(existing.path);

      // Remove from cache
      this.metadataCache.delete(id);
      await this.saveMetadataIndex();
    } finally {
      await this.releaseLock(existing.path, lockId);
    }
  }

  /**
   * Get file statistics
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    categories: Record<string, number>;
    lastModified: Date | null;
  }> {
    await this.ensureInitialized();

    const files = Array.from(this.metadataCache.values());
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const categories: Record<string, number> = {};
    let lastModified: Date | null = null;

    for (const file of files) {
      categories[file.category] = (categories[file.category] || 0) + 1;
      if (!lastModified || file.modified > lastModified) {
        lastModified = file.modified;
      }
    }

    return {
      totalFiles,
      totalSize,
      categories,
      lastModified,
    };
  }

  // Private implementation methods

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.config.baseDir,
      path.join(this.config.baseDir, this.config.prpsDir),
      path.join(this.config.baseDir, this.config.metadataDir),
      path.join(this.config.baseDir, this.config.versionsDir),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async loadMetadataCache(): Promise<void> {
    const metadataPath = path.join(
      this.config.baseDir,
      this.config.metadataDir,
      'index.json'
    );

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      const data = JSON.parse(content);

      this.metadataCache.clear();
      for (const [id, metadata] of Object.entries(data)) {
        const meta = metadata as any;
        const parsed: FileMetadata = ({
          id: meta.id,
          name: meta.name,
          path: meta.path,
          size: meta.size,
          created: new Date(meta.created),
          modified: new Date(meta.modified),
          hash: meta.hash,
          version: meta.version,
          tags: meta.tags || [],
          category: meta.category,
          author: meta.author,
        }) as FileMetadata;

        this.metadataCache.set(id, parsed);
      }

      console.log(`[Storage] Loaded ${this.metadataCache.size} metadata entries`);
    } catch (error) {
      console.log('[Storage] No existing metadata index, starting fresh');
    }
  }

  private async saveMetadataIndex(): Promise<void> {
    const metadataPath = path.join(
      this.config.baseDir,
      this.config.metadataDir,
      'index.json'
    );

    const data = Object.fromEntries(this.metadataCache.entries());
    await fs.writeFile(metadataPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private async atomicWrite(
    filePath: string,
    content: string,
    metadata: Partial<FileMetadata> = {}
  ): Promise<FileMetadata> {
    // Create temporary file
    const tempPath = `${filePath}.tmp.${Date.now()}`;

    try {
      await fs.writeFile(tempPath, content, 'utf-8');

      // Atomic move to final location
      await fs.rename(tempPath, filePath);

      // Get file stats
      const stats = await fs.stat(filePath);

      // Generate or update metadata
      const hash = createHash('sha256').update(content).digest('hex');
      const id = metadata.id || hash;

      const fileMetadata: FileMetadata = {
        id,
        name: metadata.name || path.basename(filePath),
        path: filePath,
        size: stats.size,
        created: metadata.created || stats.birthtime,
        modified: new Date(),
        hash,
        version: metadata.version || 1,
        tags: metadata.tags || [],
        category: metadata.category || 'prp',
        author: metadata.author,
      };

      return fileMetadata;
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw error;
    }
  }

  private async generateMetadata(
    filePath: string,
    content: string,
    stats: Stats
  ): Promise<FileMetadata> {
    const hash = createHash('sha256').update(content).digest('hex');

    return {
      id: hash,
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      hash,
      version: 1,
      tags: [],
      category: filePath.includes('INITIAL.md') ? 'initial' : 'prp',
    };
  }

  private async createVersionBackup(metadata: FileMetadata): Promise<void> {
    const versionPath = path.join(
      this.config.baseDir,
      this.config.versionsDir,
      `${metadata.id}_v${metadata.version}_${Date.now()}.bak`
    );

    try {
      const content = await fs.readFile(metadata.path, 'utf-8');
      await fs.writeFile(versionPath, content, 'utf-8');

      // Save version metadata
      const versionMetadata = {
        ...metadata,
        backupPath: versionPath,
        backupDate: new Date(),
      };

      const versionMetadataPath = `${versionPath}.meta`;
      await fs.writeFile(
        versionMetadataPath,
        JSON.stringify(versionMetadata, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.warn(`[Storage] Failed to create version backup: ${error}`);
    }
  }

  private async acquireLock(filePath: string, operation: string): Promise<string> {
    if (!this.config.enableLocking) {
      return 'disabled';
    }

    const lockId = createHash('md5')
      .update(`${filePath}_${Date.now()}_${Math.random()}`)
      .digest('hex');

    // Wait for existing lock to be released
    while (this.activeLocks.has(filePath)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Acquire lock
    this.activeLocks.set(filePath, {
      path: filePath,
      lockId,
      timestamp: new Date(),
      operation,
    });

    return lockId;
  }

  private async releaseLock(filePath: string, lockId: string): Promise<void> {
    if (!this.config.enableLocking || lockId === 'disabled') {
      return;
    }

    const lock = this.activeLocks.get(filePath);
    if (lock && lock.lockId === lockId) {
      this.activeLocks.delete(filePath);
    }
  }
}