import {
  PRPTemplate,
  PRPSection,
  PRPGenerationRequest,
  PRPGenerationRequestSchema,
  ContentSynthesis,
} from '../types/index.js';
import { TemplateManager } from './template-manager.js';
import { ContentSynthesizer } from './content-synthesizer.js';

export class PRPGenerator {
  private templateManager: TemplateManager;
  private contentSynthesizer: ContentSynthesizer;

  constructor(templateManager: TemplateManager) {
    this.templateManager = templateManager;
    this.contentSynthesizer = new ContentSynthesizer();
  }

  /**
   * Generate a PRP based on the request parameters
   */
  async generatePRP(request: PRPGenerationRequest): Promise<string> {
    // Validate the request
    const validatedRequest = PRPGenerationRequestSchema.parse(request);

    // Get the template
    const template = this.templateManager.getTemplate(validatedRequest.templateId);
    if (!template) {
      throw new Error(`Template with ID ${validatedRequest.templateId} not found`);
    }

    // Generate the PRP content
    const prpContent = await this.buildPRP(template, validatedRequest);

    // Format according to requested output format
    return this.formatOutput(prpContent, validatedRequest.outputFormat);
  }

  /**
   * Generate an intelligent PRP from INITIAL.md and optional codebase analysis
   */
  async generateIntelligentPRP(
    initialMdPath: string,
    projectPath?: string,
    templateId?: string,
    domain?: string,
    outputFormat: 'markdown' | 'json' | 'html' = 'markdown'
  ): Promise<string> {
    // Synthesize content from INITIAL.md and codebase
    const contentSynthesis = await this.contentSynthesizer.synthesizeContent(
      initialMdPath,
      projectPath,
      domain
    );

    // Generate PRP content using synthesized insights
    const prpContent = await this.buildIntelligentPRP(contentSynthesis, templateId);

    // Format according to requested output format
    return this.formatOutput(prpContent, outputFormat);
  }

  /**
   * Generate a PRP with enhanced contextual analysis
   */
  async generateContextualPRP(
    request: PRPGenerationRequest,
    initialMdPath?: string,
    projectPath?: string
  ): Promise<string> {
    // Validate the request
    const validatedRequest = PRPGenerationRequestSchema.parse(request);

    // Get the template
    const template = this.templateManager.getTemplate(validatedRequest.templateId);
    if (!template) {
      throw new Error(`Template with ID ${validatedRequest.templateId} not found`);
    }

    let contentSynthesis: ContentSynthesis | undefined;

    // If INITIAL.md or project path provided, perform intelligent synthesis
    if (initialMdPath || projectPath) {
      contentSynthesis = await this.contentSynthesizer.synthesizeContent(
        initialMdPath || '',
        projectPath,
        validatedRequest.projectContext.domain
      );
    }

    // Build enhanced PRP content
    const prpContent = await this.buildEnhancedPRP(template, validatedRequest, contentSynthesis);

    // Format according to requested output format
    return this.formatOutput(prpContent, validatedRequest.outputFormat);
  }

  /**
   * Build the PRP content from template and request
   */
  private async buildPRP(
    template: PRPTemplate,
    request: PRPGenerationRequest
  ): Promise<{ sections: PRPSection[]; metadata: any }> {
    const sections: PRPSection[] = [];

    // Process template sections
    for (const section of template.sections) {
      const processedSection = await this.processSection(section, request);
      sections.push(processedSection);
    }

    // Add custom sections if provided
    if (request.customSections) {
      sections.push(...request.customSections);
    }

    return {
      sections,
      metadata: {
        template: template.name,
        templateVersion: template.version,
        generatedAt: new Date().toISOString(),
        projectContext: request.projectContext,
      },
    };
  }

  /**
   * Build intelligent PRP content from synthesized content
   */
  private async buildIntelligentPRP(
    contentSynthesis: ContentSynthesis,
    templateId?: string
  ): Promise<{ sections: PRPSection[]; metadata: any }> {
    const sections: PRPSection[] = [];

    // Use template if provided, otherwise create sections from synthesized content
    let template: PRPTemplate | null = null;
    if (templateId) {
      template = this.templateManager.getTemplate(templateId);
    }

    if (template) {
      // Enhance template sections with synthesized content
      for (const templateSection of template.sections) {
        const enhancedSection = await this.enhanceSectionWithSynthesis(
          templateSection,
          contentSynthesis
        );
        sections.push(enhancedSection);
      }
    } else {
      // Create sections directly from synthesized content
      sections.push(...this.createSectionsFromSynthesis(contentSynthesis));
    }

    return {
      sections,
      metadata: {
        generationMethod: 'intelligent-synthesis',
        template: template?.name || 'Generated from analysis',
        templateVersion: template?.version || '1.0',
        generatedAt: new Date().toISOString(),
        projectContext: {
          name: 'Generated Project',
          domain: 'Inferred from analysis',
        },
        contentSynthesis: {
          confidenceScore: contentSynthesis.generatedContent.metadata.confidenceScore,
          sourcesUsed: contentSynthesis.generatedContent.metadata.sourcesUsed,
        },
      },
    };
  }

