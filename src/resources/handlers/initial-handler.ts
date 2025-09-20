import { ResourceHandler, ResourceInfo, ResourceContent, InitialRequestDocument } from '../types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Handler for INITIAL.md documents
 * Provides access to initial request documents via context://initial/{name}
 */
export class InitialRequestHandler implements ResourceHandler {
  private initialDirectory: string;
  private documents: Map<string, InitialRequestDocument> = new Map();
  private lastScanTime: number = 0;
  private readonly SCAN_INTERVAL = 30 * 1000; // 30 seconds

  constructor(initialDirectory?: string) {
    this.initialDirectory = initialDirectory || process.env.INITIAL_DIRECTORY || './data/initial';
  }

  /**
   * Initialize the handler
   */
  async initialize(): Promise<void> {
    await this.scanDocuments();
  }

  /**
   * Scan for initial request documents
   */
  private async scanDocuments(): Promise<void> {
    try {
      await fs.mkdir(this.initialDirectory, { recursive: true });

      const files = await fs.readdir(this.initialDirectory);
      this.documents.clear();

      for (const file of files) {
        if (file.endsWith('.md') || file.endsWith('.json')) {
          try {
            const filePath = path.join(this.initialDirectory, file);
            const document = await this.loadDocument(filePath);
            if (document) {
              this.documents.set(document.id, document);
            }
          } catch (error) {
            console.warn(`Failed to load initial document ${file}:`, error);
          }
        }
      }

      this.lastScanTime = Date.now();
    } catch (error) {
      console.warn('Failed to scan initial documents directory:', error);
    }
  }

