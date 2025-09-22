import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
// FileMetadata is available in the interface definitions below

// Change tracking types
export interface ChangeRecord {
  id: string;
  fileId: string;
  version: number;
  timestamp: Date;
  author?: string;
  description: string;
  changeType: 'create' | 'update' | 'delete' | 'restore';
  changes: DetailedChange[];
  metadata: {
    sizeBefore?: number;
    sizeAfter?: number;
    linesBefore?: number;
    linesAfter?: number;
    hashBefore?: string;
    hashAfter?: string;
  };
}

export interface DetailedChange {
  type: 'addition' | 'deletion' | 'modification';
  section: string;
  lineStart: number;
  lineEnd: number;
  contentBefore?: string;
  contentAfter?: string;
  summary: string;
}

export interface ConflictResolution {
  conflictId: string;
  fileId: string;
  baseVersion: number;
  conflictingVersions: number[];
  resolution: 'merge' | 'accept-current' | 'accept-incoming' | 'manual';
  resolvedBy?: string;
  resolvedAt?: Date;
  mergedContent?: string;
}

export interface RollbackOptions {
  targetVersion: number;
  preserveChanges?: boolean;
  createBackup?: boolean;
  reason?: string;
}

// Configuration for change tracking
export interface ChangeTrackerConfig {
  baseDir: string;
  changesDir: string;
  maxVersionHistory: number;
  enableDiffGeneration: boolean;
  compressionEnabled: boolean;
}

/**
 * Version control and change tracking system for PRPs
 * Features: Version history, diff generation, rollback, conflict resolution, audit trail
 */
export class ChangeTracker {
  private config: ChangeTrackerConfig;
  private changeHistory: Map<string, ChangeRecord[]> = new Map();
  private initialized = false;

  constructor(config: Partial<ChangeTrackerConfig> = {}) {
    this.config = {
      baseDir: config.baseDir || './data',
      changesDir: config.changesDir || '.changes',
      maxVersionHistory: config.maxVersionHistory || 50,
      enableDiffGeneration: config.enableDiffGeneration !== false,
      compressionEnabled: config.compressionEnabled !== false,
      ...config,
    };
  }

  /**
   * Initialize the change tracker
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.ensureDirectories();
      await this.loadChangeHistory();
      this.initialized = true;
      // ChangeTracker initialized successfully
    } catch (error) {
      // ChangeTracker failed to initialize
      throw error;
    }
  }

  /**
   * Record a change to a file
   */
  async recordChange(
    fileId: string,
    changeType: ChangeRecord['changeType'],
    contentBefore: string = '',
    contentAfter: string = '',
    description: string = '',
    author?: string
  ): Promise<ChangeRecord> {
    await this.ensureInitialized();

    const changes = this.config.enableDiffGeneration
      ? await this.generateDetailedChanges(contentBefore, contentAfter)
      : [];

    const changeRecord: ChangeRecord = {
      id: this.generateChangeId(fileId),
      fileId,
      version: await this.getNextVersion(fileId),
      timestamp: new Date(),
      author,
      description:
        description || this.generateChangeDescription(changeType, changes),
      changeType,
      changes,
      metadata: {
        sizeBefore: Buffer.byteLength(contentBefore, 'utf8'),
        sizeAfter: Buffer.byteLength(contentAfter, 'utf8'),
        linesBefore: contentBefore.split('\n').length,
        linesAfter: contentAfter.split('\n').length,
        ...(contentBefore && {
          hashBefore: createHash('sha256').update(contentBefore).digest('hex'),
        }),
        ...(contentAfter && {
          hashAfter: createHash('sha256').update(contentAfter).digest('hex'),
        }),
      },
    };

    // Add to history
    if (!this.changeHistory.has(fileId)) {
      this.changeHistory.set(fileId, []);
    }

    const fileHistory = this.changeHistory.get(fileId)!;
    fileHistory.push(changeRecord);

    // Maintain history limit
    if (fileHistory.length > this.config.maxVersionHistory) {
      const removed = fileHistory.shift()!;
      await this.archiveChange(removed);
    }

    // Persist change record
    await this.persistChangeRecord(changeRecord);

    return changeRecord;
  }