  /**
   * Build enhanced PRP content combining template with synthesis
   */
  private async buildEnhancedPRP(
    template: PRPTemplate,
    request: PRPGenerationRequest,
    contentSynthesis?: ContentSynthesis
  ): Promise<{ sections: PRPSection[]; metadata: any }> {
    const sections: PRPSection[] = [];

    // Process template sections with potential synthesis enhancement
    for (const section of template.sections) {
      let processedSection: PRPSection;

      if (contentSynthesis) {
        // Enhanced processing with synthesis
        processedSection = await this.enhanceSectionWithSynthesis(section, contentSynthesis);
        // Apply context substitution
        processedSection = await this.processSection(processedSection, request);
      } else {
        // Standard processing
        processedSection = await this.processSection(section, request);
      }

      sections.push(processedSection);
    }

    // Add custom sections if provided
    if (request.customSections) {
      sections.push(...request.customSections);
    }

    return {
      sections,
      metadata: {
        generationMethod: contentSynthesis ? 'enhanced-template' : 'template-based',
        template: template.name,
        templateVersion: template.version,
        generatedAt: new Date().toISOString(),
        projectContext: request.projectContext,
        contentSynthesis: contentSynthesis ? {
          confidenceScore: contentSynthesis.generatedContent.metadata.confidenceScore,
          sourcesUsed: contentSynthesis.generatedContent.metadata.sourcesUsed,
        } : undefined,
      },
    };
  }

  /**
   * Process a single section with context substitution
   */
  private async processSection(
    section: PRPSection,
    request: PRPGenerationRequest
  ): Promise<PRPSection> {
    const processedSection: PRPSection = {
      ...section,
      title: this.substituteContext(section.title, request.projectContext),
      content: this.substituteContext(section.content, request.projectContext),
    };

    // Process examples if present
    if (section.examples) {
      processedSection.examples = section.examples.map(example =>
        this.substituteContext(example, request.projectContext)
      );
    }

    // Process requirements if present
    if (section.requirements) {
      processedSection.requirements = section.requirements.map(requirement =>
        this.substituteContext(requirement, request.projectContext)
      );
    }

    return processedSection;
  }

  /**
   * Substitute context variables in text
   */
  private substituteContext(text: string, context: any): string {
    let result = text;

    // Replace project name
    result = result.replace(/\{\{projectName\}\}/g, context.name || 'Your Project');

    // Replace domain
    result = result.replace(/\{\{domain\}\}/g, context.domain || 'software development');

    // Replace stakeholders
    if (context.stakeholders) {
      result = result.replace(
        /\{\{stakeholders\}\}/g,
        context.stakeholders.join(', ')
      );
    }

    // Replace objectives
    if (context.objectives) {
      result = result.replace(
        /\{\{objectives\}\}/g,
        context.objectives.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n')
      );
    }

    // Replace constraints
    if (context.constraints) {
      result = result.replace(
        /\{\{constraints\}\}/g,
        context.constraints.map((constraint: string, i: number) => `${i + 1}. ${constraint}`).join('\n')
      );
    }

    return result;
  }

