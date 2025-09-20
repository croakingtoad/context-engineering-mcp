import { z } from 'zod';
import { PRPValidator } from '../lib/prp-validator.js';

// Import singleton instances (will be set by main server)
let prpValidator: PRPValidator;

export function setPRPValidatorDependencies(validator: PRPValidator) {
  prpValidator = validator;
}

export const ValidatePRPInputSchema = z.object({
  prpContent: z.string().min(100).describe('The PRP content to validate (markdown or JSON)'),
  includeDetailedFeedback: z.boolean().default(true).describe('Include detailed section-by-section feedback'),
  includeAntiPatterns: z.boolean().default(true).describe('Include anti-pattern detection and warnings'),
  includeRecommendations: z.boolean().default(true).describe('Include actionable improvement recommendations'),
  validationLevel: z.enum(['basic', 'standard', 'comprehensive']).default('standard')
    .describe('Level of validation detail: basic (score only), standard (sections + score), comprehensive (full analysis)')
});

export type ValidatePRPInput = z.infer<typeof ValidatePRPInputSchema>;

export async function validatePRPToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  try {
    const input = ValidatePRPInputSchema.parse(args);

    if (!prpValidator) {
      throw new Error('PRP validator not initialized');
    }

    // Perform PRP validation
    const validationResult = await prpValidator.validatePRP(input.prpContent);

    // Build response based on validation level
    const result: any = {
      success: true,
      validationLevel: input.validationLevel,
      overall: {
        isValid: validationResult.isValid,
        score: validationResult.score,
        maxScore: validationResult.maxScore,
        completeness: `${Math.round((validationResult.score / validationResult.maxScore) * 100)}%`,
        grade: getGrade(validationResult.score, validationResult.maxScore),
      }
    };

    // Add detailed feedback for standard and comprehensive levels
    if (input.validationLevel !== 'basic') {
      result.sections = validationResult.sections.map(section => ({
        title: section.sectionTitle,
        isPresent: section.isPresent,
        isComplete: section.isComplete,
        score: section.score,
        maxScore: section.maxScore,
        completeness: `${Math.round((section.score / section.maxScore) * 100)}%`,
        issues: input.includeDetailedFeedback ? section.issues : [],
        recommendations: input.includeDetailedFeedback ? section.recommendations : []
      }));

      result.missingElements = validationResult.missingElements;
    }

    // Add anti-patterns for standard and comprehensive levels
    if (input.includeAntiPatterns && input.validationLevel !== 'basic') {
      result.antiPatterns = validationResult.antiPatterns.map(pattern => ({
        id: pattern.id,
        name: pattern.name,
        description: pattern.description,
        severity: pattern.severity,
        instanceCount: pattern.instances.length,
        examples: input.validationLevel === 'comprehensive' ? pattern.instances.slice(0, 3) : []
      }));
    }

    // Add recommendations for standard and comprehensive levels
    if (input.includeRecommendations && input.validationLevel !== 'basic') {
      result.recommendations = {
        priority: categorizeRecommendations(validationResult.recommendations),
        actionItems: generateActionItems(validationResult),
        improvementPlan: input.validationLevel === 'comprehensive' ?
          generateImprovementPlan(validationResult) : undefined
      };
    }

    // Add quality insights for comprehensive level
    if (input.validationLevel === 'comprehensive') {
      result.qualityInsights = {
        strengths: identifyStrengths(validationResult),
        weaknesses: identifyWeaknesses(validationResult),
        riskAreas: identifyRiskAreas(validationResult),
        qualityTrends: generateQualityTrends(validationResult)
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error validating PRP: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ]
    };
  }
}

/**
 * Convert score to letter grade
 */
function getGrade(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;

  if (percentage >= 95) return 'A+';
  if (percentage >= 90) return 'A';
  if (percentage >= 85) return 'A-';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'B-';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 55) return 'C-';
  if (percentage >= 50) return 'D';
  return 'F';
}

/**
 * Categorize recommendations by priority
 */
function categorizeRecommendations(recommendations: string[]): {
  high: string[];
  medium: string[];
  low: string[];
} {
  const high: string[] = [];
  const medium: string[] = [];
  const low: string[] = [];

  recommendations.forEach(rec => {
    const lowerRec = rec.toLowerCase();

    if (lowerRec.includes('missing') || lowerRec.includes('required') ||
        lowerRec.includes('critical') || lowerRec.includes('essential')) {
      high.push(rec);
    } else if (lowerRec.includes('improve') || lowerRec.includes('enhance') ||
               lowerRec.includes('add') || lowerRec.includes('include')) {
      medium.push(rec);
    } else {
      low.push(rec);
    }
  });

  return { high, medium, low };
}

