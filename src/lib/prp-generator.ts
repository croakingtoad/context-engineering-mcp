import {
  PRPTemplate,
  PRPSection,
  PRPGenerationRequest,
  PRPGenerationRequestSchema,
} from '../types/index.js';
import { TemplateManager } from './template-manager.js';

export class PRPGenerator {
  private templateManager: TemplateManager;

  constructor(templateManager: TemplateManager) {
    this.templateManager = templateManager;
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