  /**
   * Format the output according to the specified format
   */
  private formatOutput(
    prpContent: { sections: PRPSection[]; metadata: any },
    format: 'markdown' | 'json' | 'html'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(prpContent, null, 2);

      case 'html':
        return this.formatAsHTML(prpContent);

      case 'markdown':
      default:
        return this.formatAsMarkdown(prpContent);
    }
  }

  /**
   * Format as Markdown
   */
  private formatAsMarkdown(prpContent: { sections: PRPSection[]; metadata: any }): string {
    let markdown = `# Product Requirements Prompt\n\n`;

    // Add metadata
    markdown += `> **Generated from:** ${prpContent.metadata.template}\n`;
    markdown += `> **Project:** ${prpContent.metadata.projectContext.name}\n`;
    markdown += `> **Domain:** ${prpContent.metadata.projectContext.domain}\n`;
    markdown += `> **Generated at:** ${prpContent.metadata.generatedAt}\n\n`;

    // Add sections
    for (const section of prpContent.sections) {
      markdown += `## ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;

      if (section.examples && section.examples.length > 0) {
        markdown += `### Examples\n\n`;
        for (const example of section.examples) {
          markdown += `- ${example}\n`;
        }
        markdown += `\n`;
      }

      if (section.requirements && section.requirements.length > 0) {
        markdown += `### Requirements\n\n`;
        for (const requirement of section.requirements) {
          markdown += `- ${requirement}\n`;
        }
        markdown += `\n`;
      }
    }

    return markdown;
  }

  /**
   * Enhance template section with synthesized content
   */
  private async enhanceSectionWithSynthesis(
    section: PRPSection,
    contentSynthesis: ContentSynthesis
  ): Promise<PRPSection> {
    const sectionTitleLower = section.title.toLowerCase();
    const generatedSections = contentSynthesis.generatedContent.sections;

    // Find matching generated section
    const matchingGeneratedSection = Object.entries(generatedSections).find(
      ([key]) => key.toLowerCase().includes(sectionTitleLower) ||
                 sectionTitleLower.includes(key.toLowerCase())
    );

    if (matchingGeneratedSection) {
      const [, generatedContent] = matchingGeneratedSection;

      return {
        ...section,
        content: this.mergeContent(section.content, generatedContent),
        metadata: {
          ...section.metadata,
          enhanced: true,
          synthesisConfidence: contentSynthesis.generatedContent.metadata.confidenceScore,
        },
      };
    }

    return section;
  }

  /**
   * Create sections directly from synthesis
   */
  private createSectionsFromSynthesis(contentSynthesis: ContentSynthesis): PRPSection[] {
    const sections: PRPSection[] = [];
    const generatedSections = contentSynthesis.generatedContent.sections;

    Object.entries(generatedSections).forEach(([title, content]) => {
      sections.push({
        title,
        content,
        metadata: {
          generatedFromSynthesis: true,
          synthesisConfidence: contentSynthesis.generatedContent.metadata.confidenceScore,
          sourcesUsed: contentSynthesis.generatedContent.metadata.sourcesUsed,
        },
      });
    });

    return sections;
  }

  /**
   * Intelligently merge template content with generated content
   */
  private mergeContent(templateContent: string, generatedContent: string): string {
    // If template content has placeholders, replace them
    if (templateContent.includes('{{') || templateContent.includes('[')) {
      const placeholderPattern = /\{\{[^}]+\}\}|\[.*?\]/g;
      const placeholders = templateContent.match(placeholderPattern);

      if (placeholders && placeholders.length > 0) {
        // Replace placeholders with relevant generated content
        let mergedContent = templateContent;

        placeholders.forEach(placeholder => {
          // Extract a relevant excerpt from generated content
          const lines = generatedContent.split('\n');
          const relevantLine = lines.find(line => line.trim().length > 20) || lines[0] || '';
          mergedContent = mergedContent.replace(placeholder, relevantLine.trim());
        });

        // Append additional generated content
        if (generatedContent.length > templateContent.length) {
          mergedContent += '\n\n' + generatedContent;
        }

        return mergedContent;
      }
    }

    // If template content is minimal, prefer generated content
    if (templateContent.length < 100 && generatedContent.length > 100) {
      return generatedContent;
    }

    // If both have substantial content, combine them intelligently
    if (templateContent.length > 50 && generatedContent.length > 50) {
      return templateContent + '\n\n' + generatedContent;
    }

    // Default: prefer longer content
    return templateContent.length > generatedContent.length ? templateContent : generatedContent;
  }

  /**
   * Format as HTML
   */
  private formatAsHTML(prpContent: { sections: PRPSection[]; metadata: any }): string {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Requirements Prompt</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .metadata { background-color: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .requirements, .examples { margin-left: 20px; }
    </style>
</head>
<body>
    <h1>Product Requirements Prompt</h1>

    <div class="metadata">
        <p><strong>Generated from:</strong> ${prpContent.metadata.template}</p>
        <p><strong>Project:</strong> ${prpContent.metadata.projectContext.name}</p>
        <p><strong>Domain:</strong> ${prpContent.metadata.projectContext.domain}</p>
        <p><strong>Generated at:</strong> ${prpContent.metadata.generatedAt}</p>
    </div>
`;

    for (const section of prpContent.sections) {
      html += `    <div class="section">
        <h2>${section.title}</h2>
        <p>${section.content.replace(/\n/g, '<br>')}</p>
`;

      if (section.examples && section.examples.length > 0) {
        html += `        <h3>Examples</h3>
        <ul class="examples">
`;
        for (const example of section.examples) {
          html += `            <li>${example}</li>\n`;
        }
        html += `        </ul>
`;
      }

      if (section.requirements && section.requirements.length > 0) {
        html += `        <h3>Requirements</h3>
        <ul class="requirements">
`;
        for (const requirement of section.requirements) {
          html += `            <li>${requirement}</li>\n`;
        }
        html += `        </ul>
`;
      }

      html += `    </div>
`;
    }

    html += `</body>
</html>`;

    return html;
  }
}