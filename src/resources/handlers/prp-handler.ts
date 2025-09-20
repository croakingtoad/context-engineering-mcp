import { ResourceHandler, ResourceInfo, ResourceContent, PRPDocument } from '../types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Handler for PRP (Product Requirements Prompt) documents
 * Provides access to individual PRP documents via context://prps/{name}
 */
export class PRPResourceHandler implements ResourceHandler {
  private prpDirectory: string;
  private prpDocuments: Map<string, PRPDocument> = new Map();
  private lastScanTime: number = 0;
  private readonly SCAN_INTERVAL = 30 * 1000; // 30 seconds

  constructor(prpDirectory?: string) {
    this.prpDirectory = prpDirectory || process.env.PRP_DIRECTORY || './data/prps';
  }

  /**
   * Initialize the handler and scan for PRP documents
   */
  async initialize(): Promise<void> {
    await this.scanPRPDocuments();
  }

  /**
   * Scan the PRP directory for documents
   */
  private async scanPRPDocuments(): Promise<void> {
    try {
      await fs.mkdir(this.prpDirectory, { recursive: true });

      const files = await fs.readdir(this.prpDirectory);
      this.prpDocuments.clear();

      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.md')) {
          try {
            const filePath = path.join(this.prpDirectory, file);
            const document = await this.loadPRPDocument(filePath);
            if (document) {
              this.prpDocuments.set(document.id, document);
            }
          } catch (error) {
            console.warn(`Failed to load PRP document ${file}:`, error);
          }
        }
      }

