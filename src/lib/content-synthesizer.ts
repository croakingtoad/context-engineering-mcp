import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ContentSynthesis,
  InitialMdAnalysis,
  CodebaseInsights,
  ContextualEnrichment,
  GeneratedContent,
  ProjectAnalysis,
  FileAnalysis,
  CodebasePattern
} from '../types/index.js';

/**
 * ContentSynthesizer analyzes INITIAL.md files and project codebases
 * to generate intelligent, contextual PRP content that captures
 * Cole Medin's depth and expertise in context engineering.
 */
export class ContentSynthesizer {
  private readonly DOMAIN_KNOWLEDGE = {
    'web-development': {
      patterns: ['MVC', 'Component-based architecture', 'RESTful APIs', 'State management'],
      considerations: ['SEO optimization', 'Progressive enhancement', 'Cross-browser compatibility', 'Performance optimization'],
      bestPractices: ['Semantic HTML', 'Responsive design', 'Accessibility compliance', 'Security headers']
    },
    'mobile-development': {
      patterns: ['Native development', 'Cross-platform frameworks', 'Offline-first design', 'Push notifications'],
      considerations: ['App store guidelines', 'Device fragmentation', 'Battery optimization', 'Network reliability'],
      bestPractices: ['Touch-friendly interfaces', 'Performance optimization', 'Graceful degradation', 'Privacy compliance']
    },
    'ml-ai': {
      patterns: ['Data pipelines', 'Model versioning', 'Feature engineering', 'A/B testing for models'],
      considerations: ['Data quality', 'Model drift', 'Ethical AI', 'Computational resources'],
      bestPractices: ['Cross-validation', 'Bias detection', 'Explainable AI', 'Continuous monitoring']
    },
    'fintech': {
      patterns: ['Event sourcing', 'CQRS', 'Microservices', 'Audit trails'],
      considerations: ['Regulatory compliance', 'Data privacy', 'Transaction integrity', 'Real-time processing'],
      bestPractices: ['PCI DSS compliance', 'SOX compliance', 'Fraud detection', 'Risk management']
    },
    'healthcare': {
      patterns: ['HL7 FHIR', 'Interoperability', 'Clinical workflows', 'Patient data management'],
      considerations: ['HIPAA compliance', 'Clinical safety', 'Interoperability', 'Regulatory approval'],
      bestPractices: ['Data encryption', 'Audit logging', 'Clinical validation', 'Patient consent management']
    },
    'e-commerce': {
      patterns: ['Catalog management', 'Payment processing', 'Inventory management', 'Order fulfillment'],
      considerations: ['PCI compliance', 'Scalability during peaks', 'International regulations', 'Customer experience'],
      bestPractices: ['Abandoned cart recovery', 'Personalization', 'A/B testing', 'Performance optimization']
    }
  };

  private readonly ANTI_PATTERNS = {
    'premature-optimization': 'Avoid over-engineering solutions before understanding actual performance requirements',
    'golden-hammer': 'Don\'t apply the same technology solution to every problem without considering alternatives',
    'big-design-upfront': 'Balance upfront planning with iterative development and feedback loops',
    'vendor-lock-in': 'Consider portability and avoid excessive dependency on proprietary solutions',
    'monolithic-thinking': 'Evaluate when monoliths vs microservices make sense for your scale and team',
    'technology-driven': 'Let business requirements drive technology choices, not the other way around'
  };

  /**
   * Synthesize comprehensive content from INITIAL.md and codebase analysis
   */
  async synthesizeContent(
    initialMdPath: string,
    projectPath?: string,
    domain?: string
  ): Promise<ContentSynthesis> {
    const initialAnalysis = await this.analyzeInitialMd(initialMdPath);
    const codebaseInsights = projectPath ? await this.analyzeCodebase(projectPath) : this.createEmptyCodebaseInsights();
    const contextualEnrichment = await this.enrichContent(initialAnalysis, codebaseInsights, domain);
    const generatedContent = await this.generateContent(initialAnalysis, codebaseInsights, contextualEnrichment);

    return {
      initialAnalysis,
      codebaseInsights,
      contextualEnrichment,
      generatedContent
    };
  }

