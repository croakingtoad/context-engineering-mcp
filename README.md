# Context Engineering MCP Server

A standalone Model Context Protocol (MCP) server that implements Cole Medin's context engineering methodology for creating comprehensive Product Requirements Prompts (PRPs).

## Features

- **Interactive PRP Generation**: Create detailed product requirements prompts using proven templates
- **Template Library**: Access to Cole Medin's context engineering templates via git subtree integration
- **Modular Architecture**: Clean separation of tools, resources, and core logic
- **Multiple Output Formats**: Generate PRPs in Markdown, JSON, or HTML formats
- **Template Search & Validation**: Find suitable templates and validate PRP quality
- **Custom Templates**: Create and manage custom PRP templates

## MCP Tools

### 1. `list_templates`
List all available PRP templates with optional category filtering.

### 2. `generate_prp`
Generate a Product Requirements Prompt based on a template and project context.

### 3. `validate_prp`
Validate a PRP against context engineering best practices.

### 4. `search_templates`
Search for templates by name, description, or tags.

### 5. `create_custom_template`
Create new custom PRP templates.

### 6. `analyze_context`
Analyze project context to recommend suitable templates and improvements.

## MCP Resources

- **Templates**: Collection of PRP templates (`context-engineering://templates`)
- **Methodologies**: Context engineering workflows (`context-engineering://methodologies`)
- **Examples**: Example PRPs from Cole's methodology (`context-engineering://examples`)
- **Best Practices**: Guidelines and best practices (`context-engineering://best-practices`)
- **Workflows**: Interactive step-by-step workflows (`context-engineering://workflows`)

## Project Structure

```
├── src/
│   ├── tools/          # MCP tool implementations
│   ├── resources/      # MCP resource handlers
│   ├── lib/            # Core logic (TemplateManager, PRPGenerator)
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Main server entry point
├── templates/          # Internal PRP templates
├── external/           # Git subtree for Cole's repo
│   └── context-engineering-intro/
├── scripts/            # Utility scripts
│   └── sync-templates.sh
├── test/               # Test suites
└── dist/               # Built JavaScript output
```

## Development Setup

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone or create project directory
cd context-engineering-mcp-server

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Sync external templates
npm run sync-templates
```

### Development Commands

```bash
# Watch mode for development
npm run dev

# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Run tests with coverage
npm run test:coverage

# Update external templates
npm run sync-templates
```

## Architecture

### Transport
- **Protocol**: HTTP Streamable (modern MCP standard)
- **Transport**: StdioServerTransport for MCP client communication

### Core Components

#### TemplateManager
- Loads templates from internal and external directories
- Provides search, filtering, and categorization
- Handles template validation and caching

#### PRPGenerator
- Generates PRPs from templates with context substitution
- Supports multiple output formats (Markdown, JSON, HTML)
- Handles custom sections and metadata

### External Integration

The project uses git subtree to integrate Cole Medin's context-engineering-intro repository:

```bash
# Updates are managed via:
./scripts/sync-templates.sh
```

## Usage

### As MCP Server

Configure your MCP client to connect to this server for context engineering capabilities.

### Template Development

Add new templates to `templates/` directory following the JSON schema defined in `src/types/index.ts`.

Example template structure:
```json
{
  "id": "template-id",
  "name": "Template Name",
  "description": "Template description",
  "category": "category-name",
  "sections": [
    {
      "title": "Section Title",
      "content": "Content with {{projectName}} placeholders",
      "examples": ["Example 1", "Example 2"],
      "requirements": ["Requirement 1", "Requirement 2"]
    }
  ]
}
```

## Testing

The project follows Test-Driven Development (TDD) principles:

- **Project Structure Tests**: Validate directory structure and configuration
- **Dependency Tests**: Ensure proper package resolution
- **Unit Tests**: Test individual components (planned)
- **Integration Tests**: Test tool and resource handlers (planned)

Run tests with:
```bash
npm test
```

## Contributing

1. Follow TDD approach - write tests first
2. Use TypeScript with strict mode
3. Follow ESLint and Prettier configurations
4. Update tests when adding new features
5. Keep external templates synced via git subtree

## License

MIT License