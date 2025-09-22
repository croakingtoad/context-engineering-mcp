import { ResourceHandler, ResourceInfo, ResourceContent, EnhancedTemplate } from '../types.js';
import { PRPTemplate } from '../../types/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Handler for template base resources
 * Provides access to Cole's comprehensive templates via context://templates/base
 */
export class TemplateBaseHandler implements ResourceHandler {
  private templatesDirectory: string;
  private externalTemplatesDirectory: string;
  private templates: Map<string, EnhancedTemplate> = new Map();
  private templateUsage: Map<string, { count: number; lastUsed: Date }> = new Map();
  private lastScanTime: number = 0;
  private readonly SCAN_INTERVAL = 60 * 1000; // 1 minute

  constructor(templatesDir?: string, externalTemplatesDir?: string) {
    this.templatesDirectory = templatesDir || process.env.TEMPLATES_DIR || './templates';
    this.externalTemplatesDirectory = externalTemplatesDir || process.env.EXTERNAL_TEMPLATES_DIR || './external/context-engineering-intro';
  }

  /**
   * Initialize the handler
   */
  async initialize(): Promise<void> {
    await this.scanTemplates();
    await this.loadUsageStats();
  }

  /**
   * Scan for template files
   */
  private async scanTemplates(): Promise<void> {
    this.templates.clear();

    // Load internal templates
    await this.scanTemplateDirectory(this.templatesDirectory);

    // Load external templates from Cole's repo
    await this.scanExternalTemplates();

    this.lastScanTime = Date.now();
  }

