import { describe, it, expect, beforeEach } from 'jest';
import { ExecutionGuidance } from '../../lib/execution-guidance.js';
import {
  PRPExecutionGuidance,
  AgentRecommendation,
  TaskGroup,
  RiskAssessment
} from '../../types/index.js';

describe('ExecutionGuidance', () => {
  let executionGuidance: ExecutionGuidance;

  beforeEach(() => {
    executionGuidance = new ExecutionGuidance();
  });

  describe('generateExecutionGuidance', () => {
    it('should generate comprehensive guidance for a full-stack web application', async () => {
      const webAppPRP = `
# Product Requirements Prompt

## PROJECT OVERVIEW
**Project Name:** E-commerce Platform
**Domain:** Retail Technology
**Stakeholders:** Product Manager, Engineering Team, QA, UX Designer, DevOps

## FEATURE SPECIFICATION
**Core Feature:** Complete e-commerce platform with product catalog, shopping cart, checkout, and admin panel

### Functional Requirements
- User authentication and authorization
- Product catalog with search and filtering
- Shopping cart and wishlist functionality
- Secure payment processing
- Order management system
- Admin panel for product and order management
- Email notifications

### Non-Functional Requirements
- 99.9% uptime
- Sub-second page load times
- Support for 10,000+ concurrent users
- Mobile-responsive design
- PCI DSS compliance for payments

## TECHNICAL ARCHITECTURE
**Technology Stack:**
- Frontend: React, TypeScript, Redux Toolkit, Material-UI
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Redis for caching
- Payment: Stripe integration
- Deployment: Docker, AWS ECS, RDS
- Monitoring: DataDog

## USER EXPERIENCE
**Primary Users:** End customers, Admin users

### User Stories
- As a customer, I want to browse and purchase products easily
- As an admin, I want to manage products and view analytics

## IMPLEMENTATION APPROACH
**Development Phases:**
1. Phase 1: Core infrastructure and authentication (3 weeks)
2. Phase 2: Product catalog and search (4 weeks)
3. Phase 3: Shopping cart and checkout (3 weeks)
4. Phase 4: Admin panel and analytics (2 weeks)

## SUCCESS METRICS
- Conversion rate > 2.5%
- Page load time < 1 second
- 99.9% uptime
- Customer satisfaction > 4.5/5

## CONSTRAINTS & CONSIDERATIONS
**Timeline:** 12-week delivery
**Budget:** $150,000
**Team Size:** 6 developers
**Security:** PCI DSS compliance required
`;

      const guidance = await executionGuidance.generateExecutionGuidance(webAppPRP);

      expect(guidance.estimatedComplexity).toBe('high');
      expect(guidance.estimatedDuration.unit).toBe('weeks');
      expect(guidance.estimatedDuration.minimum).toBeGreaterThan(8);

      // Should recommend appropriate agents
      const backendAgents = guidance.agentRecommendations.find(a => a.agentType === 'backend');
      const frontendAgents = guidance.agentRecommendations.find(a => a.agentType === 'frontend');
      const devopsAgents = guidance.agentRecommendations.find(a => a.agentType === 'devops');

      expect(backendAgents).toBeDefined();
      expect(frontendAgents).toBeDefined();
      expect(devopsAgents).toBeDefined();
      expect(backendAgents!.count).toBeGreaterThanOrEqual(2);

      // Should identify appropriate tasks
      expect(guidance.taskBreakdown.length).toBeGreaterThan(4);
      const authTask = guidance.taskBreakdown.find(tg =>
        tg.title.toLowerCase().includes('authentication') ||
        tg.title.toLowerCase().includes('auth')
      );
      expect(authTask).toBeDefined();

      // Should assess risks appropriately
      expect(guidance.riskAssessment.overallRisk).toBeOneOf(['medium', 'high']);
      expect(guidance.riskAssessment.risks.length).toBeGreaterThan(3);

      // Should recommend appropriate technologies
      const techRecommendations = guidance.technologyStack;
      expect(techRecommendations.some(t => t.category === 'frontend')).toBe(true);
      expect(techRecommendations.some(t => t.category === 'backend')).toBe(true);
      expect(techRecommendations.some(t => t.category === 'database')).toBe(true);
    });

    it('should generate appropriate guidance for a simple API project', async () => {
      const apiPRP = `
# Product Requirements Prompt

## PROJECT OVERVIEW
**Project Name:** Task Management API
**Domain:** Productivity Software

## FEATURE SPECIFICATION
**Core Feature:** RESTful API for task management with CRUD operations

### Functional Requirements
- Create, read, update, delete tasks
- User authentication
- Task categorization and tagging
- Basic reporting endpoints

### Non-Functional Requirements
- Response time < 200ms
- Support for 1,000 concurrent users
- 99% uptime

## TECHNICAL ARCHITECTURE
**Technology Stack:**
- Backend: Node.js, Express
- Database: PostgreSQL
- Deployment: Heroku

## IMPLEMENTATION APPROACH
**Single Phase:** Complete API development (4 weeks)

## SUCCESS METRICS
- API response time < 200ms
- Zero security vulnerabilities

## CONSTRAINTS & CONSIDERATIONS
**Timeline:** 4 weeks
**Team:** 2 developers
`;

      const guidance = await executionGuidance.generateExecutionGuidance(apiPRP);

      expect(guidance.estimatedComplexity).toBe('medium');
      expect(guidance.estimatedDuration.unit).toBe('weeks');
      expect(guidance.estimatedDuration.maximum).toBeLessThanOrEqual(6);

      // Should recommend fewer agents for simpler project
      expect(guidance.agentRecommendations.length).toBeLessThan(4);
      const backendAgents = guidance.agentRecommendations.find(a => a.agentType === 'backend');
      expect(backendAgents!.count).toBeLessThanOrEqual(2);

      // Should have simpler task breakdown
      expect(guidance.taskBreakdown.length).toBeLessThan(6);

      // Should have lower overall risk
      expect(guidance.riskAssessment.overallRisk).toBeOneOf(['low', 'medium']);
    });

    it('should handle ML/AI projects with appropriate complexity', async () => {
      const mlPRP = `
# Product Requirements Prompt

## PROJECT OVERVIEW
**Project Name:** Document Classification System
**Domain:** Machine Learning

## FEATURE SPECIFICATION
**Core Feature:** Automated document classification using natural language processing

### Functional Requirements
- Document upload and preprocessing
- Text classification using ML models
- Confidence scoring and human review workflow
- Training data management
- Model versioning and deployment

### Non-Functional Requirements
- Classification accuracy > 95%
- Processing time < 5 seconds per document
- Support for multiple document formats

## TECHNICAL ARCHITECTURE
**Technology Stack:**
- ML Framework: TensorFlow, scikit-learn
- Backend: Python, FastAPI
- Database: PostgreSQL, vector database
- Deployment: Docker, Kubernetes
- MLOps: MLflow, Kubeflow

## IMPLEMENTATION APPROACH
**Phases:**
1. Data pipeline and preprocessing (3 weeks)
2. Model development and training (4 weeks)
3. API and inference system (3 weeks)
4. MLOps and monitoring (2 weeks)

## SUCCESS METRICS
- Classification accuracy > 95%
- Model inference time < 5s
- Data processing pipeline reliability > 99%

## CONSTRAINTS & CONSIDERATIONS
**Data Privacy:** GDPR compliance required
**Computational Resources:** GPU cluster access needed
`;

      const guidance = await executionGuidance.generateExecutionGuidance(mlPRP);

      expect(guidance.estimatedComplexity).toBe('very-high');

      // Should recommend ML specialists
      const mlAgents = guidance.agentRecommendations.find(a =>
        a.agentType === 'ml-engineer' || a.agentType === 'data-scientist'
      );
      expect(mlAgents).toBeDefined();

      // Should include ML-specific risks
      const dataRisk = guidance.riskAssessment.risks.find(r =>
        r.category === 'technical' && r.description.toLowerCase().includes('data')
      );
      expect(dataRisk).toBeDefined();

      // Should recommend appropriate ML technologies
      const mlTech = guidance.technologyStack.find(t =>
        t.technology.includes('TensorFlow') || t.technology.includes('scikit-learn')
      );
      expect(mlTech).toBeDefined();
    });

    it('should identify implementation phases with proper dependencies', async () => {
      const complexPRP = `
# Product Requirements Prompt

## IMPLEMENTATION APPROACH
**Development Phases:**
1. Phase 1: Database setup and user management (2 weeks)
2. Phase 2: Core API development (3 weeks)
3. Phase 3: Frontend development (4 weeks)
4. Phase 4: Integration and testing (2 weeks)
5. Phase 5: Deployment and monitoring (1 week)

## TECHNICAL ARCHITECTURE
Full-stack web application with database, API, and frontend components.
`;

      const guidance = await executionGuidance.generateExecutionGuidance(complexPRP);

      expect(guidance.implementationOrder.length).toBeGreaterThan(3);

      // Check that phases have logical dependencies
      const corePhase = guidance.implementationOrder.find(p =>
        p.name.toLowerCase().includes('core') || p.name.toLowerCase().includes('api')
      );
      const frontendPhase = guidance.implementationOrder.find(p =>
        p.name.toLowerCase().includes('frontend') || p.name.toLowerCase().includes('ui')
      );

      expect(corePhase).toBeDefined();
      expect(frontendPhase).toBeDefined();

      // Frontend should depend on backend/API
      if (corePhase && frontendPhase) {
        const frontendIndex = guidance.implementationOrder.indexOf(frontendPhase);
        const coreIndex = guidance.implementationOrder.indexOf(corePhase);
        expect(coreIndex).toBeLessThan(frontendIndex);
      }
    });

    it('should assess risks based on project characteristics', async () => {
      const riskyPRP = `
# Product Requirements Prompt

## PROJECT OVERVIEW
**Project Name:** Financial Trading Platform
**Domain:** FinTech

## FEATURE SPECIFICATION
Real-time trading system with high-frequency transactions, complex financial calculations, and regulatory compliance.

### Non-Functional Requirements
- Sub-millisecond latency for trades
- 99.99% uptime requirement
- Handle 100,000+ transactions per second
- SOX and SEC compliance

## TECHNICAL ARCHITECTURE
**Technology Stack:**
- Low-latency C++ trading engine
- Distributed microservices architecture
- Multiple database systems
- Real-time data feeds

## CONSTRAINTS & CONSIDERATIONS
**Regulatory:** SOX, SEC, GDPR compliance
**Timeline:** 6-month hard deadline
**Budget:** $2M budget
**Security:** Banking-level security required
`;

      const guidance = await executionGuidance.generateExecutionGuidance(riskyPRP);

      expect(guidance.riskAssessment.overallRisk).toBeOneOf(['high', 'critical']);

      // Should identify regulatory risks
      const regulatoryRisk = guidance.riskAssessment.risks.find(r =>
        r.category === 'external' && r.description.toLowerCase().includes('regulat')
      );
      expect(regulatoryRisk).toBeDefined();

      // Should identify technical complexity risks
      const techRisk = guidance.riskAssessment.risks.find(r =>
        r.category === 'technical' && r.severity === 'high'
      );
      expect(techRisk).toBeDefined();

      // Should have substantial mitigation strategies
      expect(guidance.riskAssessment.mitigationStrategies.length).toBeGreaterThan(5);
    });

    it('should handle minimal PRP input gracefully', async () => {
      const minimalPRP = `
# Simple Project

Basic web application for managing tasks.
`;

      const guidance = await executionGuidance.generateExecutionGuidance(minimalPRP);

      expect(guidance.estimatedComplexity).toBe('low');
      expect(guidance.agentRecommendations.length).toBeGreaterThan(0);
      expect(guidance.taskBreakdown.length).toBeGreaterThan(0);
      expect(guidance.riskAssessment.overallRisk).toBe('medium'); // Default to medium when unclear
    });
  });

  describe('Agent Recommendations', () => {
    it('should prioritize agents based on project needs', async () => {
      const frontendHeavyPRP = `
## TECHNICAL ARCHITECTURE
React-based SPA with complex UI interactions, animations, and responsive design.

## FEATURE SPECIFICATION
Rich user interface with data visualizations, real-time updates, and mobile optimization.
`;

      const guidance = await executionGuidance.generateExecutionGuidance(frontendHeavyPRP);

      const agentPriorities = guidance.agentRecommendations.sort((a, b) => b.priority - a.priority);
      expect(agentPriorities[0].agentType).toBeOneOf(['frontend', 'ui-ux']);
    });
  });

  describe('Technology Recommendations', () => {
    it('should provide confidence scores for technology choices', async () => {
      const specificTechPRP = `
## TECHNICAL ARCHITECTURE
**Technology Stack:**
- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
- Deployment: AWS with Docker
`;

      const guidance = await executionGuidance.generateExecutionGuidance(specificTechPRP);

      guidance.technologyStack.forEach(tech => {
        expect(tech.confidence).toBeGreaterThanOrEqual(0);
        expect(tech.confidence).toBeLessThanOrEqual(1);
        expect(tech.reasoning).toBeTruthy();
        expect(tech.alternatives).toBeDefined();
      });
    });
  });
});