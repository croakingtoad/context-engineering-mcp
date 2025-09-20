import { describe, it, expect, beforeEach } from 'jest';
import { PRPValidator } from '../../lib/prp-validator.js';
import {
  PRPValidationResult,
  SectionValidation,
  AntiPattern
} from '../../types/index.js';

describe('PRPValidator', () => {
  let validator: PRPValidator;

  beforeEach(() => {
    validator = new PRPValidator();
  });

  describe('validatePRP', () => {
    it('should validate a complete, well-formed PRP with high score', async () => {
      const completePRP = `
# Product Requirements Prompt

## PROJECT OVERVIEW
**Project Name:** E-commerce Platform
**Domain:** Retail Technology
**Stakeholders:** Product Manager, Engineering Team, QA, Marketing

## FEATURE SPECIFICATION
**Core Feature:** Advanced product search and filtering system

The system should provide intelligent search capabilities with real-time filtering, faceted search, and personalized recommendations.

### Functional Requirements
- Text-based product search with autocomplete
- Multi-dimensional filtering (price, category, ratings, availability)
- Search result sorting and pagination
- Search analytics and user behavior tracking

### Non-Functional Requirements
- Sub-second search response times
- 99.9% uptime requirement
- Support for 10,000+ concurrent users
- Mobile-responsive design

## TECHNICAL ARCHITECTURE
**Technology Stack:**
- Frontend: React, TypeScript, Redux Toolkit
- Backend: Node.js, Express, PostgreSQL
- Search: Elasticsearch
- Deployment: Docker, AWS ECS

**Key Design Patterns:**
- Repository pattern for data access
- Event-driven architecture for search analytics
- Microservices for search and product catalogs

## USER EXPERIENCE
**Primary Users:** End customers browsing products
**Secondary Users:** Admin users managing search configurations

### User Stories
- As a customer, I want to quickly find products by typing keywords
- As a customer, I want to filter results by multiple criteria simultaneously
- As an admin, I want to analyze search patterns to optimize inventory

### Acceptance Criteria
- Search results appear within 500ms of typing
- Filters update results without page refresh
- Search supports typos and synonyms

## IMPLEMENTATION APPROACH
**Development Phases:**
1. Phase 1: Basic search infrastructure (2 weeks)
2. Phase 2: Advanced filtering and sorting (3 weeks)
3. Phase 3: Analytics and optimization (2 weeks)

**Testing Strategy:**
- Unit tests for search algorithms
- Integration tests for API endpoints
- Performance tests for response times
- User acceptance testing

## SUCCESS METRICS
**Key Performance Indicators:**
- Search conversion rate > 15%
- Average search time < 500ms
- User engagement increase by 20%
- Zero-result search rate < 5%

## CONSTRAINTS & CONSIDERATIONS
**Technical Constraints:**
- Must integrate with existing product database
- Limited to current AWS infrastructure
- Must support existing authentication system

**Business Constraints:**
- 8-week development timeline
- $50,000 budget limit
- Must launch before Q4 holiday season

**Risk Considerations:**
- Elasticsearch learning curve for team
- Potential performance issues with large datasets
- Integration complexity with legacy systems
`;

      const result = await validator.validatePRP(completePRP);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(85);
      expect(result.sections).toHaveLength(7); // Expected number of core sections
      expect(result.antiPatterns).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0); // No recommendations for perfect PRP
    });

    it('should identify missing sections and provide recommendations', async () => {
      const incompletePRP = `
# Product Requirements Prompt

## PROJECT OVERVIEW
Basic project description without stakeholders or domain info.

## FEATURE SPECIFICATION
Some feature description but missing requirements.
`;

      const result = await validator.validatePRP(incompletePRP);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(50);
      expect(result.missingElements).toContain('Technical Architecture');
      expect(result.missingElements).toContain('User Experience');
      expect(result.missingElements).toContain('Implementation Approach');
      expect(result.recommendations).toContain('Add detailed technical architecture section');
    });

    it('should detect anti-patterns and flag them', async () => {
      const antiPatternPRP = `
# Product Requirements Prompt

## PROJECT OVERVIEW
We need to build something amazing and revolutionary!

## FEATURE SPECIFICATION
The system should do everything the user wants and be super fast and scalable.
It should be the best solution ever created.

## TECHNICAL ARCHITECTURE
We'll use the latest and greatest technologies and make it cloud-native and AI-powered.
`;

      const result = await validator.validatePRP(antiPatternPRP);

      expect(result.antiPatterns.length).toBeGreaterThan(0);

      const vagueRequirements = result.antiPatterns.find(
        ap => ap.id === 'vague-requirements'
      );
      expect(vagueRequirements).toBeDefined();
      expect(vagueRequirements!.severity).toBe('high');

      const buzzwordOveruse = result.antiPatterns.find(
        ap => ap.id === 'buzzword-overuse'
      );
      expect(buzzwordOveruse).toBeDefined();
    });

    it('should score sections individually', async () => {
      const partialPRP = `
# Product Requirements Prompt

## PROJECT OVERVIEW
**Project Name:** Test Project
**Domain:** Software Development
**Stakeholders:** Developer, Product Owner, QA Engineer

Well-defined project with clear stakeholders and domain.

## FEATURE SPECIFICATION
Basic feature description without detailed requirements.

## TECHNICAL ARCHITECTURE
Technology stack mentioned but no architecture details.
`;

      const result = await validator.validatePRP(partialPRP);

      const overviewSection = result.sections.find(s => s.sectionTitle === 'Project Overview');
      const featureSection = result.sections.find(s => s.sectionTitle === 'Feature Specification');

      expect(overviewSection!.score).toBeGreaterThan(featureSection!.score);
      expect(overviewSection!.isComplete).toBe(true);
      expect(featureSection!.isComplete).toBe(false);
    });

    it('should provide specific recommendations for improvement', async () => {
      const needsImprovementPRP = `
# Product Requirements Prompt

## PROJECT OVERVIEW
Basic project.

## FEATURE SPECIFICATION
Feature needs to be built.

## TECHNICAL ARCHITECTURE
Some tech stack.
`;

      const result = await validator.validatePRP(needsImprovementPRP);

      expect(result.recommendations).toContain('Add stakeholder identification in Project Overview');
      expect(result.recommendations).toContain('Include detailed functional and non-functional requirements');
      expect(result.recommendations).toContain('Specify technology versions and architecture patterns');
    });

    it('should handle edge cases gracefully', async () => {
      const emptyPRP = '';
      const result = await validator.validatePRP(emptyPRP);

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.sections).toHaveLength(0);
      expect(result.missingElements.length).toBeGreaterThan(5);
    });

    it('should validate different PRP formats', async () => {
      const jsonPRP = JSON.stringify({
        sections: [
          {
            title: 'Project Overview',
            content: 'Comprehensive project description with stakeholders and domain.'
          },
          {
            title: 'Feature Specification',
            content: 'Detailed feature requirements with acceptance criteria.'
          }
        ]
      });

      const result = await validator.validatePRP(jsonPRP);

      expect(result.sections).toHaveLength(2);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('Anti-pattern detection', () => {
    it('should detect vague language patterns', async () => {
      const vaguePRP = `
## FEATURE SPECIFICATION
The system should be user-friendly and performant.
It should handle things efficiently and provide good user experience.
The solution should be scalable and maintainable.
`;

      const result = await validator.validatePRP(vaguePRP);

      const vaguePattern = result.antiPatterns.find(ap => ap.id === 'vague-language');
      expect(vaguePattern).toBeDefined();
      expect(vaguePattern!.instances.length).toBeGreaterThan(0);
    });

    it('should detect missing acceptance criteria', async () => {
      const noAcceptancePRP = `
## FEATURE SPECIFICATION
Build a login system for users.
Users need to authenticate securely.
`;

      const result = await validator.validatePRP(noAcceptancePRP);

      const missingAcceptance = result.antiPatterns.find(ap => ap.id === 'missing-acceptance-criteria');
      expect(missingAcceptance).toBeDefined();
    });

    it('should detect technology without justification', async () => {
      const unjustifiedTechPRP = `
## TECHNICAL ARCHITECTURE
We'll use React, Node.js, MongoDB, Redis, Docker, Kubernetes, and microservices.
`;

      const result = await validator.validatePRP(unjustifiedTechPRP);

      const unjustifiedTech = result.antiPatterns.find(ap => ap.id === 'unjustified-technology');
      expect(unjustifiedTech).toBeDefined();
    });
  });

  describe('Scoring algorithm', () => {
    it('should weight core sections appropriately', async () => {
      const coreOnlyPRP = `
# Product Requirements Prompt

## PROJECT OVERVIEW
**Project:** Core System
**Domain:** Enterprise Software
**Stakeholders:** Engineering, Product, QA

## FEATURE SPECIFICATION
**Core Feature:** User management system

### Functional Requirements
- User registration and authentication
- Role-based access control
- Profile management

### Non-Functional Requirements
- 99.9% uptime
- Sub-second response times
- GDPR compliance
`;

      const result = await validator.validatePRP(coreOnlyPRP);

      // Core sections should provide substantial score even without optional sections
      expect(result.score).toBeGreaterThan(60);
      expect(result.isValid).toBe(true);
    });
  });
});