      this.lastScanTime = Date.now();
    } catch (error) {
      console.warn('Failed to scan PRP directory:', error);
    }
  }

  /**
   * Load a single PRP document from file
   */
  private async loadPRPDocument(filePath: string): Promise<PRPDocument | null> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      if (filePath.endsWith('.json')) {
        const data = JSON.parse(content);
        // Convert date strings to Date objects
        if (data.createdAt && typeof data.createdAt === 'string') {
          data.createdAt = new Date(data.createdAt);
        }
        if (data.updatedAt && typeof data.updatedAt === 'string') {
          data.updatedAt = new Date(data.updatedAt);
        }
        return data;
      } else {
        // For markdown files, create a basic PRP document structure
        const fileName = path.basename(filePath, '.md');
        return {
          id: fileName,
          name: fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `PRP document: ${fileName}`,
          content,
          templateId: 'unknown',
          projectContext: {
            name: fileName,
            domain: 'unknown'
          },
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          version: '1.0.0',
          tags: ['imported'],
        };
      }
    } catch (error) {
      console.warn(`Failed to load PRP document from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if we need to rescan the directory
   */
  private shouldRescan(): boolean {
    return Date.now() - this.lastScanTime > this.SCAN_INTERVAL;
  }

  /**
   * List all PRP resources
   */
  async listResources(): Promise<ResourceInfo[]> {
    if (this.shouldRescan()) {
      await this.scanPRPDocuments();
    }

    const resources: ResourceInfo[] = [];

    for (const document of Array.from(this.prpDocuments.values())) {
      resources.push({
        uri: `context://prps/${document.id}`,
        name: document.name,
        description: document.description,
        mimeType: 'text/markdown',
        lastModified: document.updatedAt,
        tags: document.tags,
      });
    }

    return resources;
  }

  /**
   * Read a specific PRP resource
   */
  async readResource(path: string, params: Record<string, string>): Promise<ResourceContent> {
    if (this.shouldRescan()) {
      await this.scanPRPDocuments();
    }

    const prpId = path;
    if (!prpId) {
      throw new McpError(ErrorCode.InvalidRequest, 'PRP ID is required in the path');
    }

    const document = this.prpDocuments.get(prpId);
    if (!document) {
      throw new McpError(ErrorCode.InvalidRequest, `PRP document not found: ${prpId}`);
    }

    // Handle different output formats
    const format = params.format || 'markdown';
    let content: string;
    let mimeType: string;

    switch (format.toLowerCase()) {
      case 'json':
        content = JSON.stringify(document, null, 2);
        mimeType = 'application/json';
        break;

      case 'html':
        content = this.formatPRPAsHTML(document);
        mimeType = 'text/html';
        break;

      case 'raw':
        content = document.content;
        mimeType = 'text/plain';
        break;

      case 'markdown':
      default:
        content = this.formatPRPAsMarkdown(document);
        mimeType = 'text/markdown';
        break;
    }

    return {
      uri: `context://prps/${prpId}`,
      mimeType,
      text: content,
    };
  }

  /**
   * Format PRP document as enhanced markdown
   */
  private formatPRPAsMarkdown(document: PRPDocument): string {
    const sections = [
      `# ${document.name}\n`,
      `**Description:** ${document.description}\n`,
      `**Domain:** ${document.projectContext.domain}`,
      `**Version:** ${document.version}`,
      `**Last Updated:** ${document.updatedAt.toISOString().split('T')[0]}\n`,
    ];

    if (document.projectContext.stakeholders?.length) {
      sections.push(`**Stakeholders:** ${document.projectContext.stakeholders.join(', ')}\n`);
    }

    if (document.projectContext.objectives?.length) {
      sections.push('## Objectives\n');
      document.projectContext.objectives.forEach(objective => {
        sections.push(`- ${objective}`);
      });
      sections.push('');
    }

    if (document.projectContext.constraints?.length) {
      sections.push('## Constraints\n');
      document.projectContext.constraints.forEach(constraint => {
        sections.push(`- ${constraint}`);
      });
      sections.push('');
    }

    sections.push('## Content\n');
    sections.push(document.content);

    if (document.tags?.length) {
      sections.push(`\n---\n**Tags:** ${document.tags.join(', ')}`);
    }

    return sections.join('\n');
  }

  /**
   * Format PRP document as HTML
   */
  private formatPRPAsHTML(document: PRPDocument): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${document.name}</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 2rem; }
        .metadata { background: #f5f5f5; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
        .tags { margin-top: 1rem; }
        .tag { background: #e3f2fd; padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem; }
    </style>
</head>
<body>
    <h1>${document.name}</h1>

    <div class="metadata">
        <strong>Description:</strong> ${document.description}<br>
        <strong>Domain:</strong> ${document.projectContext.domain}<br>
        <strong>Version:</strong> ${document.version}<br>
        <strong>Last Updated:</strong> ${document.updatedAt.toISOString().split('T')[0]}

        ${document.projectContext.stakeholders?.length ? `
        <br><strong>Stakeholders:</strong> ${document.projectContext.stakeholders.join(', ')}
        ` : ''}

        ${document.tags?.length ? `
        <div class="tags">
            <strong>Tags:</strong>
            ${document.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        ` : ''}
    </div>

    ${document.projectContext.objectives?.length ? `
    <h2>Objectives</h2>
    <ul>
        ${document.projectContext.objectives.map(obj => `<li>${obj}</li>`).join('')}
    </ul>
    ` : ''}

    ${document.projectContext.constraints?.length ? `
    <h2>Constraints</h2>
    <ul>
        ${document.projectContext.constraints.map(constraint => `<li>${constraint}</li>`).join('')}
    </ul>
    ` : ''}

    <h2>Content</h2>
    <pre style="white-space: pre-wrap;">${document.content}</pre>
</body>
</html>`;
  }

  /**
   * Health check for the handler
   */
  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.prpDirectory);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save a new PRP document
   */
  async savePRPDocument(document: PRPDocument): Promise<void> {
    const filePath = path.join(this.prpDirectory, `${document.id}.json`);
    await fs.mkdir(this.prpDirectory, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(document, null, 2));
    this.prpDocuments.set(document.id, document);
  }

  /**
   * Delete a PRP document
   */
  async deletePRPDocument(id: string): Promise<void> {
    const filePath = path.join(this.prpDirectory, `${id}.json`);
    try {
      await fs.unlink(filePath);
      this.prpDocuments.delete(id);
    } catch (error) {
      throw new McpError(ErrorCode.InvalidRequest, `Failed to delete PRP document: ${id}`);
    }
  }
}