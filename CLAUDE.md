# CLAUDE.md - Context Engineering MCP Server

## 🚨 CRITICAL DEVELOPMENT RULES

### ❌ ABSOLUTELY NO MOCK DATA

**NEVER use mock data, mock APIs, mock responses, or placeholder implementations.**

- **NO mock functions** (e.g., `generateMockAnswers`, `createMockClient`)
- **NO placeholder responses** (e.g., "to be fully implemented")
- **NO hardcoded test data** in production code
- **NO fake APIs or simulated responses**
- **NO console.log/error/warn statements** (breaks MCP JSON-RPC protocol)

### ✅ ALWAYS USE REAL IMPLEMENTATIONS

- Connect all tools to actual business logic
- Use real file system operations
- Implement actual validation and analysis
- Return real data from real template files
- Connect to real external services or gracefully disable

### 🔧 MCP Protocol Compliance

- **ONLY JSON-RPC messages** to stdout
- **NO console output** of any kind
- **Proper error handling** with MCP error codes
- **Consistent interface contracts** across all tools

### 🎯 Context Engineering Methodology

- Follow Cole Medin's exact methodology and template structure
- Maintain attribution to Cole's original work
- Use real templates from Cole's repository via git subtree
- Implement intelligent context gathering and analysis

## Code Quality Standards

- **TypeScript strict mode** with comprehensive type safety
- **TDD approach** with real integration testing (no permanent mocks)
- **Proper dependency injection** for all services
- **Error handling** with helpful user messages
- **Performance optimization** for production use

## Template System Rules

- All templates must have consistent ID naming
- Templates must follow Cole's PRP structure exactly
- Real template files must exist in `/templates/` directory
- Template manager must load actual files, not mock data

---

*This file ensures the Context Engineering MCP Server maintains production quality and actually works instead of returning mock responses.*