  /**
   * Scan a template directory
   */
  private async scanTemplateDirectory(directory: string): Promise<void> {
    try {
      await fs.mkdir(directory, { recursive: true });
      const files = await fs.readdir(directory);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(directory, file);
            const template = await this.loadTemplateFile(filePath);
            if (template) {
              this.templates.set(template.id, template);
            }
          } catch (error) {
            // console.warn(`Failed to load template ${file}:`, error);
          }
        }
      }
    } catch (error) {
      // console.warn(`Failed to scan template directory ${directory}:`, error);
    }
  }

  /**
   * Scan external templates from Cole's repository structure
   */
  private async scanExternalTemplates(): Promise<void> {
    const possiblePaths = [
      path.join(this.externalTemplatesDirectory, 'templates'),
      path.join(this.externalTemplatesDirectory, 'use-cases'),
      path.join(this.externalTemplatesDirectory, 'examples'),
    ];

    for (const templatePath of possiblePaths) {
      try {
        await this.scanTemplateDirectory(templatePath);
      } catch (error) {
        // console.warn(`Failed to scan external templates at ${templatePath}:`, error);
      }
    }
  }

  /**
   * Load a template file and convert to enhanced template
   */
  private async loadTemplateFile(filePath: string): Promise<EnhancedTemplate | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      const templateData = JSON.parse(content);

      // Convert PRPTemplate to EnhancedTemplate
      const enhanced: EnhancedTemplate = {
        id: templateData.id || path.basename(filePath, '.json'),
        name: templateData.name || path.basename(filePath, '.json'),
        description: templateData.description || 'Template description',
        category: templateData.category || 'general',
        content: this.templateToMarkdown(templateData),
        version: templateData.version || '1.0.0',
        author: templateData.author || 'Unknown',
        created: templateData.created ? new Date(templateData.created) : stats.birthtime,
        updated: templateData.updated ? new Date(templateData.updated) : stats.mtime,
        tags: templateData.tags || [],
        usage: {
          downloadCount: 0,
          lastUsed: undefined,
          averageRating: undefined,
        },
        metadata: {
          sections: templateData.sections?.length || 0,
          source: filePath.includes(this.externalTemplatesDirectory) ? 'external' : 'internal',
          complexity: this.calculateTemplateComplexity(templateData),
        },
      };

      return enhanced;
    } catch (error) {
      // console.warn(`Failed to load template file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Convert template data to markdown format
   */
  private templateToMarkdown(templateData: any): string {
    const sections = [
      `# ${templateData.name}\n`,
      templateData.description ? `${templateData.description}\n` : '',
      templateData.category ? `**Category:** ${templateData.category}\n` : '',
      templateData.version ? `**Version:** ${templateData.version}\n` : '',
      templateData.author ? `**Author:** ${templateData.author}\n` : '',
    ];

    if (templateData.sections && Array.isArray(templateData.sections)) {
      sections.push('## Template Sections\n');

      for (const section of templateData.sections) {
        sections.push(`### ${section.title}`);
        sections.push(section.content);

        if (section.examples && section.examples.length > 0) {
          sections.push('\n**Examples:**');
          section.examples.forEach((example: string) => {
            sections.push(`- ${example}`);
          });
        }

        if (section.requirements && section.requirements.length > 0) {
          sections.push('\n**Requirements:**');
          section.requirements.forEach((req: string) => {
            sections.push(`- ${req}`);
          });
        }

        sections.push('');
      }
    }

    if (templateData.tags && templateData.tags.length > 0) {
      sections.push(`**Tags:** ${templateData.tags.join(', ')}`);
    }

    return sections.join('\n');
  }

  /**
   * Calculate template complexity score
   */
  private calculateTemplateComplexity(templateData: any): number {
    let complexity = 1;

    if (templateData.sections) {
      complexity += templateData.sections.length * 2;

      for (const section of templateData.sections) {
        if (section.examples) complexity += section.examples.length;
        if (section.requirements) complexity += section.requirements.length;
        if (section.metadata) complexity += Object.keys(section.metadata).length;
      }
    }

    return Math.min(complexity, 100); // Cap at 100
  }

  /**
   * Load usage statistics
   */
  private async loadUsageStats(): Promise<void> {
    try {
      const statsPath = path.join(this.templatesDirectory, '.usage-stats.json');
      const content = await fs.readFile(statsPath, 'utf-8');
      const stats = JSON.parse(content);

      for (const [templateId, usage] of Object.entries(stats)) {
        const usageData = usage as any;
        this.templateUsage.set(templateId, {
          count: usageData.count || 0,
          lastUsed: usageData.lastUsed ? new Date(usageData.lastUsed) : new Date(),
        });
      }
    } catch (error) {
      // Stats file doesn't exist yet, that's okay
    }
  }

  /**
   * Save usage statistics
   */
  private async saveUsageStats(): Promise<void> {
    try {
      const stats: Record<string, any> = {};

      for (const [templateId, usage] of Array.from(this.templateUsage.entries())) {
        stats[templateId] = {
          count: usage.count,
          lastUsed: usage.lastUsed.toISOString(),
        };
      }

      const statsPath = path.join(this.templatesDirectory, '.usage-stats.json');
      await fs.mkdir(this.templatesDirectory, { recursive: true });
      await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    } catch (error) {
      // console.warn('Failed to save usage stats:', error);
    }
  }

  /**
   * Track template usage
   */
  private async trackUsage(templateId: string): Promise<void> {
    const current = this.templateUsage.get(templateId) || { count: 0, lastUsed: new Date() };
    current.count += 1;
    current.lastUsed = new Date();
    this.templateUsage.set(templateId, current);

    // Update template usage stats
    const template = this.templates.get(templateId);
    if (template) {
      template.usage.downloadCount = current.count;
      template.usage.lastUsed = current.lastUsed;
    }

    // Save stats periodically
    if (current.count % 10 === 0) {
      await this.saveUsageStats();
    }
  }

  /**
   * Check if rescan is needed
   */
  private shouldRescan(): boolean {
    return Date.now() - this.lastScanTime > this.SCAN_INTERVAL;
  }

  /**
   * List all template resources
   */
  async listResources(): Promise<ResourceInfo[]> {
    if (this.shouldRescan()) {
      await this.scanTemplates();
    }

    const resources: ResourceInfo[] = [
      // Base template collection
      {
        uri: 'context://templates/base',
        name: 'Template Collection',
        description: 'Complete collection of PRP templates',
        mimeType: 'application/json',
        tags: ['templates', 'collection'],
      },
      // Template catalog
      {
        uri: 'context://templates/catalog',
        name: 'Template Catalog',
        description: 'Searchable catalog of all templates with metadata',
        mimeType: 'text/markdown',
        tags: ['catalog', 'browse'],
      },
      // Popular templates
      {
        uri: 'context://templates/popular',
        name: 'Popular Templates',
        description: 'Most frequently used templates',
        mimeType: 'application/json',
        tags: ['popular', 'trending'],
      },
      // Template categories
      {
        uri: 'context://templates/categories',
        name: 'Template Categories',
        description: 'Templates organized by category',
        mimeType: 'application/json',
        tags: ['categories', 'organization'],
      },
    ];

    // Add individual template resources
    for (const template of Array.from(this.templates.values())) {
      resources.push({
        uri: `context://templates/${template.id}`,
        name: template.name,
        description: template.description,
        mimeType: 'text/markdown',
        lastModified: template.updated,
        tags: [...template.tags, 'template', template.category],
      });
    }

    return resources;
  }

  /**
   * Read template resource
   */
  async readResource(path: string, params: Record<string, string>): Promise<ResourceContent> {
    if (this.shouldRescan()) {
      await this.scanTemplates();
    }

    const format = params.format || 'json';

    switch (path) {
      case 'base':
        return this.getBaseCollection(format);
      case 'catalog':
        return this.getCatalog(format);
      case 'popular':
        return this.getPopularTemplates(format);
      case 'categories':
        return this.getCategories(format);
      default:
        return this.getSpecificTemplate(path, format, params);
    }
  }

  /**
   * Get base template collection
   */
  private async getBaseCollection(format: string): Promise<ResourceContent> {
    const templates = Array.from(this.templates.values());

    let content: string;
    let mimeType: string;

    switch (format.toLowerCase()) {
      case 'markdown':
        content = this.formatTemplatesAsMarkdown(templates);
        mimeType = 'text/markdown';
        break;

      case 'summary':
        content = this.generateTemplateSummary(templates);
        mimeType = 'text/markdown';
        break;

      case 'json':
      default:
        content = JSON.stringify({
          templates: templates.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            version: t.version,
            author: t.author,
            tags: t.tags,
            usage: t.usage,
          })),
          totalCount: templates.length,
          categories: this.getUniqueCategories(),
          lastUpdated: new Date().toISOString(),
        }, null, 2);
        mimeType = 'application/json';
        break;
    }

    return {
      uri: 'context://templates/base',
      mimeType,
      text: content,
    };
  }

  /**
   * Get template catalog
   */
  private async getCatalog(format: string): Promise<ResourceContent> {
    const templates = Array.from(this.templates.values())
      .sort((a, b) => b.usage.downloadCount - a.usage.downloadCount);

    const content = `# Template Catalog

## Overview
- **Total Templates:** ${templates.length}
- **Categories:** ${this.getUniqueCategories().length}
- **Last Updated:** ${new Date().toISOString().split('T')[0]}

## Featured Templates
${templates.slice(0, 5).map(t => `
### ${t.name}
- **Category:** ${t.category}
- **Version:** ${t.version}
- **Usage:** ${t.usage.downloadCount} downloads
- **Description:** ${t.description}
`).join('\n')}

## All Templates by Category
${this.getUniqueCategories().map(category => {
      const categoryTemplates = templates.filter(t => t.category === category);
      return `
### ${category} (${categoryTemplates.length} templates)
${categoryTemplates.map(t => `- **${t.name}** (v${t.version}): ${t.description}`).join('\n')}
`;
    }).join('\n')}

---
*Browse individual templates using context://templates/{template-id}*`;

    return {
      uri: 'context://templates/catalog',
      mimeType: 'text/markdown',
      text: content,
    };
  }

  /**
   * Get popular templates
   */
  private async getPopularTemplates(format: string): Promise<ResourceContent> {
    const popularTemplates = Array.from(this.templates.values())
      .filter(t => t.usage.downloadCount > 0)
      .sort((a, b) => b.usage.downloadCount - a.usage.downloadCount)
      .slice(0, 10);

    const content = JSON.stringify({
      popularTemplates: popularTemplates.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        downloadCount: t.usage.downloadCount,
        lastUsed: t.usage.lastUsed,
      })),
      generatedAt: new Date().toISOString(),
    }, null, 2);

    return {
      uri: 'context://templates/popular',
      mimeType: 'application/json',
      text: content,
    };
  }

  /**
   * Get templates by categories
   */
  private async getCategories(format: string): Promise<ResourceContent> {
    const categories = this.getUniqueCategories();
    const categoryData = categories.map(category => ({
      name: category,
      templates: Array.from(this.templates.values())
        .filter(t => t.category === category)
        .map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          version: t.version,
        })),
    }));

    const content = JSON.stringify({
      categories: categoryData,
      totalCategories: categories.length,
      totalTemplates: Array.from(this.templates.values()).length,
    }, null, 2);

    return {
      uri: 'context://templates/categories',
      mimeType: 'application/json',
      text: content,
    };
  }

  /**
   * Get a specific template
   */
  private async getSpecificTemplate(templateId: string, format: string, params: Record<string, string>): Promise<ResourceContent> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new McpError(ErrorCode.InvalidRequest, `Template not found: ${templateId}`);
    }

    // Track usage
    await this.trackUsage(templateId);

    let content: string;
    let mimeType: string;

    switch (format.toLowerCase()) {
      case 'json':
        content = JSON.stringify(template, null, 2);
        mimeType = 'application/json';
        break;

      case 'raw':
        content = template.content;
        mimeType = 'text/markdown';
        break;

      case 'metadata':
        content = JSON.stringify({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          version: template.version,
          author: template.author,
          created: template.created,
          updated: template.updated,
          tags: template.tags,
          usage: template.usage,
          metadata: template.metadata,
        }, null, 2);
        mimeType = 'application/json';
        break;

      case 'markdown':
      default:
        content = this.formatTemplateWithStats(template);
        mimeType = 'text/markdown';
        break;
    }

    return {
      uri: `context://templates/${templateId}`,
      mimeType,
      text: content,
    };
  }

  /**
   * Format templates as markdown
   */
  private formatTemplatesAsMarkdown(templates: EnhancedTemplate[]): string {
    const sections = [
      '# Template Collection\n',
      `Total templates: ${templates.length}`,
      `Categories: ${this.getUniqueCategories().join(', ')}\n`,
    ];

    const byCategory = templates.reduce((acc, template) => {
      if (!acc[template.category]) acc[template.category] = [];
      acc[template.category].push(template);
      return acc;
    }, {} as Record<string, EnhancedTemplate[]>);

    for (const [category, categoryTemplates] of Object.entries(byCategory)) {
      sections.push(`## ${category} Templates\n`);

      for (const template of categoryTemplates) {
        sections.push(`### ${template.name} (v${template.version})`);
        sections.push(`${template.description}`);
        sections.push(`**Author:** ${template.author} | **Downloads:** ${template.usage.downloadCount}\n`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate template summary
   */
  private generateTemplateSummary(templates: EnhancedTemplate[]): string {
    const categories = this.getUniqueCategories();
    const totalDownloads = templates.reduce((sum, t) => sum + t.usage.downloadCount, 0);
    const mostPopular = templates.sort((a, b) => b.usage.downloadCount - a.usage.downloadCount)[0];

    return `# Template Summary

## Statistics
- **Total Templates:** ${templates.length}
- **Categories:** ${categories.length}
- **Total Downloads:** ${totalDownloads}
- **Most Popular:** ${mostPopular?.name || 'None'} (${mostPopular?.usage.downloadCount || 0} downloads)

## Category Breakdown
${categories.map(cat => {
      const count = templates.filter(t => t.category === cat).length;
      return `- **${cat}:** ${count} templates`;
    }).join('\n')}

## Recent Activity
${templates
      .filter(t => t.usage.lastUsed)
      .sort((a, b) => (b.usage.lastUsed?.getTime() || 0) - (a.usage.lastUsed?.getTime() || 0))
      .slice(0, 5)
      .map(t => `- ${t.name}: Last used ${t.usage.lastUsed?.toISOString().split('T')[0]}`)
      .join('\n')}`;
  }

  /**
   * Format template with usage stats
   */
  private formatTemplateWithStats(template: EnhancedTemplate): string {
    return `${template.content}

---
## Template Statistics
- **Downloads:** ${template.usage.downloadCount}
- **Last Used:** ${template.usage.lastUsed?.toISOString().split('T')[0] || 'Never'}
- **Complexity Score:** ${template.metadata?.complexity || 'Unknown'}
- **Source:** ${template.metadata?.source || 'Unknown'}

*Template accessed from context://templates/${template.id}*`;
  }

  /**
   * Get unique categories
   */
  private getUniqueCategories(): string[] {
    const categories = Array.from(this.templates.values())
      .map(t => t.category)
      .filter(Boolean);

    return Array.from(new Set(categories)).sort();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.templatesDirectory);
      return this.templates.size > 0;
    } catch {
      return false;
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(templateData: Partial<EnhancedTemplate>): Promise<EnhancedTemplate> {
    const template: EnhancedTemplate = {
      id: templateData.id || `custom-${Date.now()}`,
      name: templateData.name || 'New Template',
      description: templateData.description || 'Custom template',
      category: templateData.category || 'custom',
      content: templateData.content || '# New Template\n\nTemplate content here...',
      version: templateData.version || '1.0.0',
      author: templateData.author || 'User',
      created: new Date(),
      updated: new Date(),
      tags: templateData.tags || ['custom'],
      usage: {
        downloadCount: 0,
        lastUsed: undefined,
        averageRating: undefined,
      },
      metadata: {
        source: 'user-created',
        complexity: 1,
      },
    };

    // Save to file
    const filePath = path.join(this.templatesDirectory, `${template.id}.json`);
    await fs.mkdir(this.templatesDirectory, { recursive: true });

    const templateForSave = {
      ...template,
      sections: this.contentToSections(template.content),
    };

    await fs.writeFile(filePath, JSON.stringify(templateForSave, null, 2));

    // Add to memory
    this.templates.set(template.id, template);

    return template;
  }

  /**
   * Convert markdown content to sections (simplified)
   */
  private contentToSections(content: string): any[] {
    const lines = content.split('\n');
    const sections = [];
    let currentSection: any = null;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        if (currentSection) sections.push(currentSection);
        currentSection = {
          title: line.slice(2).trim(),
          content: '',
        };
      } else if (line.startsWith('## ')) {
        if (currentSection) sections.push(currentSection);
        currentSection = {
          title: line.slice(3).trim(),
          content: '',
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) sections.push(currentSection);
    return sections;
  }
}