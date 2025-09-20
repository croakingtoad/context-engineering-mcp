# Contributing to Context Engineering MCP Server

Thank you for your interest in contributing to the Context Engineering MCP Server! This project builds upon Cole Medin's excellent context engineering methodology and we welcome contributions from the community.

## 🎯 Overview

This project is an MCP (Model Context Protocol) server that automates [Cole Medin's context engineering methodology](https://github.com/coleam00/context-engineering-intro) for creating comprehensive Product Requirements Prompts (PRPs). We aim to make context engineering accessible and automated while maintaining the quality and principles of Cole's original work.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- TypeScript knowledge
- Familiarity with MCP concepts

### Setup Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/your-username/context-engineering-mcp.git
cd context-engineering-mcp

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Run tests to ensure everything works
npm test

# Start the development server
npm run dev
```

## 📋 Development Workflow

### Test-Driven Development (TDD)

This project follows strict TDD principles:

1. **Write tests first** - Before implementing any feature, write comprehensive tests
2. **Make tests pass** - Implement the minimal code needed to pass tests
3. **Refactor** - Improve code quality while maintaining test coverage
4. **Repeat** - Continue the cycle for each new feature

### Code Standards

#### TypeScript

- Use TypeScript strict mode
- Provide comprehensive type definitions
- Use Zod for runtime validation
- Follow functional programming principles where appropriate

#### Testing

```bash
# Run all test suites
npm test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance tests only

# Watch mode for development
npm run test:watch

# Coverage reporting
npm run test:coverage
```

#### Code Quality

```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Type checking
npm run type-check

# Full validation pipeline
npm run validate
```

## 🏗️ Project Architecture

### Core Components

#### MCP Tools (9 Available)
Located in `src/tools/`:
- **Context Engineering**: `generate-prp.ts`, `validate-prp.ts`, `list-templates.ts`, etc.
- **Storage Management**: `list-prps.ts`, `update-prp.ts`, `manage-storage.ts`

#### MCP Resources (5 Available)
Located in `src/resources/handlers/`:
- Templates, Patterns, Initial, Rules, PRPs

#### Core Libraries
Located in `src/lib/`:
- `template-manager.ts` - Template loading and management
- `prp-generator.ts` - PRP generation engine
- `storage.ts` - Persistent storage system
- `integrations.ts` - External system integrations

### Integration with Cole's Work

This project integrates Cole Medin's templates via git subtree:

```bash
# Sync with Cole's latest templates
./scripts/sync-templates.sh

# The external templates are in:
external/context-engineering-intro/
```

**Important**: Always maintain attribution to Cole's work and ensure any changes to external templates are done via the sync script.

## 🛠️ Contribution Types

### 1. Bug Fixes

- Create an issue first describing the bug
- Include reproduction steps and expected vs actual behavior
- Write tests that demonstrate the bug
- Fix the bug while maintaining test coverage
- Update documentation if needed

### 2. New Features

#### MCP Tools
- Follow the existing tool pattern in `src/tools/`
- Implement comprehensive input validation with Zod
- Add tool definition to `src/tools/index.ts`
- Write full test coverage including error cases

#### MCP Resources
- Implement resource handlers in `src/resources/handlers/`
- Follow the base handler pattern
- Register with the resource manager
- Provide comprehensive documentation

#### Core Features
- Discuss significant changes in an issue first
- Maintain backward compatibility
- Update all affected tests and documentation
- Consider impact on integrations

### 3. Template Contributions

Templates should generally be contributed to [Cole's original repository](https://github.com/coleam00/context-engineering-intro) first, then synced to this project.

For internal templates (in `templates/`):
- Follow the JSON schema in `src/types/index.ts`
- Include comprehensive examples and requirements
- Add appropriate categorization and tags
- Test template generation thoroughly

### 4. Documentation

- Keep README.md up to date with new features
- Update inline code documentation
- Add usage examples for new functionality
- Ensure configuration examples are accurate

## 📝 Pull Request Process

### Before Submitting

1. **Issue First**: Create or reference an issue describing the change
2. **Tests Pass**: Ensure all tests pass (`npm run validate`)
3. **Coverage**: Maintain or improve test coverage
4. **Documentation**: Update relevant documentation
5. **Attribution**: Maintain proper attribution to Cole's work

### PR Requirements

1. **Clear Description**: Explain what the PR does and why
2. **Testing**: Include test results and coverage information
3. **Breaking Changes**: Clearly mark any breaking changes
4. **Dependencies**: Explain any new dependencies added

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: Maintainers will review code quality and design
3. **Testing**: Reviewers will test functionality where appropriate
4. **Documentation**: Ensure docs accurately reflect changes

## 🧪 Testing Guidelines

### Test Structure

```
test/
├── unit/           # Test individual functions/classes
├── integration/    # Test MCP tool and resource handlers
├── e2e/           # Test complete workflows
└── performance/   # Test under load and stress
```

### Writing Tests

```typescript
// Example test structure
describe('TemplateManager', () => {
  describe('loadTemplates', () => {
    it('should load internal templates successfully', async () => {
      // Arrange
      const manager = new TemplateManager('./templates', './external');

      // Act
      await manager.initialize();

      // Assert
      expect(manager.getTemplateCount()).toBeGreaterThan(0);
    });

    it('should handle missing template directory gracefully', async () => {
      // Test error handling
    });
  });
});
```

### Test Coverage Requirements

- **Minimum 80%** overall coverage
- **95%+ coverage** for critical paths (PRP generation, storage)
- **100% coverage** for new features
- **Error path testing** for all public APIs

## 🔧 Configuration & Environment

### Environment Variables

- `NODE_ENV` - Environment mode (development, test, production)
- `TEMPLATES_DIR` - Internal templates directory
- `EXTERNAL_TEMPLATES_DIR` - Cole's templates directory
- `DATA_DIR` - Storage directory for tests and development

### Development Configuration

```bash
# Run with different configurations
TEMPLATES_DIR=./test-templates npm test
NODE_ENV=development npm run dev
```

## 🚨 Code of Conduct

### Attribution Requirements

- **Always credit Cole Medin** for the original methodology
- **Link to his repository** in relevant documentation
- **Maintain copyright notices** in derivative works
- **Respect open source principles** throughout

### Quality Standards

- **No breaking changes** without major version bump
- **Comprehensive testing** for all new features
- **Clear documentation** for all public APIs
- **Performance considerations** for all changes

### Communication

- **Be respectful** in all interactions
- **Provide constructive feedback** in reviews
- **Ask questions** when unsure about requirements
- **Collaborate openly** on design decisions

## 🔗 Useful Links

### Development Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Zod Validation](https://zod.dev/)

### Project-Specific

- [Cole's Original Repository](https://github.com/coleam00/context-engineering-intro)
- [Archon MCP Integration](https://github.com/JakeVdub/archon-mcp)
- [GitHub Issues](https://github.com/locomotive-agency/context-engineering-mcp/issues)

## ❓ Getting Help

### Where to Ask Questions

1. **GitHub Discussions** - General questions and ideas
2. **GitHub Issues** - Bug reports and feature requests
3. **Pull Request Comments** - Code-specific questions
4. **Documentation** - Check README and inline docs first

### What to Include

When asking for help, include:
- **Environment details** (Node.js version, OS, etc.)
- **Steps to reproduce** any issues
- **Expected vs actual behavior**
- **Relevant log output** or error messages
- **Code samples** when appropriate

## 📦 Release Process

### Versioning

We follow [Semantic Versioning (SemVer)](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Release Checklist

1. Update version in `package.json`
2. Update CHANGELOG.md with release notes
3. Ensure all tests pass
4. Update documentation as needed
5. Create release PR for review
6. Tag release after merge
7. Publish to npm (if applicable)

---

Thank you for contributing to the Context Engineering MCP Server! Your contributions help make Cole Medin's excellent methodology more accessible to the development community.

**Remember**: This project builds upon Cole Medin's foundation - let's maintain the quality and spirit of his original work while making it more accessible through automation.