/**
 * Generate specific action items
 */
function generateActionItems(validationResult: any): Array<{
  action: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}> {
  const actionItems: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
  }> = [];

  // Generate actions for missing elements
  validationResult.missingElements.forEach((element: string) => {
    actionItems.push({
      action: `Add comprehensive ${element} section`,
      priority: 'high',
      effort: 'medium',
      impact: 'high'
    });
  });

  // Generate actions for anti-patterns
  validationResult.antiPatterns.forEach((pattern: any) => {
    if (pattern.severity === 'high' || pattern.severity === 'critical') {
      actionItems.push({
        action: `Address ${pattern.name}: ${pattern.description}`,
        priority: pattern.severity === 'critical' ? 'high' : 'medium',
        effort: 'medium',
        impact: 'high'
      });
    }
  });

  // Generate actions for incomplete sections
  validationResult.sections
    .filter((section: any) => !section.isComplete)
    .forEach((section: any) => {
      actionItems.push({
        action: `Enhance ${section.sectionTitle} section content`,
        priority: section.score === 0 ? 'high' : 'medium',
        effort: 'low',
        impact: 'medium'
      });
    });

  return actionItems.slice(0, 10); // Limit to top 10 action items
}

/**
 * Generate improvement plan with phases
 */
function generateImprovementPlan(validationResult: any): {
  phase1: { title: string; actions: string[]; timeframe: string; };
  phase2: { title: string; actions: string[]; timeframe: string; };
  phase3: { title: string; actions: string[]; timeframe: string; };
} {
  const phase1Actions: string[] = [];
  const phase2Actions: string[] = [];
  const phase3Actions: string[] = [];

  // Phase 1: Address critical issues and missing core sections
  validationResult.missingElements.forEach((element: string) => {
    if (['Project Overview', 'Feature Specification', 'Technical Architecture'].includes(element)) {
      phase1Actions.push(`Add ${element} section with comprehensive content`);
    } else {
      phase2Actions.push(`Add ${element} section`);
    }
  });

  // Address critical anti-patterns in phase 1
  validationResult.antiPatterns
    .filter((ap: any) => ap.severity === 'critical')
    .forEach((ap: any) => {
      phase1Actions.push(`Fix critical issue: ${ap.name}`);
    });

  // Phase 2: Enhance existing sections and address medium-priority issues
  validationResult.sections
    .filter((section: any) => !section.isComplete && section.isPresent)
    .forEach((section: any) => {
      phase2Actions.push(`Enhance ${section.sectionTitle} with missing details`);
    });

  validationResult.antiPatterns
    .filter((ap: any) => ap.severity === 'high')
    .forEach((ap: any) => {
      phase2Actions.push(`Address: ${ap.name}`);
    });

  // Phase 3: Polish and optimization
  phase3Actions.push('Review and polish all sections for clarity and completeness');
  phase3Actions.push('Add examples and use cases where appropriate');
  phase3Actions.push('Ensure consistency across all sections');

  validationResult.antiPatterns
    .filter((ap: any) => ap.severity === 'medium' || ap.severity === 'low')
    .forEach((ap: any) => {
      phase3Actions.push(`Optimize: ${ap.name}`);
    });

  return {
    phase1: {
      title: 'Critical Foundation',
      actions: phase1Actions.slice(0, 5),
      timeframe: '1-2 hours'
    },
    phase2: {
      title: 'Enhancement and Completion',
      actions: phase2Actions.slice(0, 5),
      timeframe: '2-3 hours'
    },
    phase3: {
      title: 'Polish and Optimization',
      actions: phase3Actions.slice(0, 5),
      timeframe: '1-2 hours'
    }
  };
}

/**
 * Identify document strengths
 */
