import { ResourceHandler, ResourceInfo, ResourceContent } from '../types.js';
import { CodebasePattern, FileAnalysis, ProjectAnalysis } from '../../types/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from 'acorn';
import { simple as walkSimple } from 'acorn-walk';
import * as glob from 'fast-glob';

/**
 * Handler for codebase patterns by language
 * Provides access to patterns via context://patterns/{language}
 */
export class PatternsHandler implements ResourceHandler {
  private patternsCache: Map<string, CodebasePattern[]> = new Map();
  private analysisCache: Map<string, ProjectAnalysis> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * List available pattern resources
   */
  async listResources(): Promise<ResourceInfo[]> {
    const supportedLanguages = [
      'typescript', 'javascript', 'python', 'java', 'go', 'rust',
      'csharp', 'php', 'ruby', 'swift', 'kotlin', 'scala'
    ];

    return supportedLanguages.map(language => ({
      uri: `context://patterns/${language}`,
      name: `${language.charAt(0).toUpperCase() + language.slice(1)} Patterns`,
      description: `Codebase patterns and conventions for ${language} projects`,
      mimeType: 'application/json',
      tags: ['patterns', 'analysis', language],
    }));
  }

  /**
   * Read pattern resource for a specific language
   */
  async readResource(path: string, params: Record<string, string>): Promise<ResourceContent> {
    const language = path.toLowerCase();
    if (!language) {
      throw new McpError(ErrorCode.InvalidRequest, 'Language is required in the path');
    }

    const projectPath = params.project || process.cwd();
    const format = params.format || 'json';
    const includeExamples = params.examples !== 'false';

    try {
      const patterns = await this.analyzeProject(projectPath, language);
      let content: string;
      let mimeType: string;

      switch (format.toLowerCase()) {
        case 'markdown':
          content = this.formatPatternsAsMarkdown(language, patterns, includeExamples);
          mimeType = 'text/markdown';
          break;

        case 'summary':
          content = this.generatePatternSummary(language, patterns);
          mimeType = 'text/markdown';
          break;

        case 'recommendations':
          content = this.generateRecommendations(language, patterns);
          mimeType = 'text/markdown';
          break;

        case 'json':
        default:
          content = JSON.stringify({
            language,
            projectPath,
            patterns,
            generatedAt: new Date().toISOString(),
            totalPatterns: patterns.length,
          }, null, 2);
          mimeType = 'application/json';
          break;
      }

      return {
        uri: `context://patterns/${language}`,
        mimeType,
        text: content,
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to analyze patterns for ${language}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Analyze a project for patterns in the specified language
   */
  private async analyzeProject(projectPath: string, language: string): Promise<CodebasePattern[]> {
    const cacheKey = `${projectPath}:${language}`;

    // Check cache
    if (this.isCacheValid(cacheKey)) {
      const cached = this.patternsCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const fileExtensions = this.getFileExtensions(language);
      const files = await this.findProjectFiles(projectPath, fileExtensions);

      if (files.length === 0) {
        return [];
      }

      const patterns: CodebasePattern[] = [];
      const fileAnalyses: FileAnalysis[] = [];

      // Analyze each file
      for (const filePath of files.slice(0, 50)) { // Limit to prevent overload
        try {
          const analysis = await this.analyzeFile(filePath, language);
          if (analysis) {
            fileAnalyses.push(analysis);
            patterns.push(...analysis.patterns);
          }
        } catch (error) {
          console.warn(`Failed to analyze file ${filePath}:`, error);
        }
      }

      // Extract project-level patterns
      const projectPatterns = this.extractProjectPatterns(fileAnalyses, language);
      patterns.push(...projectPatterns);

      // Deduplicate and sort by confidence
      const uniquePatterns = this.deduplicatePatterns(patterns);

      // Cache the results
      this.patternsCache.set(cacheKey, uniquePatterns);
      this.cacheTimestamps.set(cacheKey, Date.now());

      return uniquePatterns;
    } catch (error) {
      throw new Error(`Project analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file extensions for a language
   */
  private getFileExtensions(language: string): string[] {
    const extensionMap: { [key: string]: string[] } = {
      typescript: ['.ts', '.tsx'],
      javascript: ['.js', '.jsx', '.mjs'],
      python: ['.py', '.pyx', '.pyi'],
      java: ['.java'],
      go: ['.go'],
      rust: ['.rs'],
      csharp: ['.cs'],
      php: ['.php'],
      ruby: ['.rb'],
      swift: ['.swift'],
      kotlin: ['.kt', '.kts'],
      scala: ['.scala'],
    };

    return extensionMap[language] || [];
  }

  /**
   * Find project files with specified extensions
   */
  private async findProjectFiles(projectPath: string, extensions: string[]): Promise<string[]> {
    const patterns = extensions.map(ext => `**/*${ext}`);

    return await glob.glob(patterns, {
      cwd: projectPath,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/vendor/**',
        '**/target/**',
        '**/__pycache__/**',
      ],
    });
  }

  /**
   * Analyze a single file for patterns
   */
  private async analyzeFile(filePath: string, language: string): Promise<FileAnalysis | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(process.cwd(), filePath);

      const analysis: FileAnalysis = {
        path: relativePath,
        language,
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        patterns: [],
        metrics: {
          linesOfCode: content.split('\n').length,
          cyclomaticComplexity: 1,
          maintainabilityIndex: 100,
        },
      };

      // Language-specific analysis
      switch (language) {
        case 'typescript':
        case 'javascript':
          this.analyzeJavaScriptFile(content, analysis);
          break;
        case 'python':
          this.analyzePythonFile(content, analysis);
          break;
        default:
          this.analyzeGenericFile(content, analysis);
      }

      // Extract patterns from analysis
      analysis.patterns = this.extractFilePatterns(analysis, content);

      return analysis;
    } catch (error) {
      console.warn(`Failed to analyze file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Analyze JavaScript/TypeScript file
   */
  private analyzeJavaScriptFile(content: string, analysis: FileAnalysis): void {
    try {
      const ast = parse(content, {
        ecmaVersion: 2022,
        sourceType: 'module',
      }) as any;

      walkSimple(ast, {
        ImportDeclaration: (node: any) => {
          analysis.imports.push(node.source.value);
        },
        ExportNamedDeclaration: (node: any) => {
          if (node.declaration && node.declaration.id) {
            analysis.exports.push(node.declaration.id.name);
          }
        },
        FunctionDeclaration: (node: any) => {
          analysis.functions.push({
            name: node.id?.name || 'anonymous',
            parameters: node.params.map((p: any) => p.name || 'param'),
            returnType: undefined, // Would need TypeScript parser for this
            isAsync: node.async || false,
            complexity: 1, // Simplified
          });
        },
        ClassDeclaration: (node: any) => {
          const methods = node.body.body
            .filter((n: any) => n.type === 'MethodDefinition')
            .map((n: any) => n.key.name);

          analysis.classes.push({
            name: node.id?.name || 'anonymous',
            methods,
            properties: [],
            inheritance: undefined,
          });
        },
      });

      // Detect framework
      if (analysis.imports.some(imp => imp.includes('react'))) {
        analysis.framework = 'React';
      } else if (analysis.imports.some(imp => imp.includes('vue'))) {
        analysis.framework = 'Vue';
      } else if (analysis.imports.some(imp => imp.includes('angular'))) {
        analysis.framework = 'Angular';
      } else if (analysis.imports.some(imp => imp.includes('express'))) {
        analysis.framework = 'Express';
      }
    } catch (error) {
      // Fallback to regex analysis
      this.analyzeGenericFile(content, analysis);
    }
  }

  /**
   * Analyze Python file
   */
  private analyzePythonFile(content: string, analysis: FileAnalysis): void {
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Imports
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        const match = trimmed.match(/from\s+(\S+)|import\s+(\S+)/);
        if (match) {
          analysis.imports.push(match[1] || match[2]);
        }
      }

      // Functions
      if (trimmed.startsWith('def ')) {
        const match = trimmed.match(/def\s+(\w+)\s*\(/);
        if (match) {
          analysis.functions.push({
            name: match[1],
            parameters: [],
            isAsync: trimmed.includes('async def'),
            complexity: 1,
          });
        }
      }

      // Classes
      if (trimmed.startsWith('class ')) {
        const match = trimmed.match(/class\s+(\w+)/);
        if (match) {
          analysis.classes.push({
            name: match[1],
            methods: [],
            properties: [],
          });
        }
      }
    }

    // Detect framework
    if (analysis.imports.some(imp => imp.includes('django'))) {
      analysis.framework = 'Django';
    } else if (analysis.imports.some(imp => imp.includes('flask'))) {
      analysis.framework = 'Flask';
    } else if (analysis.imports.some(imp => imp.includes('fastapi'))) {
      analysis.framework = 'FastAPI';
    }
  }

  /**
   * Generic file analysis using regex patterns
   */
  private analyzeGenericFile(content: string, analysis: FileAnalysis): void {
    // Basic pattern matching for imports, functions, classes
    const importMatches = content.match(/(?:import|require|include|use)\s+['"]\S+['"]|(?:import|require|include|use)\s+\S+/g);
    if (importMatches) {
      analysis.imports = importMatches.map(match => match.replace(/(?:import|require|include|use)\s+['"]?(\S+?)['"]?.*/, '$1'));
    }

    const functionMatches = content.match(/(?:function|def|func|fn)\s+(\w+)|(\w+)\s*(?:=|:)\s*(?:function|=>|\([^)]*\)\s*=>)/g);
    if (functionMatches) {
      analysis.functions = functionMatches.map(match => ({
        name: match.replace(/(?:function|def|func|fn)\s+(\w+).*/, '$1'),
        parameters: [],
        isAsync: false,
        complexity: 1,
      }));
    }

    const classMatches = content.match(/(?:class|struct|interface)\s+(\w+)/g);
    if (classMatches) {
      analysis.classes = classMatches.map(match => ({
        name: match.replace(/(?:class|struct|interface)\s+(\w+).*/, '$1'),
        methods: [],
        properties: [],
      }));
    }
  }

  /**
   * Extract patterns from file analysis
   */
  private extractFilePatterns(analysis: FileAnalysis, content: string): CodebasePattern[] {
    const patterns: CodebasePattern[] = [];

    // Naming convention patterns
    if (analysis.functions.length > 0) {
      const namingStyle = this.detectNamingStyle(analysis.functions.map(f => f.name));
      patterns.push({
        id: `naming-functions-${analysis.path}`,
        name: 'Function Naming Convention',
        description: `Functions use ${namingStyle} naming convention`,
        type: 'naming',
        confidence: 0.8,
        examples: [{
          file: analysis.path,
          snippet: analysis.functions.slice(0, 3).map(f => f.name).join(', '),
          lineStart: 1,
          lineEnd: 1,
        }],
      });
    }

    // Framework patterns
    if (analysis.framework) {
      patterns.push({
        id: `framework-${analysis.framework.toLowerCase()}-${analysis.path}`,
        name: `${analysis.framework} Framework Usage`,
        description: `File uses ${analysis.framework} framework patterns`,
        type: 'framework',
        confidence: 0.9,
        examples: [{
          file: analysis.path,
          snippet: analysis.imports.filter(imp => imp.toLowerCase().includes(analysis.framework!.toLowerCase())).join(', '),
          lineStart: 1,
          lineEnd: 1,
        }],
      });
    }

    // Import patterns
    if (analysis.imports.length > 0) {
      const relativeImports = analysis.imports.filter(imp => imp.startsWith('.'));
      const externalImports = analysis.imports.filter(imp => !imp.startsWith('.') && !imp.startsWith('/'));

      if (relativeImports.length > 0) {
        patterns.push({
          id: `imports-relative-${analysis.path}`,
          name: 'Relative Import Pattern',
          description: 'Uses relative imports for local modules',
          type: 'structure',
          confidence: 0.7,
          examples: [{
            file: analysis.path,
            snippet: relativeImports.slice(0, 3).join(', '),
            lineStart: 1,
            lineEnd: 1,
          }],
        });
      }
    }

    return patterns;
  }

  /**
   * Extract project-level patterns from file analyses
   */
  private extractProjectPatterns(fileAnalyses: FileAnalysis[], language: string): CodebasePattern[] {
    const patterns: CodebasePattern[] = [];

    // Directory structure pattern
    const directories = Array.from(new Set(
      fileAnalyses.map(analysis => path.dirname(analysis.path))
    ));

    if (directories.some(dir => dir.includes('components') || dir.includes('views'))) {
      patterns.push({
        id: `structure-component-based`,
        name: 'Component-Based Architecture',
        description: 'Project uses component-based directory structure',
        type: 'architectural',
        confidence: 0.8,
        examples: [{
          file: 'project structure',
          snippet: directories.filter(dir => dir.includes('component') || dir.includes('view')).join(', '),
          lineStart: 1,
          lineEnd: 1,
        }],
        recommendations: ['Consider organizing components by feature rather than type'],
      });
    }

    // Framework consistency
    const frameworks = fileAnalyses
      .map(analysis => analysis.framework)
      .filter(Boolean) as string[];

    if (frameworks.length > 0) {
      const frameworkCounts = frameworks.reduce((acc, fw) => {
        acc[fw] = (acc[fw] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const primaryFramework = Object.entries(frameworkCounts)
        .sort(([,a], [,b]) => b - a)[0][0];

      patterns.push({
        id: `consistency-framework-${primaryFramework.toLowerCase()}`,
        name: 'Framework Consistency',
        description: `Project primarily uses ${primaryFramework} (${frameworkCounts[primaryFramework]} files)`,
        type: 'framework',
        confidence: 0.9,
        examples: [{
          file: 'project-wide',
          snippet: `${primaryFramework}: ${frameworkCounts[primaryFramework]} files`,
          lineStart: 1,
          lineEnd: 1,
        }],
      });
    }

    return patterns;
  }

  /**
   * Detect naming style from function names
   */
  private detectNamingStyle(names: string[]): string {
    if (names.length === 0) return 'unknown';

    const camelCase = names.filter(name => /^[a-z][a-zA-Z0-9]*$/.test(name)).length;
    const snakeCase = names.filter(name => /^[a-z][a-z0-9_]*$/.test(name)).length;
    const kebabCase = names.filter(name => /^[a-z][a-z0-9-]*$/.test(name)).length;

    if (camelCase > snakeCase && camelCase > kebabCase) return 'camelCase';
    if (snakeCase > camelCase && snakeCase > kebabCase) return 'snake_case';
    if (kebabCase > camelCase && kebabCase > snakeCase) return 'kebab-case';

    return 'mixed';
  }

  /**
   * Deduplicate patterns by ID and merge similar ones
   */
  private deduplicatePatterns(patterns: CodebasePattern[]): CodebasePattern[] {
    const patternMap = new Map<string, CodebasePattern>();

    for (const pattern of patterns) {
      const existing = patternMap.get(pattern.id);
      if (existing) {
        // Merge examples
        existing.examples.push(...pattern.examples);
        existing.confidence = Math.max(existing.confidence, pattern.confidence);
      } else {
        patternMap.set(pattern.id, { ...pattern });
      }
    }

    return Array.from(patternMap.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Format patterns as markdown
   */
  private formatPatternsAsMarkdown(language: string, patterns: CodebasePattern[], includeExamples: boolean): string {
    const sections = [
      `# ${language.charAt(0).toUpperCase() + language.slice(1)} Codebase Patterns\n`,
      `Generated on: ${new Date().toISOString().split('T')[0]}`,
      `Total patterns found: ${patterns.length}\n`,
    ];

    const patternsByType = patterns.reduce((acc, pattern) => {
      if (!acc[pattern.type]) acc[pattern.type] = [];
      acc[pattern.type].push(pattern);
      return acc;
    }, {} as Record<string, CodebasePattern[]>);

    for (const [type, typePatterns] of Object.entries(patternsByType)) {
      sections.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)} Patterns\n`);

      for (const pattern of typePatterns) {
        sections.push(`### ${pattern.name}`);
        sections.push(`**Confidence:** ${(pattern.confidence * 100).toFixed(1)}%`);
        sections.push(`**Description:** ${pattern.description}\n`);

        if (includeExamples && pattern.examples.length > 0) {
          sections.push('**Examples:**');
          for (const example of pattern.examples.slice(0, 3)) {
            sections.push(`- ${example.file}: \`${example.snippet}\``);
          }
          sections.push('');
        }

        if (pattern.recommendations) {
          sections.push('**Recommendations:**');
          pattern.recommendations.forEach(rec => sections.push(`- ${rec}`));
          sections.push('');
        }
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate pattern summary
   */
  private generatePatternSummary(language: string, patterns: CodebasePattern[]): string {
    const typeCount = patterns.reduce((acc, pattern) => {
      acc[pattern.type] = (acc[pattern.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const highConfidencePatterns = patterns.filter(p => p.confidence > 0.8);

    return `# ${language} Pattern Summary

## Overview
- **Total Patterns:** ${patterns.length}
- **High Confidence Patterns:** ${highConfidencePatterns.length}
- **Pattern Types:** ${Object.keys(typeCount).join(', ')}

## Pattern Distribution
${Object.entries(typeCount).map(([type, count]) => `- **${type}:** ${count} patterns`).join('\n')}

## Key Insights
${highConfidencePatterns.slice(0, 5).map(p => `- ${p.name}: ${p.description}`).join('\n')}

---
*Analysis covers ${patterns.reduce((acc, p) => acc + p.examples.length, 0)} code examples*`;
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(language: string, patterns: CodebasePattern[]): string {
    const allRecommendations = patterns
      .filter(p => p.recommendations && p.recommendations.length > 0)
      .flatMap(p => p.recommendations!);

    const uniqueRecommendations = Array.from(new Set(allRecommendations));

    return `# ${language} Recommendations

## Code Quality Improvements
${uniqueRecommendations.map(rec => `- ${rec}`).join('\n')}

## Pattern-Based Suggestions
- Consider standardizing naming conventions across the codebase
- Look for opportunities to extract common patterns into utilities
- Review architectural patterns for consistency
- Consider adding linting rules to enforce discovered conventions

---
*Based on analysis of ${patterns.length} patterns*`;
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    return timestamp ? (Date.now() - timestamp) < this.CACHE_TTL : false;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return true; // This handler doesn't depend on external resources
  }
}