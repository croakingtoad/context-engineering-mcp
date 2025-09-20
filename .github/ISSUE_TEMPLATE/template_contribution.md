---
name: Template contribution
about: Contribute a new PRP template or improve existing templates
title: '[TEMPLATE] '
labels: 'template, enhancement'
assignees: ''
---

## Template Overview

**Template Name**:
**Category**: (e.g., web-app, mobile-app, api, data-pipeline, etc.)
**Description**: A brief description of what this template is for

## Template Type

- [ ] **New Template** - Contributing a completely new template
- [ ] **Template Enhancement** - Improving an existing template
- [ ] **Template Fix** - Fixing issues in an existing template

## Template Details

### Target Use Cases

Describe the specific scenarios where this template would be most useful:

1. **Primary Use Case**:
2. **Secondary Use Case**:
3. **Edge Cases**:

### Technology Stack

What technologies, frameworks, or domains does this template target?

- **Languages**: (e.g., JavaScript, Python, Java)
- **Frameworks**: (e.g., React, Next.js, Express, Django)
- **Platforms**: (e.g., Web, Mobile, Cloud, Desktop)
- **Domain**: (e.g., E-commerce, Healthcare, FinTech, Gaming)

## Template Structure

### Sections Included

List the main sections your template includes:

- [ ] Project Overview
- [ ] Technical Requirements
- [ ] Functional Requirements
- [ ] Non-Functional Requirements
- [ ] Architecture & Design
- [ ] User Stories
- [ ] Acceptance Criteria
- [ ] Technical Constraints
- [ ] Security Requirements
- [ ] Performance Requirements
- [ ] Integration Requirements
- [ ] Deployment Requirements
- [ ] Testing Strategy
- [ ] Other: _____________

### Template JSON

Please provide your template in JSON format following the schema:

```json
{
  "id": "your-template-id",
  "name": "Your Template Name",
  "description": "Template description",
  "category": "category-name",
  "tags": ["tag1", "tag2", "tag3"],
  "version": "1.0.0",
  "author": "Your Name",
  "sections": [
    {
      "title": "Section Title",
      "content": "Section content with {{projectName}} placeholders",
      "examples": [
        "Example 1",
        "Example 2"
      ],
      "requirements": [
        "Requirement 1",
        "Requirement 2"
      ]
    }
  ],
  "metadata": {
    "complexity": "medium",
    "estimatedTime": "2-4 hours",
    "prerequisites": ["prerequisite1", "prerequisite2"]
  }
}
```

## Cole Medin Attribution

**Relationship to Cole's Work**:
- [ ] Based on existing template from Cole's repository
- [ ] Extension of Cole's methodology
- [ ] New template following Cole's principles
- [ ] Other: _____________

**Have you considered contributing this to Cole's original repository?**
- [ ] Yes, already contributed
- [ ] Yes, planning to contribute
- [ ] No, specific to MCP implementation
- [ ] Unsure

## Testing

**How have you tested this template?**

- [ ] Generated PRPs using this template
- [ ] Validated with real project scenarios
- [ ] Reviewed by domain experts
- [ ] Used in production projects
- [ ] Other: _____________

**Test Results**:
Describe the results of your testing, including any sample PRPs generated.

## Quality Checklist

- [ ] Template follows the JSON schema
- [ ] All placeholder variables are clearly defined
- [ ] Examples are relevant and helpful
- [ ] Requirements are specific and actionable
- [ ] Template is well-categorized with appropriate tags
- [ ] Documentation is clear and comprehensive
- [ ] Template has been tested with sample projects

## Additional Context

**Why is this template needed?**
Explain the gap this template fills or the improvement it provides.

**Related Templates**:
Are there existing templates that are similar? How does this one differ?

**Future Enhancements**:
Are there planned improvements or extensions for this template?

---

**Note**: Templates that enhance the core context engineering methodology might also be valuable contributions to [Cole Medin's original repository](https://github.com/coleam00/context-engineering-intro). Please consider cross-posting valuable template contributions.