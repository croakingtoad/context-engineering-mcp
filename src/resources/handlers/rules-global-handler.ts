import { ResourceHandler, ResourceInfo, ResourceContent, GlobalRule } from '../types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Handler for global rules and project guidelines
 * Provides access to rules via context://rules/global
 */
export class RulesGlobalHandler implements ResourceHandler {
  private rulesDirectory: string;
  private rules: Map<string, GlobalRule> = new Map();
  private lastScanTime: number = 0;
  private readonly SCAN_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(rulesDirectory?: string) {
    this.rulesDirectory = rulesDirectory || process.env.RULES_DIRECTORY || './data/rules';
  }

  /**
   * Initialize the handler
   */
  async initialize(): Promise<void> {
    await this.scanRules();
    await this.loadDefaultRules();
  }

  /**
   * Scan for rule files
   */
  private async scanRules(): Promise<void> {
    try {
      await fs.mkdir(this.rulesDirectory, { recursive: true });
      const files = await fs.readdir(this.rulesDirectory);

      this.rules.clear();

      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml')) {
          try {
            const filePath = path.join(this.rulesDirectory, file);
            const ruleSet = await this.loadRuleFile(filePath);
            if (ruleSet) {
              for (const rule of ruleSet) {
                this.rules.set(rule.id, rule);
              }
            }
          } catch (error) {
            console.warn(`Failed to load rule file ${file}:`, error);
          }
        }
      }