  /**
   * Get change history for a file
   */
  async getChangeHistory(
    fileId: string,
    options: {
      limit?: number;
      offset?: number;
      fromVersion?: number;
      toVersion?: number;
      author?: string;
      changeType?: ChangeRecord['changeType'];
    } = {}
  ): Promise<{
    changes: ChangeRecord[];
    total: number;
    hasMore: boolean;
  }> {
    await this.ensureInitialized();

    let changes = this.changeHistory.get(fileId) || [];

    // Apply filters
    if (options.fromVersion !== undefined) {
      changes = changes.filter(c => c.version >= options.fromVersion!);
    }

    if (options.toVersion !== undefined) {
      changes = changes.filter(c => c.version <= options.toVersion!);
    }

    if (options.author) {
      changes = changes.filter(c => c.author === options.author);
    }

    if (options.changeType) {
      changes = changes.filter(c => c.changeType === options.changeType);
    }

    // Sort by timestamp (newest first)
    changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = changes.length;
    const offset = options.offset || 0;
    const limit = options.limit || total;

    const paginatedChanges = changes.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      changes: paginatedChanges,
      total,
      hasMore,
    };
  }

  /**
   * Generate a visual diff between two versions
   */
  async generateDiff(
    fileId: string,
    fromVersion: number,
    toVersion: number,
    format: 'unified' | 'side-by-side' | 'html' = 'unified'
  ): Promise<string> {
    await this.ensureInitialized();

    const fromChange = await this.getChangeByVersion(fileId, fromVersion);
    const toChange = await this.getChangeByVersion(fileId, toVersion);

    if (!fromChange || !toChange) {
      throw new Error(`Version not found for file ${fileId}`);
    }

    const fromContent = await this.getContentAtVersion(fileId, fromVersion);
    const toContent = await this.getContentAtVersion(fileId, toVersion);

    return this.formatDiff(fromContent, toContent, format, {
      fromVersion,
      toVersion,
      fromTimestamp: fromChange.timestamp,
      toTimestamp: toChange.timestamp,
    });
  }

  /**
   * Rollback a file to a previous version
   */
  async rollbackToVersion(
    fileId: string,
    options: RollbackOptions
  ): Promise<{ content: string; changeRecord: ChangeRecord }> {
    await this.ensureInitialized();

    const targetChange = await this.getChangeByVersion(
      fileId,
      options.targetVersion
    );
    if (!targetChange) {
      throw new Error(
        `Version ${options.targetVersion} not found for file ${fileId}`
      );
    }

    const targetContent = await this.getContentAtVersion(
      fileId,
      options.targetVersion
    );
    const currentContent = await this.getCurrentContent(fileId);

    // Create rollback change record
    const rollbackDescription = options.reason
      ? `Rollback to v${options.targetVersion}: ${options.reason}`
      : `Rollback to version ${options.targetVersion}`;

    const changeRecord = await this.recordChange(
      fileId,
      'update',
      currentContent,
      targetContent,
      rollbackDescription
    );

    return {
      content: targetContent,
      changeRecord,
    };
  }

  /**
   * Detect and handle conflicts between concurrent edits
   */
  async detectConflicts(
    fileId: string,
    baseVersion: number,
    incomingContent: string
  ): Promise<ConflictResolution | null> {
    await this.ensureInitialized();

    const currentVersion = await this.getCurrentVersion(fileId);

    // No conflict if we're on the latest version
    if (baseVersion === currentVersion) {
      return null;
    }

    const baseContent = await this.getContentAtVersion(fileId, baseVersion);
    const currentContent = await this.getCurrentContent(fileId);

    // Check if there are conflicting changes
    const baseToCurrentChanges = await this.generateDetailedChanges(
      baseContent,
      currentContent
    );
    const baseToIncomingChanges = await this.generateDetailedChanges(
      baseContent,
      incomingContent
    );

    const hasConflicts = this.checkForConflicts(
      baseToCurrentChanges,
      baseToIncomingChanges
    );

    if (!hasConflicts) {
      return null;
    }

    const conflictId = this.generateConflictId(
      fileId,
      baseVersion,
      currentVersion
    );

    return {
      conflictId,
      fileId,
      baseVersion,
      conflictingVersions: [currentVersion],
      resolution: 'manual', // Default to manual resolution
    };
  }

  /**
   * Resolve a conflict with chosen resolution strategy
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
    _resolvedBy?: string
  ): Promise<string> {
    await this.ensureInitialized();

    const { fileId, baseVersion, conflictingVersions } = resolution;
    // Remove unused variable warnings
    void conflictId;
    void baseVersion;

    switch (resolution.resolution) {
      case 'accept-current':
        return await this.getCurrentContent(fileId);

      case 'accept-incoming':
        // This would need to be provided in the resolution
        if (!resolution.mergedContent) {
          throw new Error(
            'Merged content required for accept-incoming resolution'
          );
        }
        return resolution.mergedContent;

      case 'merge':
        return await this.performThreeWayMerge(
          fileId,
          baseVersion,
          conflictingVersions[0]
        );

      case 'manual':
        if (!resolution.mergedContent) {
          throw new Error('Merged content required for manual resolution');
        }
        return resolution.mergedContent;

      default:
        throw new Error(
          `Unknown resolution strategy: ${resolution.resolution}`
        );
    }
  }

  /**
   * Get audit trail for compliance
   */
  async getAuditTrail(
    fileId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    fileId: string;
    totalChanges: number;
    authors: string[];
    changeTypes: Record<string, number>;
    timeline: ChangeRecord[];
  }> {
    await this.ensureInitialized();

    let changes = this.changeHistory.get(fileId) || [];

    // Apply date filters
    if (fromDate) {
      changes = changes.filter(c => c.timestamp >= fromDate);
    }
    if (toDate) {
      changes = changes.filter(c => c.timestamp <= toDate);
    }

    const authorSet = new Set(changes.map(c => c.author).filter(Boolean));
    const authors = Array.from(authorSet) as string[];
    const changeTypes: Record<string, number> = {};

    changes.forEach(change => {
      changeTypes[change.changeType] =
        (changeTypes[change.changeType] || 0) + 1;
    });

    return {
      fileId,
      totalChanges: changes.length,
      authors,
      changeTypes,
      timeline: changes.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      ),
    };
  }

  // Private implementation methods

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async ensureDirectories(): Promise<void> {
    const changesDir = path.join(this.config.baseDir, this.config.changesDir);
    await fs.mkdir(changesDir, { recursive: true });
  }

  private async loadChangeHistory(): Promise<void> {
    const changesDir = path.join(this.config.baseDir, this.config.changesDir);

    try {
      const files = await fs.readdir(changesDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = path.join(changesDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const changes: ChangeRecord[] = JSON.parse(content);

          changes.forEach(change => {
            change.timestamp = new Date(change.timestamp);
            if (!this.changeHistory.has(change.fileId)) {
              this.changeHistory.set(change.fileId, []);
            }
            this.changeHistory.get(change.fileId)!.push(change);
          });
        } catch (error) {
          // Failed to load changes from file
        }
      }

      // Loaded change history
    } catch (error) {
      // No existing change history, starting fresh
    }
  }

  private async persistChangeRecord(change: ChangeRecord): Promise<void> {
    const changesDir = path.join(this.config.baseDir, this.config.changesDir);
    const filename = `${change.fileId}_changes.json`;
    const filePath = path.join(changesDir, filename);

    try {
      const existingContent = await fs.readFile(filePath, 'utf-8');
      const existingChanges: ChangeRecord[] = JSON.parse(existingContent);
      existingChanges.push(change);
      await fs.writeFile(filePath, JSON.stringify(existingChanges, null, 2));
    } catch {
      // File doesn't exist, create new
      await fs.writeFile(filePath, JSON.stringify([change], null, 2));
    }
  }

  private generateChangeId(fileId: string): string {
    return createHash('md5')
      .update(`${fileId}_${Date.now()}_${Math.random()}`)
      .digest('hex');
  }

  private generateConflictId(
    fileId: string,
    baseVersion: number,
    currentVersion: number
  ): string {
    return createHash('md5')
      .update(
        `conflict_${fileId}_${baseVersion}_${currentVersion}_${Date.now()}`
      )
      .digest('hex');
  }

  private async getNextVersion(fileId: string): Promise<number> {
    const history = this.changeHistory.get(fileId) || [];
    return history.length > 0
      ? Math.max(...history.map(c => c.version)) + 1
      : 1;
  }

  private async getCurrentVersion(fileId: string): Promise<number> {
    const history = this.changeHistory.get(fileId) || [];
    return history.length > 0 ? Math.max(...history.map(c => c.version)) : 0;
  }

  private async getChangeByVersion(
    fileId: string,
    version: number
  ): Promise<ChangeRecord | undefined> {
    const history = this.changeHistory.get(fileId) || [];
    return history.find(c => c.version === version);
  }

  private async getContentAtVersion(
    fileId: string,
    version: number
  ): Promise<string> {
    // This would need to be implemented based on how content is stored
    // For now, returning a placeholder
    const change = await this.getChangeByVersion(fileId, version);
    return change ? `Content at version ${version}` : '';
  }

  private async getCurrentContent(fileId: string): Promise<string> {
    const currentVersion = await this.getCurrentVersion(fileId);
    return await this.getContentAtVersion(fileId, currentVersion);
  }

  private async generateDetailedChanges(
    contentBefore: string,
    contentAfter: string
  ): Promise<DetailedChange[]> {
    const changes: DetailedChange[] = [];

    const linesBefore = contentBefore.split('\n');
    const linesAfter = contentAfter.split('\n');

    // Simple line-by-line diff (could be enhanced with more sophisticated algorithms)
    const maxLines = Math.max(linesBefore.length, linesAfter.length);

    for (let i = 0; i < maxLines; i++) {
      const lineBefore = linesBefore[i];
      const lineAfter = linesAfter[i];

      if (lineBefore !== lineAfter) {
        if (!lineBefore) {
          changes.push({
            type: 'addition',
            section: 'content',
            lineStart: i + 1,
            lineEnd: i + 1,
            contentAfter: lineAfter,
            summary: `Added line: ${lineAfter.slice(0, 50)}...`,
          });
        } else if (!lineAfter) {
          changes.push({
            type: 'deletion',
            section: 'content',
            lineStart: i + 1,
            lineEnd: i + 1,
            contentBefore: lineBefore,
            summary: `Deleted line: ${lineBefore.slice(0, 50)}...`,
          });
        } else {
          changes.push({
            type: 'modification',
            section: 'content',
            lineStart: i + 1,
            lineEnd: i + 1,
            contentBefore: lineBefore,
            contentAfter: lineAfter,
            summary: `Modified line ${i + 1}`,
          });
        }
      }
    }

    return changes;
  }

  private generateChangeDescription(
    changeType: ChangeRecord['changeType'],
    changes: DetailedChange[]
  ): string {
    const summary = {
      additions: changes.filter(c => c.type === 'addition').length,
      deletions: changes.filter(c => c.type === 'deletion').length,
      modifications: changes.filter(c => c.type === 'modification').length,
    };

    switch (changeType) {
      case 'create':
        return 'File created';
      case 'delete':
        return 'File deleted';
      case 'update':
        return `Updated: +${summary.additions} -${summary.deletions} ~${summary.modifications}`;
      case 'restore':
        return 'File restored from backup';
      default:
        return 'Unknown change';
    }
  }

  private checkForConflicts(
    changes1: DetailedChange[],
    changes2: DetailedChange[]
  ): boolean {
    // Check if any changes overlap in the same line ranges
    for (const change1 of changes1) {
      for (const change2 of changes2) {
        if (this.changesOverlap(change1, change2)) {
          return true;
        }
      }
    }
    return false;
  }

  private changesOverlap(
    change1: DetailedChange,
    change2: DetailedChange
  ): boolean {
    return !(
      change1.lineEnd < change2.lineStart || change2.lineEnd < change1.lineStart
    );
  }

  private async performThreeWayMerge(
    fileId: string,
    _baseVersion: number,
    conflictVersion: number
  ): Promise<string> {
    // Simplified three-way merge - in practice, this would use a more sophisticated algorithm
    const currentContent = await this.getCurrentContent(fileId);
    const conflictContent = await this.getContentAtVersion(
      fileId,
      conflictVersion
    );

    // For now, return a simple merge marker format
    return `<<<<<<< Current\n${currentContent}\n=======\n${conflictContent}\n>>>>>>> Version ${conflictVersion}\n`;
  }

  private formatDiff(
    fromContent: string,
    toContent: string,
    format: 'unified' | 'side-by-side' | 'html',
    metadata: any
  ): string {
    const fromLines = fromContent.split('\n');
    const toLines = toContent.split('\n');

    switch (format) {
      case 'html':
        return this.generateHtmlDiff(fromLines, toLines, metadata);
      case 'side-by-side':
        return this.generateSideBySideDiff(fromLines, toLines, metadata);
      case 'unified':
      default:
        return this.generateUnifiedDiff(fromLines, toLines, metadata);
    }
  }

  private generateUnifiedDiff(
    fromLines: string[],
    toLines: string[],
    metadata: any
  ): string {
    let diff = `--- Version ${metadata.fromVersion} (${metadata.fromTimestamp})\n`;
    diff += `+++ Version ${metadata.toVersion} (${metadata.toTimestamp})\n`;

    const maxLines = Math.max(fromLines.length, toLines.length);
    for (let i = 0; i < maxLines; i++) {
      const fromLine = fromLines[i];
      const toLine = toLines[i];

      if (fromLine === toLine) {
        diff += ` ${fromLine || ''}\n`;
      } else if (!fromLine) {
        diff += `+${toLine}\n`;
      } else if (!toLine) {
        diff += `-${fromLine}\n`;
      } else {
        diff += `-${fromLine}\n`;
        diff += `+${toLine}\n`;
      }
    }

    return diff;
  }

  private generateSideBySideDiff(
    fromLines: string[],
    toLines: string[],
    metadata: any
  ): string {
    let diff = `Version ${metadata.fromVersion} | Version ${metadata.toVersion}\n`;
    diff += `${'-'.repeat(40)} | ${'-'.repeat(40)}\n`;

    const maxLines = Math.max(fromLines.length, toLines.length);
    for (let i = 0; i < maxLines; i++) {
      const fromLine = (fromLines[i] || '').padEnd(40);
      const toLine = (toLines[i] || '').padEnd(40);
      diff += `${fromLine} | ${toLine}\n`;
    }

    return diff;
  }

  private generateHtmlDiff(
    fromLines: string[],
    toLines: string[],
    metadata: any
  ): string {
    let html = `<div class="diff">
      <h3>Version ${metadata.fromVersion} → Version ${metadata.toVersion}</h3>
      <table class="diff-table">`;

    const maxLines = Math.max(fromLines.length, toLines.length);
    for (let i = 0; i < maxLines; i++) {
      const fromLine = fromLines[i];
      const toLine = toLines[i];

      if (fromLine === toLine) {
        html += `<tr><td class="unchanged">${this.escapeHtml(fromLine || '')}</td></tr>`;
      } else if (!fromLine) {
        html += `<tr><td class="addition">+${this.escapeHtml(toLine)}</td></tr>`;
      } else if (!toLine) {
        html += `<tr><td class="deletion">-${this.escapeHtml(fromLine)}</td></tr>`;
      } else {
        html += `<tr><td class="deletion">-${this.escapeHtml(fromLine)}</td></tr>`;
        html += `<tr><td class="addition">+${this.escapeHtml(toLine)}</td></tr>`;
      }
    }

    html += '</table></div>';
    return html;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async archiveChange(change: ChangeRecord): Promise<void> {
    // Archive old changes to reduce memory usage
    const archiveDir = path.join(
      this.config.baseDir,
      this.config.changesDir,
      'archive'
    );
    await fs.mkdir(archiveDir, { recursive: true });

    const archiveFile = path.join(
      archiveDir,
      `${change.fileId}_${change.version}.json`
    );
    await fs.writeFile(archiveFile, JSON.stringify(change, null, 2));
  }
}