  /**
   * Analyze INITIAL.md file to extract core information
   */
  private async analyzeInitialMd(filePath: string): Promise<InitialMdAnalysis> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseInitialMd(content);
    } catch (error) {
      // If file doesn't exist, return basic structure
      return {
        feature: 'Feature description not provided',
        examples: [],
        documentation: [],
        considerations: [],
        extractedRequirements: [],
        stakeholders: [],
        constraints: [],
        objectives: []
      };
    }
  }

  /**
   * Parse INITIAL.md content into structured data
   */
  private parseInitialMd(content: string): InitialMdAnalysis {
    const sections = this.extractSections(content);

    const feature = this.extractFeature(sections);
    const examples = this.extractExamples(sections);
    const documentation = this.extractDocumentation(sections);
    const considerations = this.extractConsiderations(sections);

    // Extract additional insights through analysis
    const extractedRequirements = this.extractRequirementsFromText(content);
    const stakeholders = this.extractStakeholdersFromText(content);
    const constraints = this.extractConstraintsFromText(content);
    const objectives = this.inferObjectives(feature, examples, considerations);

    return {
      feature,
      examples,
      documentation,
      considerations,
      extractedRequirements,
      stakeholders,
      constraints,
      objectives
    };
  }

  /**
   * Extract sections from INITIAL.md content
   */
  private extractSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('##')) {
        if (currentSection) {
          sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
        }
        currentSection = trimmedLine.replace(/^#+\s*/, '').replace(/[*:]/g, '').trim();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    if (currentSection) {
      sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
    }

    return sections;
  }

  /**
   * Extract feature description
   */
  private extractFeature(sections: Record<string, string>): string {
    const featureSection = sections['feature'] || sections['features'] || '';

    if (featureSection) {
      // Remove placeholder text and extract meaningful content
      return featureSection
        .replace(/\[.*?\]/g, '')
        .replace(/Insert your feature here/gi, '')
        .trim();
    }

    // Look for feature description in other sections
    const allContent = Object.values(sections).join(' ');
    const featureMatch = allContent.match(/(?:feature|functionality|system|application|platform):\s*([^.\n]+)/i);

    return featureMatch ? featureMatch[1].trim() : 'Feature description not provided';
  }

  /**
   * Extract examples from content
   */
  private extractExamples(sections: Record<string, string>): string[] {
    const examplesSection = sections['examples'] || sections['example'] || '';

    if (!examplesSection) return [];

    // Extract examples from various formats
    const examples: string[] = [];

    // Bullet point examples
    const bulletMatches = examplesSection.match(/^[\s]*[-*+]\s(.+)$/gm);
    if (bulletMatches) {
      examples.push(...bulletMatches.map(match => match.replace(/^[\s]*[-*+]\s/, '').trim()));
    }

    // Numbered examples
    const numberedMatches = examplesSection.match(/^[\s]*\d+\.\s(.+)$/gm);
    if (numberedMatches) {
      examples.push(...numberedMatches.map(match => match.replace(/^[\s]*\d+\.\s/, '').trim()));
    }

    // File references
    const fileMatches = examplesSection.match(/examples?\/([\w\-\.\/]+)/gi);
    if (fileMatches) {
      examples.push(...fileMatches);
    }

    return examples.filter(ex => ex.length > 0 && !ex.includes('[') && !ex.toLowerCase().includes('provide'));
  }

  /**
   * Extract documentation references
   */
  private extractDocumentation(sections: Record<string, string>): string[] {
    const docSection = sections['documentation'] || sections['docs'] || '';

    if (!docSection) return [];

    const docs: string[] = [];

    // URL references
    const urlMatches = docSection.match(/https?:\/\/[^\s\]]+/gi);
    if (urlMatches) {
      docs.push(...urlMatches);
    }

    // Named documentation
    const namedDocs = docSection.match(/(?:documentation|docs?|reference|guide):\s*([^.\n]+)/gi);
    if (namedDocs) {
      docs.push(...namedDocs.map(match => match.replace(/^[^:]+:\s*/, '').trim()));
    }

    // Framework/library documentation
    const frameworkDocs = docSection.match(/(React|Vue|Angular|Django|Flask|Express|Spring|Rails)\s+(?:docs?|documentation|guide)/gi);
    if (frameworkDocs) {
      docs.push(...frameworkDocs);
    }

    return docs.filter(doc => doc.length > 0 && !doc.includes('['));
  }

  /**
   * Extract considerations and gotchas
   */
  private extractConsiderations(sections: Record<string, string>): string[] {
    const considerationsSection = sections['other considerations'] || sections['considerations'] || '';

    if (!considerationsSection) return [];

    const considerations: string[] = [];

    // Extract list items
    const listItems = this.extractListItems(considerationsSection);
    considerations.push(...listItems);

    // Extract gotchas and warnings
    const gotchaMatches = considerationsSection.match(/(?:gotcha|warning|caveat|important|note):\s*([^.\n]+)/gi);
    if (gotchaMatches) {
      considerations.push(...gotchaMatches.map(match => match.replace(/^[^:]+:\s*/, '').trim()));
    }

    return considerations.filter(c => c.length > 0 && !c.includes('['));
  }

  /**
   * Extract requirements through text analysis
   */
  private extractRequirementsFromText(content: string): string[] {
    const requirements: string[] = [];

    // Functional requirements indicators
    const functionalPatterns = [
      /(?:must|should|need to|require[ds]?)\s+([^.\n]+)/gi,
      /(?:user can|system shall|application will)\s+([^.\n]+)/gi,
      /(?:feature|functionality|capability):\s*([^.\n]+)/gi
    ];

    functionalPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const requirement = match[1].trim();
        if (requirement.length > 10 && !requirement.includes('[')) {
          requirements.push(requirement);
        }
      }
    });

    return [...new Set(requirements)]; // Remove duplicates
  }

  /**
   * Extract stakeholders from text
   */
  private extractStakeholdersFromText(content: string): string[] {
    const stakeholders: string[] = [];

    // Common stakeholder patterns
    const stakeholderPatterns = [
      /(?:stakeholders?|users?|team|developers?|clients?):\s*([^.\n]+)/gi,
      /(?:product manager|project manager|tech lead|developer|designer|qa|tester)/gi,
      /(?:end user|admin|customer|client|business user)/gi
    ];

    stakeholderPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const stakeholder = match[0].trim();
        if (stakeholder.length > 2) {
          stakeholders.push(stakeholder);
        }
      }
    });

    return [...new Set(stakeholders)];
  }

  /**
   * Extract constraints from text
   */
  private extractConstraintsFromText(content: string): string[] {
    const constraints: string[] = [];

    // Constraint indicators
    const constraintPatterns = [
      /(?:constraint|limitation|restriction):\s*([^.\n]+)/gi,
      /(?:cannot|must not|limited to|restricted to)\s+([^.\n]+)/gi,
      /(?:budget|timeline|deadline|resource)\s+(?:constraint|limit):\s*([^.\n]+)/gi
    ];

    constraintPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const constraint = match[1] || match[0];
        if (constraint.length > 10 && !constraint.includes('[')) {
          constraints.push(constraint.trim());
        }
      }
    });

    return [...new Set(constraints)];
  }

  /**
   * Infer project objectives from analysis
   */
  private inferObjectives(feature: string, examples: string[], considerations: string[]): string[] {
    const objectives: string[] = [];

    // Infer from feature description
    if (feature.toLowerCase().includes('improve')) {
      objectives.push('Improve existing system performance and user experience');
    }
    if (feature.toLowerCase().includes('automate')) {
      objectives.push('Automate manual processes to increase efficiency');
    }
    if (feature.toLowerCase().includes('integrate')) {
      objectives.push('Integrate systems for better data flow and user experience');
    }

    // Infer from examples
    if (examples.some(ex => ex.toLowerCase().includes('api'))) {
      objectives.push('Provide robust API for integration and extensibility');
    }
    if (examples.some(ex => ex.toLowerCase().includes('mobile'))) {
      objectives.push('Ensure mobile compatibility and responsive design');
    }

    // Infer from considerations
    if (considerations.some(c => c.toLowerCase().includes('performance'))) {
      objectives.push('Achieve high performance and scalability requirements');
    }
    if (considerations.some(c => c.toLowerCase().includes('security'))) {
      objectives.push('Implement comprehensive security measures');
    }

    // Default objectives if none inferred
    if (objectives.length === 0) {
      objectives.push('Deliver high-quality, maintainable software solution');
      objectives.push('Meet user needs and business requirements effectively');
    }

    return objectives;
  }

  /**
   * Analyze existing codebase for patterns and insights
   */
  private async analyzeCodebase(projectPath: string): Promise<CodebaseInsights> {
    try {
      const analysis = await this.performCodebaseAnalysis(projectPath);
      return this.synthesizeCodebaseInsights(analysis);
    } catch (error) {
      console.warn('Codebase analysis failed:', error);
      return this.createEmptyCodebaseInsights();
    }
  }

  /**
   * Perform detailed codebase analysis
   */
  private async performCodebaseAnalysis(projectPath: string): Promise<ProjectAnalysis> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    let dependencies: Record<string, string> = {};
    let devDependencies: Record<string, string> = {};
    let language = 'javascript';

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      dependencies = packageJson.dependencies || {};
      devDependencies = packageJson.devDependencies || {};

      if (devDependencies.typescript || dependencies.typescript) {
        language = 'typescript';
      }
    } catch {
      // No package.json found, continue with defaults
    }

    const fileAnalyses = await this.analyzeProjectFiles(projectPath);
    const patterns = this.identifyCodebasePatterns(fileAnalyses, dependencies);
    const architecture = this.inferArchitecture(fileAnalyses, dependencies);
    const conventions = this.identifyConventions(fileAnalyses);
    const recommendations = this.generateCodebaseRecommendations(fileAnalyses, patterns);

    return {
      rootPath: projectPath,
      language,
      architecture,
      dependencies,
      devDependencies,
      fileAnalyses,
      patterns,
      conventions,
      recommendations,
      generatedAt: new Date()
    };
  }

  /**
   * Analyze project files
   */
  private async analyzeProjectFiles(projectPath: string): Promise<FileAnalysis[]> {
    const analyses: FileAnalysis[] = [];

    try {
      const files = await this.getSourceFiles(projectPath);

      for (const filePath of files.slice(0, 20)) { // Limit to first 20 files
        try {
          const analysis = await this.analyzeFile(filePath);
          if (analysis) {
            analyses.push(analysis);
          }
        } catch (error) {
          console.warn(`Failed to analyze file ${filePath}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to analyze project files:', error);
    }

    return analyses;
  }

  /**
   * Get source files from project
   */
  private async getSourceFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.php'];

    const scanDirectory = async (dirPath: string, depth: number = 0): Promise<void> => {
      if (depth > 3) return; // Limit recursion depth

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            await scanDirectory(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (sourceExtensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    await scanDirectory(projectPath);
    return files;
  }

  /**
   * Analyze individual file
   */
  private async analyzeFile(filePath: string): Promise<FileAnalysis | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath);

      return {
        path: filePath,
        language: this.getLanguageFromExtension(ext),
        framework: this.detectFramework(content),
        imports: this.extractImports(content, ext),
        exports: this.extractExports(content, ext),
        functions: this.extractFunctions(content, ext),
        classes: this.extractClasses(content, ext),
        patterns: this.detectFilePatterns(content, filePath),
        metrics: this.calculateFileMetrics(content)
      };
    } catch {
      return null;
    }
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php'
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Detect framework from content
   */
  private detectFramework(content: string): string | undefined {
    const frameworks = [
      { name: 'React', patterns: [/import.*react/i, /from ['"]react/i, /jsx/i] },
      { name: 'Vue', patterns: [/import.*vue/i, /from ['"]vue/i, /<template>/i] },
      { name: 'Angular', patterns: [/import.*@angular/i, /@Component/i, /@Injectable/i] },
      { name: 'Express', patterns: [/express\(\)/i, /app\.get\(/i, /app\.post\(/i] },
      { name: 'Django', patterns: [/from django/i, /django\.http/i, /models\.Model/i] },
      { name: 'Flask', patterns: [/from flask/i, /Flask\(__name__\)/i, /@app\.route/i] }
    ];

    for (const framework of frameworks) {
      if (framework.patterns.some(pattern => pattern.test(content))) {
        return framework.name;
      }
    }

    return undefined;
  }

  /**
   * Extract imports from content
   */
  private extractImports(content: string, ext: string): string[] {
    const imports: string[] = [];

    if (ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx') {
      const importMatches = content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/gi);
      if (importMatches) {
        imports.push(...importMatches.map(match => {
          const moduleMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/i);
          return moduleMatch ? moduleMatch[1] : '';
        }).filter(imp => imp));
      }
    } else if (ext === '.py') {
      const importMatches = content.match(/^(?:from\s+(\S+)\s+)?import\s+(.+)$/gm);
      if (importMatches) {
        imports.push(...importMatches.map(match => {
          const parts = match.split(/\s+/);
          return parts[parts.indexOf('from') + 1] || parts[parts.indexOf('import') + 1] || '';
        }).filter(imp => imp));
      }
    }

    return imports;
  }

  /**
   * Extract exports from content
   */
  private extractExports(content: string, ext: string): string[] {
    const exports: string[] = [];

    if (ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx') {
      const exportMatches = content.match(/export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/gi);
      if (exportMatches) {
        exports.push(...exportMatches.map(match => {
          const nameMatch = match.match(/(?:function|class|const|let|var)\s+(\w+)/i);
          return nameMatch ? nameMatch[1] : '';
        }).filter(exp => exp));
      }
    }

    return exports;
  }

  /**
   * Extract functions from content
   */
  private extractFunctions(content: string, ext: string): Array<{
    name: string;
    parameters: string[];
    returnType?: string;
    isAsync: boolean;
    complexity: number;
  }> {
    const functions: Array<{
      name: string;
      parameters: string[];
      returnType?: string;
      isAsync: boolean;
      complexity: number;
    }> = [];

    if (ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx') {
      const functionMatches = content.match(/(async\s+)?function\s+(\w+)\s*\([^)]*\)/gi);
      if (functionMatches) {
        functionMatches.forEach(match => {
          const isAsync = match.includes('async');
          const nameMatch = match.match(/function\s+(\w+)/i);
          const name = nameMatch ? nameMatch[1] : 'anonymous';

          functions.push({
            name,
            parameters: [],
            isAsync,
            complexity: this.calculateFunctionComplexity(match)
          });
        });
      }
    }

    return functions;
  }

  /**
   * Extract classes from content
   */
  private extractClasses(content: string, ext: string): Array<{
    name: string;
    methods: string[];
    properties: string[];
    inheritance?: string[];
  }> {
    const classes: Array<{
      name: string;
      methods: string[];
      properties: string[];
      inheritance?: string[];
    }> = [];

    if (ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx') {
      const classMatches = content.match(/class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/gi);
      if (classMatches) {
        classMatches.forEach(match => {
          const nameMatch = match.match(/class\s+(\w+)/i);
          const extendsMatch = match.match(/extends\s+(\w+)/i);

          if (nameMatch) {
            classes.push({
              name: nameMatch[1],
              methods: [],
              properties: [],
              inheritance: extendsMatch ? [extendsMatch[1]] : undefined
            });
          }
        });
      }
    }

    return classes;
  }

  /**
   * Detect patterns in file content
   */
  private detectFilePatterns(content: string, filePath: string): CodebasePattern[] {
    const patterns: CodebasePattern[] = [];

    // MVC Pattern
    if (filePath.includes('/controllers/') || content.includes('Controller')) {
      patterns.push({
        id: 'mvc-controller',
        name: 'MVC Controller',
        description: 'Model-View-Controller pattern implementation',
        type: 'architectural',
        confidence: 0.8,
        examples: [{
          file: filePath,
          snippet: 'Controller class implementation',
          lineStart: 1,
          lineEnd: 10
        }]
      });
    }

    // Repository Pattern
    if (content.includes('Repository') || content.includes('repository')) {
      patterns.push({
        id: 'repository-pattern',
        name: 'Repository Pattern',
        description: 'Data access abstraction pattern',
        type: 'design',
        confidence: 0.7,
        examples: [{
          file: filePath,
          snippet: 'Repository pattern usage',
          lineStart: 1,
          lineEnd: 10
        }]
      });
    }

    return patterns;
  }

  /**
   * Calculate file metrics
   */
  private calculateFileMetrics(content: string): {
    linesOfCode: number;
    cyclomaticComplexity: number;
    maintainabilityIndex: number;
  } {
    const lines = content.split('\n');
    const linesOfCode = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;

    // Simple complexity calculation based on control flow statements
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'catch', 'case'];
    const cyclomaticComplexity = 1 + complexityKeywords.reduce((sum, keyword) => {
      const matches = content.match(new RegExp(`\\b${keyword}\\b`, 'gi'));
      return sum + (matches ? matches.length : 0);
    }, 0);

    // Simple maintainability index (inverse of complexity per line)
    const maintainabilityIndex = Math.max(0, 100 - (cyclomaticComplexity * 10) / Math.max(linesOfCode, 1));

    return {
      linesOfCode,
      cyclomaticComplexity,
      maintainabilityIndex: Math.round(maintainabilityIndex)
    };
  }

  /**
   * Calculate function complexity
   */
  private calculateFunctionComplexity(functionText: string): number {
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'catch', 'case'];
    return 1 + complexityKeywords.reduce((sum, keyword) => {
      const matches = functionText.match(new RegExp(`\\b${keyword}\\b`, 'gi'));
      return sum + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Identify codebase patterns
   */
  private identifyCodebasePatterns(
    fileAnalyses: FileAnalysis[],
    dependencies: Record<string, string>
  ): CodebasePattern[] {
    const patterns: CodebasePattern[] = [];

    // Aggregate patterns from files
    fileAnalyses.forEach(analysis => {
      patterns.push(...analysis.patterns);
    });

    // Identify framework patterns
    if (dependencies.react || dependencies['@types/react']) {
      patterns.push({
        id: 'react-framework',
        name: 'React Framework',
        description: 'React-based frontend application',
        type: 'framework',
        confidence: 0.9,
        examples: fileAnalyses
          .filter(fa => fa.framework === 'React')
          .slice(0, 3)
          .map(fa => ({
            file: fa.path,
            snippet: 'React component',
            lineStart: 1,
            lineEnd: 10
          }))
      });
    }

    return patterns;
  }

  /**
   * Infer architecture from analysis
   */
  private inferArchitecture(
    fileAnalyses: FileAnalysis[],
    dependencies: Record<string, string>
  ): string[] {
    const architecture: string[] = [];

    // Check for common architectures
    if (fileAnalyses.some(fa => fa.path.includes('/components/'))) {
      architecture.push('Component-based architecture');
    }

    if (fileAnalyses.some(fa => fa.path.includes('/services/'))) {
      architecture.push('Service layer architecture');
    }

    if (dependencies.express || dependencies.koa || dependencies.fastify) {
      architecture.push('REST API architecture');
    }

    if (dependencies.graphql || dependencies['apollo-server']) {
      architecture.push('GraphQL API architecture');
    }

    return architecture;
  }

  /**
   * Identify conventions
   */
  private identifyConventions(fileAnalyses: FileAnalysis[]): {
    naming: string;
    structure: string[];
    imports: string;
  } {
    // Analyze naming conventions
    const fileNames = fileAnalyses.map(fa => path.basename(fa.path));
    const hasKebabCase = fileNames.some(name => name.includes('-'));
    const hasCamelCase = fileNames.some(name => /[a-z][A-Z]/.test(name));
    const hasPascalCase = fileNames.some(name => /^[A-Z]/.test(name));

    let naming = 'mixed';
    if (hasKebabCase && !hasCamelCase && !hasPascalCase) naming = 'kebab-case';
    else if (hasCamelCase && !hasKebabCase && !hasPascalCase) naming = 'camelCase';
    else if (hasPascalCase && !hasKebabCase && !hasCamelCase) naming = 'PascalCase';

    // Analyze structure conventions
    const structure: string[] = [];
    const directories = new Set(
      fileAnalyses.map(fa => path.dirname(fa.path).split('/').pop()).filter(Boolean)
    );
    structure.push(...directories);

    // Analyze import conventions
    const hasRelativeImports = fileAnalyses.some(fa => fa.imports.some(imp => imp.startsWith('./')));
    const hasAbsoluteImports = fileAnalyses.some(fa => fa.imports.some(imp => !imp.startsWith('./')));
    let imports = 'mixed';
    if (hasRelativeImports && !hasAbsoluteImports) imports = 'relative';
    else if (hasAbsoluteImports && !hasRelativeImports) imports = 'absolute';

    return { naming, structure: Array.from(structure), imports };
  }

  /**
   * Generate codebase recommendations
   */
  private generateCodebaseRecommendations(
    fileAnalyses: FileAnalysis[],
    patterns: CodebasePattern[]
  ): string[] {
    const recommendations: string[] = [];

    // Check complexity
    const highComplexityFiles = fileAnalyses.filter(fa => fa.metrics.cyclomaticComplexity > 10);
    if (highComplexityFiles.length > 0) {
      recommendations.push('Consider refactoring high-complexity files to improve maintainability');
    }

    // Check maintainability
    const lowMaintainabilityFiles = fileAnalyses.filter(fa => fa.metrics.maintainabilityIndex < 50);
    if (lowMaintainabilityFiles.length > 0) {
      recommendations.push('Improve code maintainability by reducing complexity and adding documentation');
    }

    // Check patterns
    if (patterns.length === 0) {
      recommendations.push('Consider adopting established design patterns for better code organization');
    }

    return recommendations;
  }

  /**
   * Synthesize codebase insights
   */
  private synthesizeCodebaseInsights(analysis: ProjectAnalysis): CodebaseInsights {
    const technologies = [
      ...Object.keys(analysis.dependencies),
      ...Object.keys(analysis.devDependencies)
    ].slice(0, 10); // Top 10 technologies

    const complexity = this.assessCodebaseComplexity(analysis);
    const recommendations = analysis.recommendations;

    return {
      architecture: analysis.architecture,
      patterns: analysis.patterns.map(p => p.name),
      technologies,
      conventions: [
        `Naming: ${analysis.conventions.naming}`,
        `Imports: ${analysis.conventions.imports}`,
        `Structure: ${analysis.conventions.structure.join(', ')}`
      ],
      complexity,
      recommendations
    };
  }

  /**
   * Assess codebase complexity
   */
  private assessCodebaseComplexity(analysis: ProjectAnalysis): 'low' | 'medium' | 'high' {
    const avgComplexity = analysis.fileAnalyses.reduce(
      (sum, fa) => sum + fa.metrics.cyclomaticComplexity,
      0
    ) / Math.max(analysis.fileAnalyses.length, 1);

    const avgMaintainability = analysis.fileAnalyses.reduce(
      (sum, fa) => sum + fa.metrics.maintainabilityIndex,
      0
    ) / Math.max(analysis.fileAnalyses.length, 1);

    if (avgComplexity > 15 || avgMaintainability < 40) return 'high';
    if (avgComplexity > 8 || avgMaintainability < 60) return 'medium';
    return 'low';
  }

  /**
   * Create empty codebase insights for projects without existing code
   */
  private createEmptyCodebaseInsights(): CodebaseInsights {
    return {
      architecture: [],
      patterns: [],
      technologies: [],
      conventions: [],
      complexity: 'low',
      recommendations: ['This appears to be a new project - follow established patterns and best practices from the start']
    };
  }

  /**
   * Enrich content with domain knowledge and best practices
   */
  private async enrichContent(
    initialAnalysis: InitialMdAnalysis,
    codebaseInsights: CodebaseInsights,
    domain?: string
  ): Promise<ContextualEnrichment> {
    const inferredDomain = domain || this.inferDomain(initialAnalysis, codebaseInsights);
    const domainKnowledge = this.getDomainKnowledge(inferredDomain);

    return {
      domainKnowledge: domainKnowledge.bestPractices,
      industryBestPractices: this.getIndustryBestPractices(inferredDomain),
      antiPatternWarnings: this.getAntiPatternWarnings(initialAnalysis, codebaseInsights),
      scalabilityConsiderations: this.getScalabilityConsiderations(inferredDomain, codebaseInsights),
      securityConsiderations: this.getSecurityConsiderations(inferredDomain),
      performanceConsiderations: this.getPerformanceConsiderations(inferredDomain, codebaseInsights)
    };
  }

  /**
   * Infer domain from analysis
   */
  private inferDomain(initialAnalysis: InitialMdAnalysis, codebaseInsights: CodebaseInsights): string {
    const allText = [
      initialAnalysis.feature,
      ...initialAnalysis.examples,
      ...initialAnalysis.considerations,
      ...codebaseInsights.technologies
    ].join(' ').toLowerCase();

    for (const [domain, knowledge] of Object.entries(this.DOMAIN_KNOWLEDGE)) {
      if (knowledge.patterns.some(pattern => allText.includes(pattern.toLowerCase()))) {
        return domain;
      }
    }

    return 'web-development'; // Default domain
  }

  /**
   * Get domain-specific knowledge
   */
  private getDomainKnowledge(domain: string): any {
    return this.DOMAIN_KNOWLEDGE[domain as keyof typeof this.DOMAIN_KNOWLEDGE] ||
           this.DOMAIN_KNOWLEDGE['web-development'];
  }

  /**
   * Get industry best practices
   */
  private getIndustryBestPractices(domain: string): string[] {
    const practices = this.getDomainKnowledge(domain).bestPractices || [];

    // Add universal best practices
    return [
      ...practices,
      'Follow SOLID principles in software design',
      'Implement comprehensive testing strategy',
      'Use version control with meaningful commit messages',
      'Document APIs and complex business logic',
      'Implement proper error handling and logging',
      'Follow security best practices and regular updates'
    ];
  }

  /**
   * Get anti-pattern warnings
   */
  private getAntiPatternWarnings(
    initialAnalysis: InitialMdAnalysis,
    codebaseInsights: CodebaseInsights
  ): string[] {
    const warnings: string[] = [];

    // Check for common anti-patterns based on content
    const allText = [
      initialAnalysis.feature,
      ...initialAnalysis.considerations
    ].join(' ').toLowerCase();

    for (const [pattern, warning] of Object.entries(this.ANTI_PATTERNS)) {
      if (allText.includes(pattern.replace('-', ' '))) {
        warnings.push(warning);
      }
    }

    // Add codebase-specific warnings
    if (codebaseInsights.complexity === 'high') {
      warnings.push('High code complexity detected - consider refactoring for maintainability');
    }

    return warnings;
  }

  /**
   * Get scalability considerations
   */
  private getScalabilityConsiderations(domain: string, codebaseInsights: CodebaseInsights): string[] {
    const considerations = [];

    if (domain === 'e-commerce') {
      considerations.push(
        'Plan for traffic spikes during sales events and holidays',
        'Implement caching strategies for product catalogs and user sessions',
        'Consider CDN for static assets and international users'
      );
    }

    if (codebaseInsights.technologies.includes('react') || codebaseInsights.technologies.includes('vue')) {
      considerations.push(
        'Implement code splitting and lazy loading for better performance',
        'Consider server-side rendering for SEO and initial load performance'
      );
    }

    // Universal scalability considerations
    considerations.push(
      'Design for horizontal scaling from the beginning',
      'Implement proper database indexing and query optimization',
      'Consider microservices architecture for complex domains',
      'Plan for monitoring and observability at scale'
    );

    return considerations;
  }

  /**
   * Get security considerations
   */
  private getSecurityConsiderations(domain: string): string[] {
    const considerations = [];

    if (domain === 'fintech') {
      considerations.push(
        'Implement PCI DSS compliance for payment processing',
        'Use strong encryption for sensitive financial data',
        'Implement fraud detection and prevention mechanisms'
      );
    }

    if (domain === 'healthcare') {
      considerations.push(
        'Ensure HIPAA compliance for patient data',
        'Implement audit trails for all data access',
        'Use end-to-end encryption for patient communications'
      );
    }

    // Universal security considerations
    considerations.push(
      'Implement proper authentication and authorization',
      'Use HTTPS for all communications',
      'Validate and sanitize all user inputs',
      'Keep dependencies updated and scan for vulnerabilities',
      'Implement rate limiting and DDoS protection'
    );

    return considerations;
  }

  /**
   * Get performance considerations
   */
  private getPerformanceConsiderations(domain: string, codebaseInsights: CodebaseInsights): string[] {
    const considerations = [];

    if (codebaseInsights.technologies.includes('react')) {
      considerations.push(
        'Use React.memo and useMemo for expensive computations',
        'Implement virtual scrolling for large lists',
        'Optimize bundle size with tree shaking'
      );
    }

    if (codebaseInsights.technologies.includes('node')) {
      considerations.push(
        'Implement connection pooling for databases',
        'Use clustering for multi-core utilization',
        'Implement proper caching strategies'
      );
    }

    // Universal performance considerations
    considerations.push(
      'Optimize database queries and implement indexing',
      'Use caching at multiple levels (browser, CDN, application)',
      'Implement compression for API responses',
      'Monitor and optimize critical performance metrics'
    );

    return considerations;
  }

  /**
   * Generate comprehensive content from all analyses
   */
  private async generateContent(
    initialAnalysis: InitialMdAnalysis,
    codebaseInsights: CodebaseInsights,
    contextualEnrichment: ContextualEnrichment
  ): Promise<GeneratedContent> {
    const sections: Record<string, string> = {};

    sections['Project Overview'] = this.generateProjectOverview(initialAnalysis, codebaseInsights);
    sections['Feature Specification'] = this.generateFeatureSpecification(initialAnalysis, contextualEnrichment);
    sections['Technical Architecture'] = this.generateTechnicalArchitecture(codebaseInsights, contextualEnrichment);
    sections['User Experience'] = this.generateUserExperience(initialAnalysis);
    sections['Implementation Approach'] = this.generateImplementationApproach(initialAnalysis, codebaseInsights);
    sections['Success Metrics'] = this.generateSuccessMetrics(initialAnalysis);
    sections['Constraints & Considerations'] = this.generateConstraintsAndConsiderations(
      initialAnalysis,
      contextualEnrichment
    );

    return {
      sections,
      metadata: {
        generationMethod: 'hybrid',
        confidenceScore: this.calculateConfidenceScore(initialAnalysis, codebaseInsights),
        sourcesUsed: [
          'INITIAL.md analysis',
          'Codebase pattern analysis',
          'Domain knowledge base',
          'Industry best practices'
        ],
        generatedAt: new Date()
      }
    };
  }

  /**
   * Generate Project Overview section
   */
  private generateProjectOverview(
    initialAnalysis: InitialMdAnalysis,
    codebaseInsights: CodebaseInsights
  ): string {
    let content = `**Project Name:** [Project Name]\n`;
    content += `**Domain:** [Business Domain]\n`;
    content += `**Stakeholders:** ${initialAnalysis.stakeholders.join(', ') || 'Product Manager, Engineering Team, QA, UX Designer'}\n\n`;

    content += `## Project Purpose\n\n`;
    content += `${initialAnalysis.feature}\n\n`;

    if (initialAnalysis.objectives.length > 0) {
      content += `## Key Objectives\n\n`;
      initialAnalysis.objectives.forEach(objective => {
        content += `- ${objective}\n`;
      });
      content += '\n';
    }

    if (codebaseInsights.architecture.length > 0) {
      content += `## Current Architecture\n\n`;
      content += `The existing system follows ${codebaseInsights.architecture.join(', ')} patterns`;
      if (codebaseInsights.technologies.length > 0) {
        content += ` and utilizes ${codebaseInsights.technologies.slice(0, 5).join(', ')} technologies.`;
      }
      content += '\n\n';
    }

    return content;
  }

  /**
   * Generate Feature Specification section
   */
  private generateFeatureSpecification(
    initialAnalysis: InitialMdAnalysis,
    contextualEnrichment: ContextualEnrichment
  ): string {
    let content = `**Core Feature:** ${initialAnalysis.feature}\n\n`;

    content += `### Functional Requirements\n\n`;
    if (initialAnalysis.extractedRequirements.length > 0) {
      initialAnalysis.extractedRequirements.forEach(req => {
        content += `- ${req}\n`;
      });
    } else {
      content += `- [Define specific functional requirements based on feature analysis]\n`;
      content += `- [Include user interactions and system behaviors]\n`;
      content += `- [Specify data processing and business logic needs]\n`;
    }
    content += '\n';

    content += `### Non-Functional Requirements\n\n`;
    contextualEnrichment.performanceConsiderations.slice(0, 3).forEach(consideration => {
      content += `- ${consideration}\n`;
    });
    contextualEnrichment.securityConsiderations.slice(0, 2).forEach(consideration => {
      content += `- ${consideration}\n`;
    });
    content += '\n';

    if (initialAnalysis.examples.length > 0) {
      content += `### Examples and Use Cases\n\n`;
      initialAnalysis.examples.forEach(example => {
        content += `- ${example}\n`;
      });
      content += '\n';
    }

    content += `### Acceptance Criteria\n\n`;
    content += `- [Define clear, testable acceptance criteria]\n`;
    content += `- [Include performance benchmarks]\n`;
    content += `- [Specify user experience requirements]\n\n`;

    return content;
  }

  /**
   * Generate Technical Architecture section
   */
  private generateTechnicalArchitecture(
    codebaseInsights: CodebaseInsights,
    contextualEnrichment: ContextualEnrichment
  ): string {
    let content = `**Technology Stack:**\n\n`;

    if (codebaseInsights.technologies.length > 0) {
      content += `Current technologies: ${codebaseInsights.technologies.join(', ')}\n\n`;
    }

    content += `**Recommended Stack:**\n`;
    content += `- Frontend: [Select based on requirements - React, Vue, Angular]\n`;
    content += `- Backend: [Select based on team expertise - Node.js, Python, Java]\n`;
    content += `- Database: [Select based on data requirements - PostgreSQL, MongoDB, MySQL]\n`;
    content += `- Deployment: [Select based on infrastructure needs - AWS, Azure, GCP]\n\n`;

    if (codebaseInsights.architecture.length > 0) {
      content += `**Architectural Patterns:**\n\n`;
      codebaseInsights.architecture.forEach(pattern => {
        content += `- ${pattern}\n`;
      });
      content += '\n';
    }

    content += `**Design Patterns:**\n\n`;
    if (codebaseInsights.patterns.length > 0) {
      codebaseInsights.patterns.forEach(pattern => {
        content += `- ${pattern}\n`;
      });
    } else {
      content += `- Repository pattern for data access\n`;
      content += `- Service layer for business logic\n`;
      content += `- Factory pattern for object creation\n`;
    }
    content += '\n';

    content += `**Scalability Considerations:**\n\n`;
    contextualEnrichment.scalabilityConsiderations.forEach(consideration => {
      content += `- ${consideration}\n`;
    });
    content += '\n';

    return content;
  }

  /**
   * Generate User Experience section
   */
  private generateUserExperience(initialAnalysis: InitialMdAnalysis): string {
    let content = `**Primary Users:** [Define primary user personas]\n`;
    content += `**Secondary Users:** [Define secondary user types]\n\n`;

    content += `### User Journey\n\n`;
    content += `[Map out the key user journeys and workflows]\n\n`;

    content += `### User Stories\n\n`;
    if (initialAnalysis.examples.length > 0) {
      content += `Based on the feature requirements:\n\n`;
      initialAnalysis.examples.forEach(example => {
        content += `- As a user, I want to ${example.toLowerCase()}\n`;
      });
    } else {
      content += `- As a [user type], I want [goal] so that [benefit]\n`;
      content += `- As a [user type], I want [goal] so that [benefit]\n`;
      content += `- As a [user type], I want [goal] so that [benefit]\n`;
    }
    content += '\n';

    content += `### Interface Requirements\n\n`;
    content += `- Intuitive and user-friendly design\n`;
    content += `- Mobile-responsive interface\n`;
    content += `- Accessibility compliance (WCAG 2.1)\n`;
    content += `- Fast loading and responsive interactions\n\n`;

    return content;
  }

  /**
   * Generate Implementation Approach section
   */
  private generateImplementationApproach(
    initialAnalysis: InitialMdAnalysis,
    codebaseInsights: CodebaseInsights
  ): string {
    let content = `**Development Methodology:** Agile with iterative development\n\n`;

    content += `**Development Phases:**\n\n`;
    content += `1. **Phase 1: Foundation Setup** (1-2 weeks)\n`;
    content += `   - Project initialization and environment setup\n`;
    content += `   - Architecture design and technology selection\n`;
    content += `   - Development workflow and CI/CD pipeline\n\n`;

    content += `2. **Phase 2: Core Development** (4-6 weeks)\n`;
    content += `   - Core feature implementation\n`;
    content += `   - Database design and API development\n`;
    content += `   - User interface development\n\n`;

    content += `3. **Phase 3: Integration and Testing** (2-3 weeks)\n`;
    content += `   - System integration and testing\n`;
    content += `   - Performance optimization\n`;
    content += `   - Security validation\n\n`;

    content += `4. **Phase 4: Deployment and Launch** (1 week)\n`;
    content += `   - Production deployment\n`;
    content += `   - Monitoring and observability setup\n`;
    content += `   - Go-live and post-launch support\n\n`;

    content += `**Testing Strategy:**\n\n`;
    content += `- Unit testing for all critical components\n`;
    content += `- Integration testing for API endpoints\n`;
    content += `- End-to-end testing for user workflows\n`;
    content += `- Performance and load testing\n`;
    if (codebaseInsights.complexity === 'high') {
      content += `- Additional focus on regression testing due to existing code complexity\n`;
    }
    content += '\n';

    return content;
  }

  /**
   * Generate Success Metrics section
   */
  private generateSuccessMetrics(initialAnalysis: InitialMdAnalysis): string {
    let content = `**Key Performance Indicators:**\n\n`;

    // Infer metrics from feature description
    const featureLower = initialAnalysis.feature.toLowerCase();

    if (featureLower.includes('performance') || featureLower.includes('speed')) {
      content += `- Response time < 200ms for API calls\n`;
      content += `- Page load time < 2 seconds\n`;
    }

    if (featureLower.includes('user') || featureLower.includes('experience')) {
      content += `- User satisfaction score > 4.0/5.0\n`;
      content += `- Task completion rate > 90%\n`;
    }

    if (featureLower.includes('system') || featureLower.includes('platform')) {
      content += `- System uptime > 99.9%\n`;
      content += `- Error rate < 0.1%\n`;
    }

    // Default metrics if none inferred
    if (!content.includes('-')) {
      content += `- Feature adoption rate > 70%\n`;
      content += `- User engagement improvement > 20%\n`;
      content += `- System performance within acceptable limits\n`;
    }

    content += '\n**Business Value Metrics:**\n\n';
    content += `- [Define business impact measurements]\n`;
    content += `- [Include ROI and cost-benefit analysis]\n`;
    content += `- [Specify user behavior and engagement metrics]\n\n`;

    content += `**Technical Metrics:**\n\n`;
    content += `- Code coverage > 80%\n`;
    content += `- Security vulnerability score: 0 high/critical issues\n`;
    content += `- Performance benchmarks met\n`;
    content += `- Documentation completeness > 90%\n\n`;

    return content;
  }

  /**
   * Generate Constraints and Considerations section
   */
  private generateConstraintsAndConsiderations(
    initialAnalysis: InitialMdAnalysis,
    contextualEnrichment: ContextualEnrichment
  ): string {
    let content = `**Technical Constraints:**\n\n`;

    if (initialAnalysis.constraints.length > 0) {
      initialAnalysis.constraints.forEach(constraint => {
        content += `- ${constraint}\n`;
      });
    } else {
      content += `- [Define technical limitations and dependencies]\n`;
      content += `- [Include infrastructure and platform constraints]\n`;
      content += `- [Specify integration requirements]\n`;
    }
    content += '\n';

    content += `**Business Constraints:**\n\n`;
    content += `- Timeline: [Specify project deadline]\n`;
    content += `- Budget: [Define budget limitations]\n`;
    content += `- Resources: [Specify team size and expertise]\n`;
    content += `- Compliance: [List regulatory requirements]\n\n`;

    if (initialAnalysis.considerations.length > 0) {
      content += `**Additional Considerations:**\n\n`;
      initialAnalysis.considerations.forEach(consideration => {
        content += `- ${consideration}\n`;
      });
      content += '\n';
    }

    content += `**Security Considerations:**\n\n`;
    contextualEnrichment.securityConsiderations.forEach(consideration => {
      content += `- ${consideration}\n`;
    });
    content += '\n';

    if (contextualEnrichment.antiPatternWarnings.length > 0) {
      content += `**Anti-Pattern Warnings:**\n\n`;
      contextualEnrichment.antiPatternWarnings.forEach(warning => {
        content += `- ${warning}\n`;
      });
      content += '\n';
    }

    return content;
  }

  /**
   * Calculate confidence score for generated content
   */
  private calculateConfidenceScore(
    initialAnalysis: InitialMdAnalysis,
    codebaseInsights: CodebaseInsights
  ): number {
    let score = 0.5; // Base score

    // Boost confidence based on available information
    if (initialAnalysis.feature && initialAnalysis.feature.length > 50) score += 0.2;
    if (initialAnalysis.examples.length > 0) score += 0.1;
    if (initialAnalysis.considerations.length > 0) score += 0.1;
    if (codebaseInsights.technologies.length > 0) score += 0.2;
    if (codebaseInsights.architecture.length > 0) score += 0.1;

    return Math.min(1.0, score);
  }

  /**
   * Extract list items from text
   */
  private extractListItems(content: string): string[] {
    const items: string[] = [];

    // Extract bullet points
    const bulletMatches = content.match(/^[\s]*[-*+]\s(.+)$/gm);
    if (bulletMatches) {
      items.push(...bulletMatches.map(match => match.replace(/^[\s]*[-*+]\s/, '').trim()));
    }

    // Extract numbered lists
    const numberedMatches = content.match(/^[\s]*\d+\.\s(.+)$/gm);
    if (numberedMatches) {
      items.push(...numberedMatches.map(match => match.replace(/^[\s]*\d+\.\s/, '').trim()));
    }

    return items.filter(item => item.length > 2 && !item.includes('[') && !item.includes(']'));
  }
}