      this.lastScanTime = Date.now();
    } catch (error) {
      console.warn('Failed to scan rules directory:', error);
    }
  }

  /**
   * Load a rule file
   */
  private async loadRuleFile(filePath: string): Promise<GlobalRule[] | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let data: any;

      if (filePath.endsWith('.json')) {
        data = JSON.parse(content);
      } else {
        // For YAML files, we'd need a YAML parser, but for now handle as JSON
        throw new Error('YAML support not implemented yet');
      }

      // Handle both single rule and rule array formats
      const ruleData = Array.isArray(data) ? data : data.rules || [data];

      return ruleData.map((rule: any) => ({
        id: rule.id || path.basename(filePath, path.extname(filePath)),
        name: rule.name || 'Unnamed Rule',
        description: rule.description || '',
        category: rule.category || 'general',
        rule: rule.rule || rule.content || '',
        severity: rule.severity || 'info',
        applicableLanguages: rule.applicableLanguages || [],
        applicableFrameworks: rule.applicableFrameworks || [],
        examples: rule.examples || [],
        references: rule.references || [],
        createdAt: rule.createdAt ? new Date(rule.createdAt) : new Date(),
        updatedAt: rule.updatedAt ? new Date(rule.updatedAt) : new Date(),
      }));
    } catch (error) {
      console.warn(`Failed to load rule file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Load default rules if no rules exist
   */
  private async loadDefaultRules(): Promise<void> {
    if (this.rules.size > 0) return;

    const defaultRules: GlobalRule[] = [
      {
        id: 'naming-camelcase-functions',
        name: 'Function Naming Convention',
        description: 'Functions should use camelCase naming convention',
        category: 'coding',
        rule: 'Use camelCase for function names (e.g., getUserData, processPayment)',
        severity: 'warning',
        applicableLanguages: ['javascript', 'typescript'],
        examples: [
          {
            good: 'function getUserData() { /* ... */ }',
            bad: 'function get_user_data() { /* ... */ }',
            explanation: 'camelCase is the standard convention for JavaScript/TypeScript functions',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'architecture-single-responsibility',
        name: 'Single Responsibility Principle',
        description: 'Each module/class should have one reason to change',
        category: 'architecture',
        rule: 'Design modules and classes with a single, well-defined responsibility',
        severity: 'error',
        examples: [
          {
            good: 'class UserValidator { validate(user) { /* validation logic */ } }',
            bad: 'class UserManager { validate(user) { /* ... */ } save(user) { /* ... */ } sendEmail(user) { /* ... */ } }',
            explanation: 'The bad example handles validation, persistence, and communication - too many responsibilities',
          },
        ],
        references: ['https://en.wikipedia.org/wiki/Single-responsibility_principle'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'documentation-function-comments',
        name: 'Function Documentation',
        description: 'All public functions should have documentation comments',
        category: 'documentation',
        rule: 'Document all public functions with JSDoc, docstrings, or equivalent',
        severity: 'warning',
        applicableLanguages: ['javascript', 'typescript', 'python', 'java'],
        examples: [
          {
            good: '/**\n * Calculates the total price including tax\n * @param {number} price - Base price\n * @param {number} taxRate - Tax rate (0-1)\n * @returns {number} Total price\n */\nfunction calculateTotal(price, taxRate) { /* ... */ }',
            bad: 'function calculateTotal(price, taxRate) { /* ... */ }',
            explanation: 'Documentation helps other developers understand the function\'s purpose and usage',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'testing-unit-coverage',
        name: 'Unit Test Coverage',
        description: 'Maintain high unit test coverage for critical code paths',
        category: 'testing',
        rule: 'Aim for 80%+ test coverage on business logic and critical paths',
        severity: 'warning',
        examples: [
          {
            good: 'describe(\'UserService\', () => {\n  it(\'should validate user data\', () => { /* test */ });\n  it(\'should handle invalid input\', () => { /* test */ });\n});',
            bad: '// No tests for UserService',
            explanation: 'Tests ensure code reliability and make refactoring safer',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'deployment-environment-config',
        name: 'Environment Configuration',
        description: 'Use environment variables for configuration, never hardcode',
        category: 'deployment',
        rule: 'Store configuration in environment variables, use config files for defaults',
        severity: 'error',
        examples: [
          {
            good: 'const dbUrl = process.env.DATABASE_URL || config.database.defaultUrl;',
            bad: 'const dbUrl = "postgresql://user:pass@localhost:5432/mydb";',
            explanation: 'Hardcoded values make it impossible to deploy to different environments',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }

    // Save default rules to file
    await this.saveDefaultRules(defaultRules);
  }

  /**
   * Save default rules to file
   */
  private async saveDefaultRules(rules: GlobalRule[]): Promise<void> {
    try {
      const filePath = path.join(this.rulesDirectory, 'default-rules.json');
      await fs.mkdir(this.rulesDirectory, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(rules, null, 2));
    } catch (error) {
      console.warn('Failed to save default rules:', error);
    }
  }

  /**
   * Check if rescan is needed
   */
  private shouldRescan(): boolean {
    return Date.now() - this.lastScanTime > this.SCAN_INTERVAL;
  }

  /**
   * List all rule resources
   */
  async listResources(): Promise<ResourceInfo[]> {
    if (this.shouldRescan()) {
      await this.scanRules();
    }

    return [
      {
        uri: 'context://rules/global',
        name: 'Global Rules Collection',
        description: 'Complete set of project rules and guidelines',
        mimeType: 'application/json',
        tags: ['rules', 'guidelines', 'standards'],
      },
      {
        uri: 'context://rules/coding',
        name: 'Coding Standards',
        description: 'Rules related to code quality and style',
        mimeType: 'text/markdown',
        tags: ['coding', 'standards', 'quality'],
      },
      {
        uri: 'context://rules/architecture',
        name: 'Architecture Guidelines',
        description: 'Rules for system design and architecture',
        mimeType: 'text/markdown',
        tags: ['architecture', 'design', 'patterns'],
      },
      {
        uri: 'context://rules/documentation',
        name: 'Documentation Standards',
        description: 'Rules for code and project documentation',
        mimeType: 'text/markdown',
        tags: ['documentation', 'comments', 'readme'],
      },
      {
        uri: 'context://rules/testing',
        name: 'Testing Guidelines',
        description: 'Rules for testing practices and coverage',
        mimeType: 'text/markdown',
        tags: ['testing', 'quality', 'coverage'],
      },
      {
        uri: 'context://rules/deployment',
        name: 'Deployment Standards',
        description: 'Rules for deployment and configuration',
        mimeType: 'text/markdown',
        tags: ['deployment', 'configuration', 'environment'],
      },
    ];
  }

  /**
   * Read rule resource
   */
  async readResource(path: string, params: Record<string, string>): Promise<ResourceContent> {
    if (this.shouldRescan()) {
      await this.scanRules();
    }

    const format = params.format || 'markdown';
    const language = params.language;
    const framework = params.framework;

    switch (path) {
      case 'global':
        return this.getGlobalRules(format, language, framework);
      case 'coding':
        return this.getRulesByCategory('coding', format, language, framework);
      case 'architecture':
        return this.getRulesByCategory('architecture', format, language, framework);
      case 'documentation':
        return this.getRulesByCategory('documentation', format, language, framework);
      case 'testing':
        return this.getRulesByCategory('testing', format, language, framework);
      case 'deployment':
        return this.getRulesByCategory('deployment', format, language, framework);
      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unknown rule resource: ${path}`);
    }
  }

  /**
   * Get all global rules
   */
  private async getGlobalRules(format: string, language?: string, framework?: string): Promise<ResourceContent> {
    let rules = Array.from(this.rules.values());

    // Filter by language and framework if specified
    if (language) {
      rules = rules.filter(rule =>
        !rule.applicableLanguages || rule.applicableLanguages.length === 0 || rule.applicableLanguages.includes(language)
      );
    }

    if (framework) {
      rules = rules.filter(rule =>
        !rule.applicableFrameworks || rule.applicableFrameworks.length === 0 || rule.applicableFrameworks.includes(framework)
      );
    }

    let content: string;
    let mimeType: string;

    switch (format.toLowerCase()) {
      case 'json':
        content = JSON.stringify({
          rules,
          totalCount: rules.length,
          categories: this.getUniqueCategories(),
          appliedFilters: { language, framework },
          generatedAt: new Date().toISOString(),
        }, null, 2);
        mimeType = 'application/json';
        break;

      case 'summary':
        content = this.generateRulesSummary(rules);
        mimeType = 'text/markdown';
        break;

      case 'checklist':
        content = this.generateRulesChecklist(rules);
        mimeType = 'text/markdown';
        break;

      case 'markdown':
      default:
        content = this.formatRulesAsMarkdown(rules);
        mimeType = 'text/markdown';
        break;
    }

    return {
      uri: 'context://rules/global',
      mimeType,
      text: content,
    };
  }

  /**
   * Get rules by category
   */
  private async getRulesByCategory(category: string, format: string, language?: string, framework?: string): Promise<ResourceContent> {
    let rules = Array.from(this.rules.values())
      .filter(rule => rule.category === category);

    // Apply filters
    if (language) {
      rules = rules.filter(rule =>
        !rule.applicableLanguages || rule.applicableLanguages.length === 0 || rule.applicableLanguages.includes(language)
      );
    }

    if (framework) {
      rules = rules.filter(rule =>
        !rule.applicableFrameworks || rule.applicableFrameworks.length === 0 || rule.applicableFrameworks.includes(framework)
      );
    }

    const content = this.formatRulesAsMarkdown(rules, category);

    return {
      uri: `context://rules/${category}`,
      mimeType: 'text/markdown',
      text: content,
    };
  }

  /**
   * Format rules as markdown
   */
  private formatRulesAsMarkdown(rules: GlobalRule[], category?: string): string {
    const title = category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Rules` : 'Global Rules';

    const sections = [
      `# ${title}\n`,
      `Found ${rules.length} rules`,
      `Last updated: ${new Date().toISOString().split('T')[0]}\n`,
    ];

    // Group by severity
    const bySeverity = rules.reduce((acc, rule) => {
      if (!acc[rule.severity]) acc[rule.severity] = [];
      acc[rule.severity].push(rule);
      return acc;
    }, {} as Record<string, GlobalRule[]>);

    const severityOrder = ['error', 'warning', 'info'];

    for (const severity of severityOrder) {
      const severityRules = bySeverity[severity];
      if (!severityRules || severityRules.length === 0) continue;

      const severityEmoji = severity === 'error' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
      sections.push(`## ${severityEmoji} ${severity.charAt(0).toUpperCase() + severity.slice(1)} Rules\n`);

      for (const rule of severityRules) {
        sections.push(`### ${rule.name}`);
        sections.push(`**Rule:** ${rule.rule}`);
        sections.push(`**Description:** ${rule.description}\n`);

        if (rule.applicableLanguages && rule.applicableLanguages.length > 0) {
          sections.push(`**Languages:** ${rule.applicableLanguages.join(', ')}`);
        }

        if (rule.applicableFrameworks && rule.applicableFrameworks.length > 0) {
          sections.push(`**Frameworks:** ${rule.applicableFrameworks.join(', ')}`);
        }

        if (rule.examples && rule.examples.length > 0) {
          sections.push('\n**Examples:**\n');

          for (const example of rule.examples) {
            sections.push('✅ **Good:**');
            sections.push('```');
            sections.push(example.good);
            sections.push('```\n');

            sections.push('❌ **Bad:**');
            sections.push('```');
            sections.push(example.bad);
            sections.push('```\n');

            sections.push(`💡 ${example.explanation}\n`);
          }
        }

        if (rule.references && rule.references.length > 0) {
          sections.push('**References:**');
          rule.references.forEach(ref => sections.push(`- ${ref}`));
          sections.push('');
        }

        sections.push('---\n');
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate rules summary
   */
  private generateRulesSummary(rules: GlobalRule[]): string {
    const bySeverity = rules.reduce((acc, rule) => {
      acc[rule.severity] = (acc[rule.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = rules.reduce((acc, rule) => {
      acc[rule.category] = (acc[rule.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return `# Rules Summary

## Overview
- **Total Rules:** ${rules.length}
- **Categories:** ${Object.keys(byCategory).length}
- **Languages Covered:** ${this.getApplicableLanguages(rules).length}

## By Severity
${Object.entries(bySeverity).map(([severity, count]) =>
  `- **${severity}:** ${count} rules`
).join('\n')}

## By Category
${Object.entries(byCategory).map(([category, count]) =>
  `- **${category}:** ${count} rules`
).join('\n')}

## Coverage
- **Languages:** ${this.getApplicableLanguages(rules).join(', ') || 'Language-agnostic'}
- **Frameworks:** ${this.getApplicableFrameworks(rules).join(', ') || 'Framework-agnostic'}

---
*Use format=checklist for a compliance checklist*`;
  }

  /**
   * Generate rules checklist
   */
  private generateRulesChecklist(rules: GlobalRule[]): string {
    const sections = [
      '# Rules Compliance Checklist\n',
      '*Check off each item as you review your code/project*\n',
    ];

    const bySeverity = rules.reduce((acc, rule) => {
      if (!acc[rule.severity]) acc[rule.severity] = [];
      acc[rule.severity].push(rule);
      return acc;
    }, {} as Record<string, GlobalRule[]>);

    const severityOrder = ['error', 'warning', 'info'];

    for (const severity of severityOrder) {
      const severityRules = bySeverity[severity];
      if (!severityRules || severityRules.length === 0) continue;

      const severityEmoji = severity === 'error' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
      sections.push(`## ${severityEmoji} ${severity.charAt(0).toUpperCase() + severity.slice(1)} Items\n`);

      for (const rule of severityRules) {
        sections.push(`- [ ] **${rule.name}**: ${rule.rule}`);
      }
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Get unique categories
   */
  private getUniqueCategories(): string[] {
    return Array.from(new Set(Array.from(this.rules.values()).map(rule => rule.category))).sort();
  }

  /**
   * Get applicable languages from rules
   */
  private getApplicableLanguages(rules: GlobalRule[]): string[] {
    const languages = new Set<string>();
    rules.forEach(rule => {
      if (rule.applicableLanguages) {
        rule.applicableLanguages.forEach(lang => languages.add(lang));
      }
    });
    return Array.from(languages).sort();
  }

  /**
   * Get applicable frameworks from rules
   */
  private getApplicableFrameworks(rules: GlobalRule[]): string[] {
    const frameworks = new Set<string>();
    rules.forEach(rule => {
      if (rule.applicableFrameworks) {
        rule.applicableFrameworks.forEach(fw => frameworks.add(fw));
      }
    });
    return Array.from(frameworks).sort();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.rulesDirectory);
      return this.rules.size > 0;
    } catch {
      return false;
    }
  }

  /**
   * Add a new rule
   */
  async addRule(rule: Omit<GlobalRule, 'createdAt' | 'updatedAt'>): Promise<GlobalRule> {
    const newRule: GlobalRule = {
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(newRule.id, newRule);

    // Save to file
    const filePath = path.join(this.rulesDirectory, 'custom-rules.json');
    const customRules = Array.from(this.rules.values())
      .filter(r => !['naming-camelcase-functions', 'architecture-single-responsibility', 'documentation-function-comments', 'testing-unit-coverage', 'deployment-environment-config'].includes(r.id));

    await fs.mkdir(this.rulesDirectory, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(customRules, null, 2));

    return newRule;
  }

  /**
   * Update a rule
   */
  async updateRule(id: string, updates: Partial<GlobalRule>): Promise<GlobalRule> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new McpError(ErrorCode.InvalidRequest, `Rule not found: ${id}`);
    }

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };

    this.rules.set(id, updatedRule);
    return updatedRule;
  }
}