function identifyStrengths(validationResult: any): string[] {
  const strengths: string[] = [];

  // Check for complete sections
  const completeSections = validationResult.sections.filter((s: any) => s.isComplete);
  if (completeSections.length > 0) {
    strengths.push(`Strong foundation with ${completeSections.length} complete sections`);
  }

  // Check for high-scoring sections
  const highScoringSections = validationResult.sections.filter(
    (s: any) => s.score / s.maxScore >= 0.8
  );
  if (highScoringSections.length > 0) {
    const sectionNames = highScoringSections.map((s: any) => s.sectionTitle).join(', ');
    strengths.push(`Excellent content quality in: ${sectionNames}`);
  }

  // Check for absence of critical anti-patterns
  const criticalPatterns = validationResult.antiPatterns.filter(
    (ap: any) => ap.severity === 'critical'
  );
  if (criticalPatterns.length === 0) {
    strengths.push('No critical anti-patterns detected');
  }

  // Overall score assessment
  const scorePercentage = (validationResult.score / validationResult.maxScore) * 100;
  if (scorePercentage >= 70) {
    strengths.push('Solid overall structure and completeness');
  }

  return strengths.length > 0 ? strengths : ['Document has potential for improvement'];
}

/**
 * Identify document weaknesses
 */
function identifyWeaknesses(validationResult: any): string[] {
  const weaknesses: string[] = [];

  // Missing elements
  if (validationResult.missingElements.length > 0) {
    weaknesses.push(`Missing ${validationResult.missingElements.length} core sections`);
  }

  // Incomplete sections
  const incompleteSections = validationResult.sections.filter((s: any) => !s.isComplete);
  if (incompleteSections.length > 0) {
    weaknesses.push(`${incompleteSections.length} sections need substantial improvement`);
  }

  // Anti-patterns
  const criticalPatterns = validationResult.antiPatterns.filter(
    (ap: any) => ap.severity === 'critical' || ap.severity === 'high'
  );
  if (criticalPatterns.length > 0) {
    weaknesses.push(`${criticalPatterns.length} serious quality issues detected`);
  }

  // Low-scoring sections
  const lowScoringSections = validationResult.sections.filter(
    (s: any) => s.score / s.maxScore < 0.5
  );
  if (lowScoringSections.length > 0) {
    const sectionNames = lowScoringSections.map((s: any) => s.sectionTitle).join(', ');
    weaknesses.push(`Weak content in: ${sectionNames}`);
  }

  return weaknesses;
}

/**
 * Identify risk areas
 */
function identifyRiskAreas(validationResult: any): string[] {
  const risks: string[] = [];

  // High-severity anti-patterns
  validationResult.antiPatterns
    .filter((ap: any) => ap.severity === 'high' || ap.severity === 'critical')
    .forEach((ap: any) => {
      risks.push(`${ap.name}: Could lead to project failures or miscommunication`);
    });

  // Missing critical sections
  const criticalMissing = validationResult.missingElements.filter((element: string) =>
    ['Project Overview', 'Feature Specification', 'Technical Architecture'].includes(element)
  );
  if (criticalMissing.length > 0) {
    risks.push('Missing core sections may lead to unclear requirements and scope creep');
  }

  // Low overall score
  const scorePercentage = (validationResult.score / validationResult.maxScore) * 100;
  if (scorePercentage < 50) {
    risks.push('Low quality score may result in project delays and misunderstandings');
  }

  return risks.length > 0 ? risks : ['No significant quality risks identified'];
}

/**
 * Generate quality trends analysis
 */
function generateQualityTrends(validationResult: any): {
  sectionsCompleteness: number;
  averageQuality: number;
  antiPatternSeverity: string;
  readinessLevel: string;
} {
  const sectionsCompleteness = validationResult.sections.filter(
    (s: any) => s.isComplete
  ).length / validationResult.sections.length;

  const averageQuality = validationResult.sections.reduce(
    (sum: number, s: any) => sum + (s.score / s.maxScore),
    0
  ) / validationResult.sections.length;

  const criticalCount = validationResult.antiPatterns.filter(
    (ap: any) => ap.severity === 'critical'
  ).length;
  const highCount = validationResult.antiPatterns.filter(
    (ap: any) => ap.severity === 'high'
  ).length;

  let antiPatternSeverity = 'low';
  if (criticalCount > 0) antiPatternSeverity = 'critical';
  else if (highCount > 2) antiPatternSeverity = 'high';
  else if (highCount > 0) antiPatternSeverity = 'medium';

  const scorePercentage = (validationResult.score / validationResult.maxScore) * 100;
  let readinessLevel = 'not-ready';
  if (scorePercentage >= 85) readinessLevel = 'production-ready';
  else if (scorePercentage >= 70) readinessLevel = 'development-ready';
  else if (scorePercentage >= 50) readinessLevel = 'needs-improvement';

  return {
    sectionsCompleteness: Math.round(sectionsCompleteness * 100) / 100,
    averageQuality: Math.round(averageQuality * 100) / 100,
    antiPatternSeverity,
    readinessLevel
  };
}