  /**
   * Load a single initial request document
   */
  private async loadDocument(filePath: string): Promise<InitialRequestDocument | null> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      if (filePath.endsWith('.json')) {
        return JSON.parse(content);
      } else {
        // For markdown files, parse the header and create document structure
        const fileName = path.basename(filePath, '.md');
        const parsed = this.parseInitialMarkdown(content);

        return {
          id: fileName,
          name: parsed.projectName || fileName,
          projectName: parsed.projectName || fileName,
          projectType: parsed.projectType || 'unknown',
          framework: parsed.framework,
          domain: parsed.domain || 'unknown',
          content,
          templateId: 'unknown',
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          status: 'draft',
          metadata: parsed.metadata,
        };
      }
    } catch (error) {
      console.warn(`Failed to load initial document from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse markdown content to extract metadata
   */
  private parseInitialMarkdown(content: string): {
    projectName?: string;
    projectType?: string;
    framework?: string;
    domain?: string;
    metadata?: Record<string, any>;
  } {
    const lines = content.split('\n');
    const metadata: Record<string, any> = {};
    let projectName: string | undefined;
    let projectType: string | undefined;
    let framework: string | undefined;
    let domain: string | undefined;

    // Look for common patterns in initial.md files
    for (const line of lines.slice(0, 20)) { // Only check first 20 lines
      const lowerLine = line.toLowerCase();

      // Project name patterns
      if (lowerLine.includes('project:') || lowerLine.includes('# ')) {
        projectName = line.replace(/^#+\s*/, '').replace(/project:\s*/i, '').trim();
      }

      // Project type patterns
      if (lowerLine.includes('type:') || lowerLine.includes('project type:')) {
        projectType = line.split(':')[1]?.trim();
      }

      // Framework patterns
      if (lowerLine.includes('framework:') || lowerLine.includes('tech stack:')) {
        framework = line.split(':')[1]?.trim();
      }

      // Domain patterns
      if (lowerLine.includes('domain:') || lowerLine.includes('industry:')) {
        domain = line.split(':')[1]?.trim();
      }

      // Generic metadata extraction
      if (line.includes(':') && !line.includes('://')) {
        const [key, value] = line.split(':', 2);
        if (key && value && !key.startsWith('#')) {
          metadata[key.trim().toLowerCase()] = value.trim();
        }
      }
    }

    return {
      projectName,
      projectType,
      framework,
      domain,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Check if rescan is needed
   */
  private shouldRescan(): boolean {
    return Date.now() - this.lastScanTime > this.SCAN_INTERVAL;
  }

  /**
   * List all initial request resources
   */
  async listResources(): Promise<ResourceInfo[]> {
    if (this.shouldRescan()) {
      await this.scanDocuments();
    }

    const resources: ResourceInfo[] = [];

    for (const document of Array.from(this.documents.values())) {
      resources.push({
        uri: `context://initial/${document.id}`,
        name: `${document.name} (${document.status})`,
        description: `Initial request for ${document.projectName} - ${document.domain}`,
        mimeType: 'text/markdown',
        lastModified: document.updatedAt,
        tags: [document.status, document.projectType, document.domain].filter(Boolean),
      });
    }

    return resources;
  }

  /**
   * Read a specific initial request resource
   */
  async readResource(path: string, params: Record<string, string>): Promise<ResourceContent> {
    if (this.shouldRescan()) {
      await this.scanDocuments();
    }

    const docId = path;
    if (!docId) {
      throw new McpError(ErrorCode.InvalidRequest, 'Document ID is required in the path');
    }

    const document = this.documents.get(docId);
    if (!document) {
      throw new McpError(ErrorCode.InvalidRequest, `Initial request document not found: ${docId}`);
    }

    // Handle different output formats
    const format = params.format || 'enhanced';
    let content: string;
    let mimeType: string;

    switch (format.toLowerCase()) {
      case 'json':
        content = JSON.stringify(document, null, 2);
        mimeType = 'application/json';
        break;

      case 'raw':
        content = document.content;
        mimeType = 'text/markdown';
        break;

      case 'html':
        content = this.formatAsHTML(document);
        mimeType = 'text/html';
        break;

      case 'analysis':
        content = this.generateAnalysis(document);
        mimeType = 'text/markdown';
        break;

      case 'enhanced':
      default:
        content = this.formatAsEnhancedMarkdown(document);
        mimeType = 'text/markdown';
        break;
    }

    return {
      uri: `context://initial/${docId}`,
      mimeType,
      text: content,
    };
  }

  /**
   * Format document as enhanced markdown with metadata
   */
  private formatAsEnhancedMarkdown(document: InitialRequestDocument): string {
    const sections = [
      `# ${document.name}\n`,
      '## Document Metadata\n',
      `- **Status:** ${document.status}`,
      `- **Project Name:** ${document.projectName}`,
      `- **Project Type:** ${document.projectType}`,
      `- **Domain:** ${document.domain}`,
    ];

    if (document.framework) {
      sections.push(`- **Framework:** ${document.framework}`);
    }

    sections.push(`- **Created:** ${document.createdAt.toISOString().split('T')[0]}`);
    sections.push(`- **Updated:** ${document.updatedAt.toISOString().split('T')[0]}\n`);

    if (document.metadata && Object.keys(document.metadata).length > 0) {
      sections.push('## Additional Metadata\n');
      Object.entries(document.metadata).forEach(([key, value]) => {
        sections.push(`- **${key}:** ${value}`);
      });
      sections.push('');
    }

    sections.push('## Original Content\n');
    sections.push(document.content);

    return sections.join('\n');
  }

  /**
   * Format document as HTML
   */
  private formatAsHTML(document: InitialRequestDocument): string {
    const statusColor = {
      draft: '#ffc107',
      review: '#17a2b8',
      approved: '#28a745',
      archived: '#6c757d',
    }[document.status] || '#6c757d';

    return `
<!DOCTYPE html>
<html>
<head>
    <title>${document.name}</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 2rem; }
        .header { border-bottom: 2px solid #e9ecef; margin-bottom: 2rem; padding-bottom: 1rem; }
        .status {
            display: inline-block;
            background: ${statusColor};
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.875rem;
        }
        .metadata {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        .content { line-height: 1.6; }
        pre { white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${document.name}</h1>
        <span class="status">${document.status.toUpperCase()}</span>
    </div>

    <div class="metadata">
        <div><strong>Project Name:</strong><br>${document.projectName}</div>
        <div><strong>Project Type:</strong><br>${document.projectType}</div>
        <div><strong>Domain:</strong><br>${document.domain}</div>
        ${document.framework ? `<div><strong>Framework:</strong><br>${document.framework}</div>` : ''}
        <div><strong>Created:</strong><br>${document.createdAt.toISOString().split('T')[0]}</div>
        <div><strong>Updated:</strong><br>${document.updatedAt.toISOString().split('T')[0]}</div>
    </div>

    <div class="content">
        <h2>Content</h2>
        <pre>${document.content}</pre>
    </div>
</body>
</html>`;
  }

  /**
   * Generate analysis of the initial request
   */
  private generateAnalysis(document: InitialRequestDocument): string {
    const wordCount = document.content.split(/\s+/).length;
    const lineCount = document.content.split('\n').length;
    const hasRequirements = /requirement|must|should|will/i.test(document.content);
    const hasStakeholders = /stakeholder|user|client|customer/i.test(document.content);
    const hasConstraints = /constraint|limit|restriction|deadline/i.test(document.content);

    return `# Analysis: ${document.name}

## Document Statistics
- **Word Count:** ${wordCount}
- **Line Count:** ${lineCount}
- **Status:** ${document.status}
- **Age:** ${Math.ceil((Date.now() - document.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days

## Content Analysis
- **Contains Requirements:** ${hasRequirements ? '✅' : '❌'}
- **Mentions Stakeholders:** ${hasStakeholders ? '✅' : '❌'}
- **Includes Constraints:** ${hasConstraints ? '✅' : '❌'}

## Recommendations
${!hasRequirements ? '- Add specific requirements section\n' : ''}${!hasStakeholders ? '- Identify and document stakeholders\n' : ''}${!hasConstraints ? '- Document constraints and limitations\n' : ''}${document.status === 'draft' ? '- Move to review status when ready\n' : ''}

## Context Engineering Opportunities
- **Template Matching:** Look for templates in ${document.domain} domain
- **Pattern Analysis:** Analyze for common ${document.projectType} patterns
- **Enhancement Suggestions:** Consider adding acceptance criteria, success metrics, and risk assessment

---
*Analysis generated on ${new Date().toISOString().split('T')[0]}*`;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.initialDirectory);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save a document
   */
  async saveDocument(document: InitialRequestDocument): Promise<void> {
    const filePath = path.join(this.initialDirectory, `${document.id}.json`);
    await fs.mkdir(this.initialDirectory, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(document, null, 2));
    this.documents.set(document.id, document);
  }

  /**
   * Update document status
   */
  async updateStatus(id: string, status: InitialRequestDocument['status']): Promise<void> {
    const document = this.documents.get(id);
    if (!document) {
      throw new McpError(ErrorCode.InvalidRequest, `Document not found: ${id}`);
    }

    document.status = status;
    document.updatedAt = new Date();
    await this.saveDocument(document);
  }
}