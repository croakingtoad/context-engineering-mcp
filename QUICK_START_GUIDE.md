# Quick Start Guide - Context Engineering MCP Server

> **Attribution**: This MCP server implements [Cole Medin's context engineering methodology](https://github.com/coleam00/context-engineering-intro). All credit for the original methodology and templates goes to Cole Medin.

## 🚀 5-Minute Setup

### 1. Clone & Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/locomotive-agency/context-engineering-mcp.git
cd context-engineering-mcp

# Install dependencies and build
npm install && npm run build

# Verify installation
npm test
```

### 2. Choose Your Integration (1 minute)

#### Option A: Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "context-engineering": {
      "command": "node",
      "args": ["/absolute/path/to/context-engineering-mcp/dist/index.js"],
      "env": {
        "TEMPLATES_DIR": "/absolute/path/to/context-engineering-mcp/templates",
        "EXTERNAL_TEMPLATES_DIR": "/absolute/path/to/context-engineering-mcp/external/context-engineering-intro",
        "DATA_DIR": "/absolute/path/to/context-engineering-mcp/data"
      }
    }
  }
}
```

#### Option B: Claude Code

```bash
claude-code mcp add context-engineering /absolute/path/to/context-engineering-mcp/dist/index.js
```

### 3. Test the Integration (2 minutes)

#### Quick Demo
```bash
node demo-integration.js
```

#### First PRP Generation
Open Claude and try:

```
Use the list_templates tool to show me available PRP templates.
```

Then:

```
Use the generate_prp tool to create a PRP for a Next.js e-commerce project with:
- Project name: "ShopFast"
- Domain: "retail"
- Stakeholders: ["Product Manager", "Engineering Team", "UX Designer"]
- Objectives: ["Build scalable platform", "Implement modern checkout"]
- Constraints: ["Budget: $75k", "Timeline: 4 months"]

Use the "nextjs-app-template" template and save to storage.
```

## 🛠️ Available MCP Tools (9 Total)

### Core Context Engineering
- **`list_templates`** - Discover available PRP templates
- **`generate_prp`** - Generate PRPs with context substitution
- **`validate_prp`** - Validate PRPs against best practices
- **`search_templates`** - Find templates by keywords
- **`create_custom_template`** - Build new templates
- **`analyze_context`** - Get template recommendations

### Storage & Management
- **`list_prps`** - View stored PRPs with filtering
- **`update_prp`** - Modify PRPs with version tracking
- **`manage_storage`** - Storage operations and backup

## 📚 Available MCP Resources (5 Total)

Access via URI pattern `context-engineering://resource-name`:

- **`templates`** - PRP template collection
- **`patterns`** - Code analysis patterns
- **`initial`** - INITIAL.md generation templates
- **`rules`** - Context engineering rules and guidelines
- **`prps`** - Your stored PRPs

## 🎯 Common Workflows

### Workflow 1: New Project PRP

```
1. analyze_context - Get project recommendations
2. list_templates - Browse available templates
3. generate_prp - Create your PRP
4. validate_prp - Ensure quality
5. list_prps - Verify storage
```

### Workflow 2: Template Discovery

```
1. search_templates - Find templates by keyword
2. Read context-engineering://templates/{template-id}
3. create_custom_template - Adapt for your needs
```

### Workflow 3: PRP Management

```
1. list_prps - View existing PRPs
2. update_prp - Modify requirements
3. generate_prp - Create variations
4. manage_storage - Backup and organize
```

## ⚙️ Configuration Options

### Environment Variables

```bash
# Template locations
TEMPLATES_DIR="/path/to/templates"
EXTERNAL_TEMPLATES_DIR="/path/to/external/context-engineering-intro"

# Storage configuration
DATA_DIR="/path/to/data"
NODE_ENV="production"

# Integration settings (optional)
ARCHON_ENABLED="true"
ARCHON_HEALTH_CHECK_INTERVAL="30000"
```

### Advanced Claude Desktop Config

```json
{
  "mcpServers": {
    "context-engineering": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "TEMPLATES_DIR": "/path/to/templates",
        "EXTERNAL_TEMPLATES_DIR": "/path/to/external/context-engineering-intro",
        "DATA_DIR": "/path/to/data",
        "NODE_ENV": "production",
        "ARCHON_ENABLED": "true"
      }
    }
  }
}
```

## 🔧 Troubleshooting

### Common Issues

**"Module not found" errors**
```bash
# Rebuild the project
npm run build
```

**"Templates not loading"**
```bash
# Check template directories exist
ls templates/
ls external/context-engineering-intro/
```

**"Storage errors"**
```bash
# Ensure data directory is writable
mkdir -p data && chmod 755 data
```

### Debug Mode

```bash
# Run with debug logging
DEBUG=* node dist/index.js
```

### Test Individual Components

```bash
# Test template loading
npm run test:unit

# Test MCP integration
npm run test:integration

# Test complete workflows
npm run test:e2e
```

## 📖 Example Use Cases

### Use Case 1: Web Application
```
Project: Online Learning Platform
Template: web-app-template
Context: React, Node.js, PostgreSQL
Stakeholders: Educators, Students, Admins
```

### Use Case 2: Mobile App
```
Project: Fitness Tracking App
Template: mobile-app-template
Context: React Native, Firebase, Health APIs
Stakeholders: Users, Trainers, Healthcare Providers
```

### Use Case 3: API Service
```
Project: Payment Processing API
Template: api-service-template
Context: Express.js, PostgreSQL, Stripe
Stakeholders: Frontend Teams, Finance, Compliance
```

### Use Case 4: Data Pipeline
```
Project: Analytics ETL Pipeline
Template: data-pipeline-template
Context: Python, Apache Airflow, BigQuery
Stakeholders: Data Scientists, Engineers, Business
```

## 🎓 Learning Resources

### Cole Medin's Original Work
- **Repository**: https://github.com/coleam00/context-engineering-intro
- **Methodology**: Study Cole's systematic approach
- **Templates**: Understand the foundational patterns

### MCP Documentation
- **Specification**: https://spec.modelcontextprotocol.io/
- **Claude Desktop**: Configure MCP servers
- **Claude Code**: Command-line MCP integration

### This Implementation
- **README.md**: Complete documentation
- **CONTRIBUTING.md**: Development guidelines
- **Issue Templates**: Bug reports and feature requests

## 🤝 Getting Help

### Quick Support
1. **Check the logs** in your MCP client
2. **Run the demo** to verify basic functionality
3. **Check file paths** in your configuration
4. **Review test output** with `npm test`

### Community Support
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community help
- **Documentation**: Comprehensive guides in the repository

### Development Support
- **Contributing Guide**: CONTRIBUTING.md
- **Test Suite**: 58 tests covering all functionality
- **Code Examples**: Throughout documentation

---

## 🎉 You're Ready!

Your Context Engineering MCP Server is now configured and ready to automate Cole Medin's excellent methodology. Start by generating your first PRP and experience the power of context-aware requirements engineering!

**Next Steps:**
1. Generate your first PRP with `generate_prp`
2. Explore available templates with `list_templates`
3. Create custom templates for your domains
4. Integrate with your development workflow
5. Contribute improvements back to the community

**Remember**: This builds upon Cole Medin's foundational work. Consider contributing valuable templates and improvements to his original repository as well!