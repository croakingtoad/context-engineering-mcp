import * as fs from 'fs';
import * as path from 'path';
// import { parse } from '@typescript-eslint/typescript-estree';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import * as glob from 'fast-glob';
import * as ignoreLib from 'ignore';
import {
  ProjectAnalysis,
  FileAnalysis,
  CodebasePattern,
} from '../types/index.js';

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  main?: string;
  type?: string;
}

export class CodebaseAnalyzer {
  private ignorePatterns: string[] = [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    '**/*.min.js',
    '**/*.map',
    'coverage/**',
    '.nyc_output/**',
    'logs/**',
    '*.log',
  ];

  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    const absolutePath = path.resolve(projectPath);

    // Read package.json for project metadata
    const packageJson = await this.readPackageJson(absolutePath);
    const language = await this.detectPrimaryLanguage(absolutePath);
    const frameworks = await this.identifyFrameworks(absolutePath);

    // Get all relevant files
    const files = await this.getProjectFiles(absolutePath);

    // Analyze each file
    const fileAnalyses: FileAnalysis[] = [];
    for (const file of files.slice(0, 50)) { // Limit to first 50 files for performance
      try {
        const analysis = await this.analyzeFile(file);
        fileAnalyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze file ${file}:`, error);
      }
    }

    // Detect architectural patterns
    const patterns = await this.detectPatterns(absolutePath);

    // Analyze conventions
    const conventions = this.analyzeConventions(fileAnalyses);

    // Generate recommendations
    const recommendations = this.generateRecommendations(fileAnalyses, patterns, conventions);

    return {
      rootPath: absolutePath,
      language,
      framework: frameworks.length > 0 ? frameworks.join(', ') : undefined,
      architecture: this.inferArchitecture(fileAnalyses, patterns),
      dependencies: packageJson?.dependencies || {},
      devDependencies: packageJson?.devDependencies || {},
      fileAnalyses,
      patterns,
      conventions,
      recommendations,
      generatedAt: new Date(),
    };
  }

  async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const absolutePath = path.resolve(filePath);
    const content = await fs.promises.readFile(absolutePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), absolutePath);
    const language = this.detectFileLanguage(absolutePath);

    let analysis: FileAnalysis = {
      path: relativePath,
      language,
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      patterns: [],
      metrics: {
        linesOfCode: content.split('\n').length,
        cyclomaticComplexity: 0,
        maintainabilityIndex: 0,
      },
    };

    try {
      if (language === 'typescript' || language === 'javascript') {
        analysis = await this.analyzeJavaScriptFile(absolutePath, content, analysis);
      } else if (language === 'python') {
        analysis = await this.analyzePythonFile(absolutePath, content, analysis);
      }

      // Detect framework usage
      analysis.framework = this.detectFileFramework(content, analysis.imports);

      // Detect patterns in the file
      analysis.patterns = this.detectFilePatterns(content, analysis);

      // Calculate complexity metrics
      analysis.metrics = this.calculateMetrics(content, analysis);

    } catch (error) {
      console.warn(`Failed to parse file ${filePath}:`, error);
    }

    return analysis;
  }

  async detectPatterns(projectPath: string): Promise<CodebasePattern[]> {
    const patterns: CodebasePattern[] = [];
    const files = await this.getProjectFiles(projectPath);

    // Analyze file structure for patterns
    const structurePatterns = this.detectStructuralPatterns(files);
    patterns.push(...structurePatterns);

    // Analyze code for design patterns
    const designPatterns = await this.detectDesignPatterns(files.slice(0, 20));
    patterns.push(...designPatterns);

    // Analyze for architectural patterns
    const archPatterns = await this.detectArchitecturalPatterns(projectPath, files);
    patterns.push(...archPatterns);

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  async identifyFrameworks(projectPath: string): Promise<string[]> {
    const frameworks: string[] = [];

    try {
      const packageJson = await this.readPackageJson(projectPath);
      if (!packageJson) return frameworks;

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for common frameworks
      const frameworkMap: Record<string, string[]> = {
        'react': ['react', '@types/react'],
        'vue': ['vue', '@vue/cli'],
        'angular': ['@angular/core', '@angular/cli'],
        'express': ['express', '@types/express'],
        'nestjs': ['@nestjs/core', '@nestjs/common'],
        'fastify': ['fastify'],
        'next': ['next'],
        'nuxt': ['nuxt'],
        'svelte': ['svelte'],
        'zod': ['zod'],
        'joi': ['joi'],
        'mongoose': ['mongoose'],
        'prisma': ['prisma', '@prisma/client'],
        'typeorm': ['typeorm'],
        'jest': ['jest'],
        'vitest': ['vitest'],
        'cypress': ['cypress'],
        'playwright': ['playwright'],
      };

      for (const [framework, deps] of Object.entries(frameworkMap)) {
        if (deps.some(dep => allDeps[dep])) {
          frameworks.push(framework);
        }
      }

    } catch (error) {
      console.warn('Failed to identify frameworks:', error);
    }

    return frameworks;
  }

  private async readPackageJson(projectPath: string): Promise<PackageJson | null> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
      return JSON.parse(content) as PackageJson;
    } catch {
      return null;
    }
  }

  private async detectPrimaryLanguage(projectPath: string): Promise<string> {
    const files = await this.getProjectFiles(projectPath);
    const extensionCounts: Record<string, number> = {};

    for (const file of files) {
      const ext = path.extname(file);
      extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
    }

    // Also check for TypeScript config files
    const hasTypeScriptConfig = files.some(f =>
      f.endsWith('tsconfig.json') ||
      f.endsWith('package.json') && f.includes('typescript')
    );

    const sortedExtensions = Object.entries(extensionCounts)
      .sort(([, a], [, b]) => b - a);

    if (sortedExtensions.length === 0) return 'unknown';

    const primaryExtension = sortedExtensions[0][0];

    // Prefer TypeScript if we have TypeScript files or config
    if (hasTypeScriptConfig || primaryExtension === '.ts' || primaryExtension === '.tsx') {
      return 'typescript';
    }

    switch (primaryExtension) {
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.js':
      case '.jsx':
        return 'javascript';
      case '.py':
        return 'python';
      case '.java':
        return 'java';
      case '.go':
        return 'go';
      case '.rs':
        return 'rust';
      case '.cpp':
      case '.cc':
      case '.cxx':
        return 'cpp';
      case '.c':
        return 'c';
      case '.cs':
        return 'csharp';
      case '.php':
        return 'php';
      case '.rb':
        return 'ruby';
      default:
        return 'unknown';
    }
  }

  private async getProjectFiles(projectPath: string): Promise<string[]> {
    const ig = ignoreLib.default().add(this.ignorePatterns);

    const patterns = [
      '**/*.{ts,tsx,js,jsx,py,java,go,rs,cpp,c,cs,php,rb}',
      '**/package.json',
      '**/tsconfig.json',
      '**/pyproject.toml',
      '**/setup.py',
      '**/go.mod',
      '**/Cargo.toml',
    ];

    const files = await glob.default(patterns, {
      cwd: projectPath,
      absolute: true,
      ignore: this.ignorePatterns,
    });

    return files.filter(file => {
      const relativePath = path.relative(projectPath, file);
      return !ig.ignores(relativePath);
    });
  }

  private detectFileLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.js':
      case '.jsx':
        return 'javascript';
      case '.py':
        return 'python';
      case '.java':
        return 'java';
      case '.go':
        return 'go';
      default:
        return 'unknown';
    }
  }

  private async analyzeJavaScriptFile(
    filePath: string,
    content: string,
    analysis: FileAnalysis
  ): Promise<FileAnalysis> {
    try {
      const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

      // For TypeScript files, use regex-based parsing as fallback
      if (isTypeScript) {
        return this.parseTypeScriptWithRegex(content, analysis);
      }

      // Skip files with shebangs (Node.js scripts)
      const cleanContent = content.startsWith('#!')
        ? content.split('\n').slice(1).join('\n')
        : content;

      // Use acorn parser for JavaScript files
      const ast = acorn.parse(cleanContent, {
        ecmaVersion: 2020,
        sourceType: 'module',
        locations: true,
      });

      const imports: string[] = [];
      const exports: string[] = [];
      const functions: any[] = [];
      const classes: any[] = [];

      this.walkJavaScriptAST(ast as any, {
        imports,
        exports,
        functions,
        classes,
      });

      return {
        ...analysis,
        imports,
        exports,
        functions,
        classes,
      };
    } catch (error) {
      console.warn(`Failed to parse JavaScript/TypeScript file ${filePath}:`, error);
      return analysis;
    }
  }

  private parseTypeScriptWithRegex(content: string, analysis: FileAnalysis): FileAnalysis {
    // Parse imports
    const imports = this.extractTypeScriptImports(content);

    // Parse exports
    const exports = this.extractTypeScriptExports(content);

    // Parse classes
    const classes = this.extractTypeScriptClasses(content);

    // Parse functions
    const functions = this.extractTypeScriptFunctions(content);

    return {
      ...analysis,
      imports,
      exports,
      functions,
      classes,
    };
  }

  private extractTypeScriptImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private extractTypeScriptExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  private extractTypeScriptClasses(content: string): Array<{ name: string; methods: string[]; properties: string[]; }> {
    const classes: Array<{ name: string; methods: string[]; properties: string[]; }> = [];
    const classRegex = /class\s+(\w+)[\s\S]*?\{([\s\S]*?)\n\s*\}/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const classBody = match[2];

      const methods = this.extractClassMethods(classBody);
      const properties = this.extractClassProperties(classBody);

      classes.push({
        name: className,
        methods,
        properties,
      });
    }

    return classes;
  }

  private extractClassMethods(classBody: string): string[] {
    const methods: string[] = [];
    const methodRegex = /(?:public|private|protected)?\s*(?:static)?\s*(?:async)?\s*(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/g;
    let match;

    while ((match = methodRegex.exec(classBody)) !== null) {
      const methodName = match[1];
      if (methodName !== 'constructor') {
        methods.push(methodName);
      }
    }

    return methods;
  }

  private extractClassProperties(classBody: string): string[] {
    const properties: string[] = [];
    const propertyRegex = /(?:public|private|protected)?\s*(?:static)?\s*(?:readonly)?\s*(\w+)\s*[:=]/g;
    let match;

    while ((match = propertyRegex.exec(classBody)) !== null) {
      properties.push(match[1]);
    }

    return properties;
  }

  private extractTypeScriptFunctions(content: string): Array<{ name: string; parameters: string[]; isAsync: boolean; complexity: number; }> {
    const functions: Array<{ name: string; parameters: string[]; isAsync: boolean; complexity: number; }> = [];

    // Regular functions
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      const paramsString = match[2];
      const parameters = paramsString.split(',').map(p => p.trim().split(':')[0].trim()).filter(p => p);
      const isAsync = content.substring(match.index - 10, match.index).includes('async');

      functions.push({
        name: functionName,
        parameters,
        isAsync,
        complexity: 1,
      });
    }

    // Class methods (including constructor)
    const methodRegex = /(?:public|private|protected)?\s*(?:static)?\s*(?:async)?\s*(\w+)\s*\(([^)]*)\)\s*(?::\s*[\w<>[\]|]+)?\s*\{/g;

    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      const paramsString = match[2];
      const parameters = paramsString.split(',').map(p => p.trim().split(':')[0].trim()).filter(p => p);
      const isAsync = content.substring(match.index - 10, match.index).includes('async');

      functions.push({
        name: methodName,
        parameters,
        isAsync,
        complexity: 1,
      });
    }

    return functions;
  }

  private async analyzePythonFile(
    filePath: string,
    content: string,
    analysis: FileAnalysis
  ): Promise<FileAnalysis> {
    // Basic Python analysis - would need a Python AST parser for full analysis
    const imports = this.extractPythonImports(content);
    const functions = this.extractPythonFunctions(content);
    const classes = this.extractPythonClasses(content);

    return {
      ...analysis,
      imports,
      functions,
      classes,
    };
  }

  private walkTypeScriptAST(ast: any, context: any): void {
    // Use acorn-walk to traverse the AST
    walk.simple(ast, {
      ImportDeclaration: (node: any) => {
        if (node.source?.value) {
          context.imports.push(node.source.value);
        }
      },
      ExportDefaultDeclaration: (node: any) => {
        if (node.declaration?.name) {
          context.exports.push(node.declaration.name);
        } else if (node.declaration?.type === 'Identifier') {
          context.exports.push(node.declaration.name);
        }
      },
      ExportNamedDeclaration: (node: any) => {
        if (node.declaration) {
          if (node.declaration.id?.name) {
            context.exports.push(node.declaration.id.name);
          }
          if (node.declaration.declarations) {
            for (const decl of node.declaration.declarations) {
              if (decl.id?.name) {
                context.exports.push(decl.id.name);
              }
            }
          }
        }
        if (node.specifiers) {
          for (const spec of node.specifiers) {
            if (spec.exported?.name) {
              context.exports.push(spec.exported.name);
            }
          }
        }
      },
      FunctionDeclaration: (node: any) => {
        if (node.id?.name) {
          context.functions.push({
            name: node.id.name,
            parameters: node.params?.map((p: any) => p.name || p.pattern?.name || 'anonymous') || [],
            isAsync: node.async || false,
            complexity: 1,
          });
        }
      },
      ClassDeclaration: (node: any) => {
        if (node.id?.name) {
          const methods: string[] = [];
          const properties: string[] = [];

          if (node.body?.body) {
            for (const member of node.body.body) {
              if (member.type === 'MethodDefinition' && member.key?.name) {
                methods.push(member.key.name);
              } else if (member.type === 'PropertyDefinition' && member.key?.name) {
                properties.push(member.key.name);
              }
            }
          }

          context.classes.push({
            name: node.id.name,
            methods,
            properties,
          });
        }
      },
    });
  }

  private walkJavaScriptAST(ast: any, context: any): void {
    walk.simple(ast, {
      ImportDeclaration(node: any) {
        if (node.source?.value) {
          context.imports.push(node.source.value);
        }
      },
      ExportDefaultDeclaration(node: any) {
        if (node.declaration?.name) {
          context.exports.push(node.declaration.name);
        }
      },
      ExportNamedDeclaration(node: any) {
        if (node.declaration?.name) {
          context.exports.push(node.declaration.name);
        }
      },
      FunctionDeclaration(node: any) {
        if (node.id?.name) {
          context.functions.push({
            name: node.id.name,
            parameters: node.params?.map((p: any) => p.name || 'anonymous') || [],
            isAsync: node.async || false,
            complexity: 1,
          });
        }
      },
      ClassDeclaration(node: any) {
        if (node.id?.name) {
          context.classes.push({
            name: node.id.name,
            methods: [],
            properties: [],
          });
        }
      },
    });
  }

  private extractPythonImports(content: string): string[] {
    const imports: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ')) {
        const module = trimmed.replace('import ', '').split(' as ')[0].split(',')[0].trim();
        imports.push(module);
      } else if (trimmed.startsWith('from ')) {
        const match = trimmed.match(/from\s+(\S+)/);
        if (match) {
          imports.push(match[1]);
        }
      }
    }

    return imports;
  }

  private extractPythonFunctions(content: string): any[] {
    const functions: any[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/def\s+(\w+)\s*\(([^)]*)\)/);
      if (match) {
        const name = match[1];
        const params = match[2].split(',').map(p => p.trim()).filter(p => p);
        functions.push({
          name,
          parameters: params,
          isAsync: trimmed.startsWith('async def'),
          complexity: 1,
        });
      }
    }

    return functions;
  }

  private extractPythonClasses(content: string): any[] {
    const classes: any[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/class\s+(\w+)/);
      if (match) {
        classes.push({
          name: match[1],
          methods: [],
          properties: [],
        });
      }
    }

    return classes;
  }

  private detectFileFramework(content: string, imports: string[]): string | undefined {
    if (imports.some(imp => imp.includes('react'))) return 'react';
    if (imports.some(imp => imp.includes('vue'))) return 'vue';
    if (imports.some(imp => imp.includes('angular'))) return 'angular';
    if (imports.some(imp => imp.includes('express'))) return 'express';
    if (imports.some(imp => imp.includes('fastify'))) return 'fastify';
    if (imports.some(imp => imp.includes('nestjs'))) return 'nestjs';

    return undefined;
  }

  private detectFilePatterns(content: string, analysis: FileAnalysis): CodebasePattern[] {
    const patterns: CodebasePattern[] = [];

    // Detect common patterns
    if (analysis.classes.some(c => c.name.endsWith('Service'))) {
      patterns.push({
        id: 'service-pattern',
        name: 'Service Pattern',
        description: 'Service class detected',
        type: 'design',
        confidence: 0.8,
        examples: [{
          file: analysis.path,
          snippet: 'Service class pattern',
          lineStart: 1,
          lineEnd: 1,
        }],
      });
    }

    if (analysis.functions.some(f => f.name.startsWith('use'))) {
      patterns.push({
        id: 'react-hooks',
        name: 'React Hooks',
        description: 'React hooks pattern detected',
        type: 'framework',
        confidence: 0.9,
        examples: [{
          file: analysis.path,
          snippet: 'React hooks usage',
          lineStart: 1,
          lineEnd: 1,
        }],
      });
    }

    return patterns;
  }

  private calculateMetrics(content: string, analysis: FileAnalysis): FileAnalysis['metrics'] {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);

    // Simplified complexity calculation
    let complexity = 1; // Base complexity
    const complexityKeywords = ['if', 'else', 'for', 'while', 'case', 'catch', 'throw'];

    for (const line of lines) {
      for (const keyword of complexityKeywords) {
        if (line.includes(keyword)) {
          complexity++;
        }
      }
    }

    // Simplified maintainability index (0-100 scale)
    const avgLineLength = nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / nonEmptyLines.length || 0;
    const maintainabilityIndex = Math.max(0, Math.min(100, 100 - (complexity * 2) - (avgLineLength / 10)));

    return {
      linesOfCode: nonEmptyLines.length,
      cyclomaticComplexity: complexity,
      maintainabilityIndex: Math.round(maintainabilityIndex),
    };
  }

  private detectStructuralPatterns(files: string[]): CodebasePattern[] {
    const patterns: CodebasePattern[] = [];

    // Check for common directory structures
    const hasComponents = files.some(f => f.includes('/components/'));
    const hasServices = files.some(f => f.includes('/services/'));
    const hasUtils = files.some(f => f.includes('/utils/'));
    const hasHooks = files.some(f => f.includes('/hooks/'));

    if (hasComponents) {
      patterns.push({
        id: 'component-structure',
        name: 'Component-based Architecture',
        description: 'Organized component structure detected',
        type: 'structure',
        confidence: 0.9,
        examples: [{
          file: 'Directory structure',
          snippet: '/components/ directory found',
          lineStart: 1,
          lineEnd: 1,
        }],
        recommendations: ['Consider organizing components by feature', 'Use barrel exports for cleaner imports'],
      });
    }

    if (hasServices) {
      patterns.push({
        id: 'service-layer',
        name: 'Service Layer',
        description: 'Service layer architecture detected',
        type: 'architectural',
        confidence: 0.8,
        examples: [{
          file: 'Directory structure',
          snippet: '/services/ directory found',
          lineStart: 1,
          lineEnd: 1,
        }],
        recommendations: ['Consider dependency injection', 'Use interfaces for service contracts'],
      });
    }

    return patterns;
  }

  private async detectDesignPatterns(files: string[]): Promise<CodebasePattern[]> {
    const patterns: CodebasePattern[] = [];

    // Detect Schema Validation pattern
    let hasSchemaValidation = false;
    let validationScore = 0;

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');

        // Check for schema validation libraries
        if (content.includes('zod') || content.includes('joi') || content.includes('ajv') || content.includes('yup')) {
          hasSchemaValidation = true;
          validationScore += 0.3;
        }

        // Check for schema definitions
        if (content.includes('.schema(') || content.includes('z.object') || content.includes('Joi.object') || content.includes('yup.object')) {
          validationScore += 0.4;
        }

        // Check for validation calls
        if (content.includes('.validate(') || content.includes('.safeParse(') || content.includes('.parse(')) {
          validationScore += 0.3;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    if (hasSchemaValidation && validationScore > 0.6) {
      patterns.push({
        id: 'schema-validation',
        name: 'Schema Validation',
        description: 'Schema validation pattern detected with validation libraries',
        type: 'design',
        confidence: Math.min(validationScore, 1.0),
        examples: files.filter(f => f.includes('schema') || f.includes('validation')).map(f => ({
          file: f,
          snippet: 'Schema validation detected',
          lineStart: 1,
          lineEnd: 1,
        })),
      });
    }

    return patterns;
  }

  private async detectArchitecturalPatterns(projectPath: string, files: string[]): Promise<CodebasePattern[]> {
    const patterns: CodebasePattern[] = [];

    // Check for MVC pattern
    const hasModels = files.some(f => f.includes('/models/') || f.includes('/model/'));
    const hasViews = files.some(f => f.includes('/views/') || f.includes('/view/'));
    const hasControllers = files.some(f => f.includes('/controllers/') || f.includes('/controller/'));

    if (hasModels && hasViews && hasControllers) {
      patterns.push({
        id: 'mvc-pattern',
        name: 'Model-View-Controller (MVC)',
        description: 'MVC architectural pattern detected',
        type: 'architectural',
        confidence: 0.9,
        examples: [{
          file: 'Project structure',
          snippet: 'MVC directories found',
          lineStart: 1,
          lineEnd: 1,
        }],
        recommendations: ['Ensure proper separation of concerns', 'Consider using middleware for cross-cutting concerns'],
      });
    }

    return patterns;
  }

  private analyzeConventions(fileAnalyses: FileAnalysis[]): ProjectAnalysis['conventions'] {
    // Analyze naming conventions
    const allNames = fileAnalyses.flatMap(f => [
      ...f.functions.map(fn => fn.name),
      ...f.classes.map(c => c.name),
    ]);

    const isCamelCase = allNames.every(name => /^[a-z][a-zA-Z0-9]*$/.test(name));
    const isPascalCase = allNames.every(name => /^[A-Z][a-zA-Z0-9]*$/.test(name));

    let namingConvention = 'mixed';
    if (isCamelCase) namingConvention = 'camelCase';
    else if (isPascalCase) namingConvention = 'PascalCase';

    // Analyze import conventions
    const importStyles = fileAnalyses.map(f => f.imports).flat();
    const hasRelativeImports = importStyles.some(imp => imp.startsWith('./') || imp.startsWith('../'));
    const hasAbsoluteImports = importStyles.some(imp => !imp.startsWith('.'));

    let importConvention = 'mixed';
    if (hasRelativeImports && !hasAbsoluteImports) importConvention = 'relative';
    else if (!hasRelativeImports && hasAbsoluteImports) importConvention = 'absolute';

    // Analyze structure conventions
    const directories = fileAnalyses
      .map(f => path.dirname(f.path))
      .filter((dir, index, arr) => arr.indexOf(dir) === index);

    return {
      naming: namingConvention,
      structure: directories,
      imports: importConvention,
    };
  }

  private inferArchitecture(fileAnalyses: FileAnalysis[], patterns: CodebasePattern[]): string[] {
    const architecture: string[] = [];

    // Infer from patterns
    for (const pattern of patterns) {
      if (pattern.type === 'architectural') {
        architecture.push(pattern.name);
      }
    }

    // Infer from structure
    const hasComponents = fileAnalyses.some(f => f.path.includes('component'));
    const hasServices = fileAnalyses.some(f => f.path.includes('service'));
    const hasControllers = fileAnalyses.some(f => f.path.includes('controller'));

    if (hasComponents) architecture.push('Component-based');
    if (hasServices) architecture.push('Service-oriented');
    if (hasControllers) architecture.push('Controller-based');

    return architecture.length > 0 ? architecture : ['Monolithic'];
  }

  private generateRecommendations(
    fileAnalyses: FileAnalysis[],
    patterns: CodebasePattern[],
    conventions: ProjectAnalysis['conventions']
  ): string[] {
    const recommendations: string[] = [];

    // Code quality recommendations
    const highComplexityFiles = fileAnalyses.filter(f => f.metrics.cyclomaticComplexity > 10);
    if (highComplexityFiles.length > 0) {
      recommendations.push(
        `Consider refactoring ${highComplexityFiles.length} files with high cyclomatic complexity (>10)`
      );
    }

    const lowMaintainabilityFiles = fileAnalyses.filter(f => f.metrics.maintainabilityIndex < 50);
    if (lowMaintainabilityFiles.length > 0) {
      recommendations.push(
        `Improve maintainability of ${lowMaintainabilityFiles.length} files with low maintainability index (<50)`
      );
    }

    // Pattern-based recommendations
    const patternRecommendations = patterns
      .filter(p => p.recommendations && p.recommendations.length > 0)
      .flatMap(p => p.recommendations!);

    recommendations.push(...patternRecommendations);

    // Convention recommendations
    if (conventions.naming === 'mixed') {
      recommendations.push('Consider adopting a consistent naming convention (camelCase or PascalCase)');
    }

    if (conventions.imports === 'mixed') {
      recommendations.push('Consider adopting a consistent import style (relative or absolute paths)');
    }

    return recommendations;
  }
}