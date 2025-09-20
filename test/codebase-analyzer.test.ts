import { CodebaseAnalyzer } from '../src/lib/codebase-analyzer';
import { ProjectAnalysis, CodebasePattern, FileAnalysis } from '../src/types';
import { resolve } from 'path';
import { writeFileSync, mkdirSync, rmSync } from 'fs';

describe('CodebaseAnalyzer', () => {
  let analyzer: CodebaseAnalyzer;
  let testProjectPath: string;

  beforeAll(() => {
    analyzer = new CodebaseAnalyzer();
    testProjectPath = resolve(__dirname, 'test-project');

    // Create test project structure
    mkdirSync(testProjectPath, { recursive: true });
    mkdirSync(`${testProjectPath}/src`, { recursive: true });
    mkdirSync(`${testProjectPath}/src/components`, { recursive: true });
    mkdirSync(`${testProjectPath}/src/services`, { recursive: true });

    // Create package.json
    writeFileSync(`${testProjectPath}/package.json`, JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'react': '^18.0.0',
        'express': '^4.18.0',
        'zod': '^3.20.0'
      },
      devDependencies: {
        'typescript': '^5.0.0',
        '@types/node': '^20.0.0'
      }
    }, null, 2));

    // Create TypeScript config
    writeFileSync(`${testProjectPath}/tsconfig.json`, JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        strict: true
      }
    }, null, 2));

    // Create sample TypeScript files
    writeFileSync(`${testProjectPath}/src/components/UserCard.tsx`, `
import React from 'react';
import { User } from '../types';

interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  const handleEditClick = () => {
    onEdit(user.id);
  };

  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button onClick={handleEditClick}>Edit</button>
    </div>
  );
};
`);

    writeFileSync(`${testProjectPath}/src/services/UserService.ts`, `
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export class UserService {
  private users: User[] = [];

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...userData,
    };

    this.users.push(user);
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    this.users[userIndex] = { ...this.users[userIndex], ...updates };
    return this.users[userIndex];
  }

  async deleteUser(id: string): Promise<boolean> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;

    this.users.splice(userIndex, 1);
    return true;
  }

  private validateUser(user: unknown): User {
    return UserSchema.parse(user);
  }
}
`);

    writeFileSync(`${testProjectPath}/src/app.ts`, `
import express from 'express';
import { UserService } from './services/UserService';

const app = express();
const userService = new UserService();

app.use(express.json());

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;
`);
  });

  afterAll(() => {
    // Clean up test project
    rmSync(testProjectPath, { recursive: true, force: true });
  });

  describe('analyzeProject', () => {
    it('should analyze a TypeScript React/Express project', async () => {
      const analysis = await analyzer.analyzeProject(testProjectPath);

      expect(analysis).toBeDefined();
      expect(analysis.rootPath).toBe(testProjectPath);
      expect(analysis.language).toBe('typescript');
      expect(analysis.framework).toContain('react');
      expect(analysis.framework).toContain('express');
    });

    it('should identify dependencies correctly', async () => {
      const analysis = await analyzer.analyzeProject(testProjectPath);

      expect(analysis.dependencies).toHaveProperty('react');
      expect(analysis.dependencies).toHaveProperty('express');
      expect(analysis.dependencies).toHaveProperty('zod');
      expect(analysis.devDependencies).toHaveProperty('typescript');
    });

    it('should detect architectural patterns', async () => {
      const analysis = await analyzer.analyzeProject(testProjectPath);

      const patterns = analysis.patterns;
      expect(patterns.length).toBeGreaterThan(0);

      const servicePattern = patterns.find(p => p.name === 'Service Layer');
      expect(servicePattern).toBeDefined();
      expect(servicePattern?.type).toBe('architectural');
    });

    it('should analyze file structure and conventions', async () => {
      const analysis = await analyzer.analyzeProject(testProjectPath);

      expect(analysis.fileAnalyses.length).toBeGreaterThan(0);

      const userServiceAnalysis = analysis.fileAnalyses.find(
        f => f.path.includes('UserService.ts')
      );
      expect(userServiceAnalysis).toBeDefined();
      expect(userServiceAnalysis?.language).toBe('typescript');
      expect(userServiceAnalysis?.classes.length).toBeGreaterThan(0);
    });

    it('should detect naming conventions', async () => {
      const analysis = await analyzer.analyzeProject(testProjectPath);

      expect(analysis.conventions.naming).toBeDefined();
      expect(analysis.conventions.structure).toBeDefined();
      expect(analysis.conventions.imports).toBeDefined();
    });

    it('should provide recommendations', async () => {
      const analysis = await analyzer.analyzeProject(testProjectPath);

      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  describe('analyzeFile', () => {
    it('should analyze TypeScript class files', async () => {
      const filePath = `${testProjectPath}/src/services/UserService.ts`;
      const analysis = await analyzer.analyzeFile(filePath);

      expect(analysis).toBeDefined();
      expect(analysis.language).toBe('typescript');
      expect(analysis.classes.length).toBe(1);
      expect(analysis.classes[0].name).toBe('UserService');
      expect(analysis.functions.length).toBeGreaterThan(0);
    });

    it('should analyze React component files', async () => {
      const filePath = `${testProjectPath}/src/components/UserCard.tsx`;
      const analysis = await analyzer.analyzeFile(filePath);

      expect(analysis).toBeDefined();
      expect(analysis.language).toBe('typescript');
      expect(analysis.framework).toBe('react');
      expect(analysis.imports).toContain('react');
    });

    it('should detect imports and exports', async () => {
      const filePath = `${testProjectPath}/src/services/UserService.ts`;
      const analysis = await analyzer.analyzeFile(filePath);

      expect(analysis.imports).toContain('zod');
      expect(analysis.exports.length).toBeGreaterThan(0);
    });

    it('should calculate complexity metrics', async () => {
      const filePath = `${testProjectPath}/src/services/UserService.ts`;
      const analysis = await analyzer.analyzeFile(filePath);

      expect(analysis.metrics.linesOfCode).toBeGreaterThan(0);
      expect(analysis.metrics.cyclomaticComplexity).toBeGreaterThan(0);
      expect(analysis.metrics.maintainabilityIndex).toBeGreaterThan(0);
    });
  });

  describe('detectPatterns', () => {
    it('should detect Service Layer pattern', async () => {
      const patterns = await analyzer.detectPatterns(testProjectPath);

      const servicePattern = patterns.find(p => p.name === 'Service Layer');
      expect(servicePattern).toBeDefined();
      expect(servicePattern?.confidence).toBeGreaterThan(0.7);
    });

    it('should detect Component-based Architecture', async () => {
      const patterns = await analyzer.detectPatterns(testProjectPath);

      const componentPattern = patterns.find(p => p.name === 'Component-based Architecture');
      expect(componentPattern).toBeDefined();
      expect(componentPattern?.confidence).toBeGreaterThan(0.7);
    });

    it('should detect Schema Validation pattern', async () => {
      const patterns = await analyzer.detectPatterns(testProjectPath);

      const schemaPattern = patterns.find(p => p.name === 'Schema Validation');
      expect(schemaPattern).toBeDefined();
      expect(schemaPattern?.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('identifyFrameworks', () => {
    it('should identify React framework', async () => {
      const frameworks = await analyzer.identifyFrameworks(testProjectPath);

      expect(frameworks).toContain('react');
    });

    it('should identify Express framework', async () => {
      const frameworks = await analyzer.identifyFrameworks(testProjectPath);

      expect(frameworks).toContain('express');
    });

    it('should identify Zod for validation', async () => {
      const frameworks = await analyzer.identifyFrameworks(testProjectPath);

      expect(frameworks).toContain('zod');
    });
  });
});