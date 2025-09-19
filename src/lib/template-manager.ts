import * as fs from 'fs/promises';
import * as path from 'path';
import { PRPTemplate, PRPTemplateSchema } from '../types/index.js';

export class TemplateManager {
  private templatesDir: string;
  private externalTemplatesDir: string;
  private templates: Map<string, PRPTemplate> = new Map();

  constructor(templatesDir: string, externalTemplatesDir: string) {
    this.templatesDir = templatesDir;
    this.externalTemplatesDir = externalTemplatesDir;
  }

  /**
   * Initialize template manager and load all templates
   */
  async initialize(): Promise<void> {
    await this.loadTemplates();
  }

  /**
   * Load templates from both internal and external directories
   */
  private async loadTemplates(): Promise<void> {
    // Load internal templates
    await this.loadTemplatesFromDirectory(this.templatesDir);

    // Load external templates from Cole's repo
    await this.loadTemplatesFromDirectory(this.externalTemplatesDir);
  }

  /**
   * Load templates from a specific directory
   */
  private async loadTemplatesFromDirectory(directory: string): Promise<void> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const templatePath = path.join(directory, entry.name);
          await this.loadTemplate(templatePath);
        }
      }
    } catch (error) {
      console.warn(`Failed to load templates from ${directory}:`, error);
    }
  }

  /**
   * Load a single template file
   */
  private async loadTemplate(templatePath: string): Promise<void> {
    try {
      const content = await fs.readFile(templatePath, 'utf-8');
      const templateData = JSON.parse(content);
      const template = PRPTemplateSchema.parse(templateData);

      this.templates.set(template.id, template);
    } catch (error) {
      console.warn(`Failed to load template from ${templatePath}:`, error);
    }
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): PRPTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): PRPTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(id: string): PRPTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Search templates by name or tags
   */
  searchTemplates(query: string): PRPTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTemplates().filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get available categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.templates.forEach(template => categories.add(template.category));
    return Array.from(categories).sort();
  }

  /**
   * Refresh templates by reloading from disk
   */
  async refresh(): Promise<void> {
    this.templates.clear();
    await this.loadTemplates();
  }
}