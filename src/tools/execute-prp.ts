import { z } from 'zod';
import { ExecutionGuidance } from '../lib/execution-guidance.js';

// Import singleton instances (will be set by main server)
let executionGuidance: ExecutionGuidance;

export function setExecutionGuidanceDependencies(guidance: ExecutionGuidance) {
  executionGuidance = guidance;
}

export const ExecutePRPInputSchema = z.object({
  prpContent: z
    .string()
    .min(100)
    .describe('The PRP content to analyze for execution guidance'),
  focusAreas: z
    .array(
      z.enum(['agents', 'tasks', 'risks', 'technology', 'timeline', 'phases'])
    )
    .default(['agents', 'tasks', 'risks'])
    .describe('Areas to focus on in the execution guidance'),
  detailLevel: z
    .enum(['summary', 'detailed', 'comprehensive'])
    .default('detailed')
    .describe('Level of detail in the guidance'),
  includeTaskBreakdown: z
    .boolean()
    .default(true)
    .describe('Include detailed task breakdown with estimates'),
  includeRiskAnalysis: z
    .boolean()
    .default(true)
    .describe('Include comprehensive risk assessment'),
  includeTechnologyRec: z
    .boolean()
    .default(true)
    .describe('Include technology stack recommendations'),
  targetTeamSize: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe('Target team size for agent recommendations'),
  preferredTechStack: z
    .array(z.string())
    .optional()
    .describe('Preferred technologies to consider in recommendations'),
  projectConstraints: z
    .object({
      timeline: z.string().optional().describe('Project timeline constraints'),
      budget: z.string().optional().describe('Budget constraints'),
      team: z.string().optional().describe('Team composition constraints'),
      technology: z.string().optional().describe('Technology constraints'),
    })
    .optional()
    .describe('Additional project constraints to consider'),
});

export type ExecutePRPInput = z.infer<typeof ExecutePRPInputSchema>;

export async function executePRPToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  try {
    const input = ExecutePRPInputSchema.parse(args);

    if (!executionGuidance) {
      throw new Error('Execution guidance not initialized');
    }

    // Generate execution guidance
    const guidance = await executionGuidance.generateExecutionGuidance(
      input.prpContent
    );

    // Build response based on focus areas and detail level
    const result: any = {
      success: true,
      detailLevel: input.detailLevel,
      focusAreas: input.focusAreas,
      projectSummary: {
        estimatedComplexity: guidance.estimatedComplexity,
        estimatedDuration: guidance.estimatedDuration,
        overallRisk: guidance.riskAssessment.overallRisk,
      },
    };

    // Agent recommendations
    if (input.focusAreas.includes('agents')) {
      result.agentRecommendations = formatAgentRecommendations(
        guidance.agentRecommendations,
        input.detailLevel,
        input.targetTeamSize
      );
    }

    // Task breakdown
    if (input.focusAreas.includes('tasks') && input.includeTaskBreakdown) {
      result.taskBreakdown = formatTaskBreakdown(
        guidance.taskBreakdown,
        input.detailLevel
      );
    }

    // Risk analysis
    if (input.focusAreas.includes('risks') && input.includeRiskAnalysis) {
      result.riskAnalysis = formatRiskAnalysis(
        guidance.riskAssessment,
        input.detailLevel
      );
    }

    // Technology recommendations
    if (input.focusAreas.includes('technology') && input.includeTechnologyRec) {
      result.technologyRecommendations = formatTechnologyRecommendations(
        guidance.technologyStack,
        input.detailLevel,
        input.preferredTechStack
      );
    }

    // Timeline and phases
    if (
      input.focusAreas.includes('timeline') ||
      input.focusAreas.includes('phases')
    ) {
      result.implementationPlan = formatImplementationPlan(
        guidance.implementationOrder,
        guidance.taskBreakdown,
        input.detailLevel
      );
    }

    // Add executive summary for comprehensive detail level
    if (input.detailLevel === 'comprehensive') {
      result.executiveSummary = generateExecutiveSummary(
        guidance,
        input.projectConstraints
      );
    }

    // Add LOCOMOTIVE-specific recommendations
    result.locomotiveRecommendations = generateLocomotiveRecommendations(
      guidance,
      input.targetTeamSize
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating execution guidance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * Format agent recommendations based on detail level
 */
function formatAgentRecommendations(
  agents: any[],
  detailLevel: string,
  targetTeamSize?: number
): any {
  const topAgents = agents.slice(0, detailLevel === 'summary' ? 5 : 10);

  const formatted: any = {
    totalRecommendedAgents: agents.reduce((sum, agent) => sum + agent.count, 0),
    recommendations: topAgents.map(agent => ({
      agentType: agent.agentType,
      count: agent.count,
      priority: agent.priority,
      specialization: agent.specialization,
      reasoning: detailLevel !== 'summary' ? agent.reasoning : undefined,
      skills: detailLevel === 'comprehensive' ? agent.skills : undefined,
    })),
  };

  // Add team scaling advice if target team size provided
  if (targetTeamSize) {
    const totalRecommended = formatted.totalRecommendedAgents;
    if (totalRecommended > targetTeamSize) {
      formatted.scalingAdvice = {
        status: 'over-capacity',
        message: `Recommended ${totalRecommended} agents but target is ${targetTeamSize}`,
        suggestion: 'Consider multi-skilled agents or extending timeline',
        priorityAgents: topAgents.slice(0, targetTeamSize).map(a => ({
          type: a.agentType,
          count: a.count,
        })),
      };
    } else if (totalRecommended < targetTeamSize) {
      formatted.scalingAdvice = {
        status: 'under-capacity',
        message: `Can accommodate ${targetTeamSize - totalRecommended} additional agents`,
        suggestion: 'Consider additional QA, DevOps, or specialized agents',
      };
    } else {
      formatted.scalingAdvice = {
        status: 'optimal',
        message: 'Team size aligns perfectly with recommendations',
      };
    }
  }

  return formatted;
}

/**
 * Format task breakdown based on detail level
 */
function formatTaskBreakdown(taskGroups: any[], detailLevel: string): any {
  const totalTasks = taskGroups.reduce(
    (sum, group) => sum + group.tasks.length,
    0
  );
  const totalHours = taskGroups.reduce(
    (sum, group) => sum + group.estimatedHours,
    0
  );

  const formatted = {
    summary: {
      totalTaskGroups: taskGroups.length,
      totalTasks,
      totalEstimatedHours: totalHours,
      estimatedWeeks: Math.ceil(totalHours / 40), // Assuming 40 hours per week
    },
    taskGroups: taskGroups.map(group => ({
      id: group.id,
      title: group.title,
      description: detailLevel !== 'summary' ? group.description : undefined,
      phase: group.phase,
      priority: group.priority,
      estimatedHours: group.estimatedHours,
      dependencies:
        detailLevel === 'comprehensive' ? group.dependencies : undefined,
      taskCount: group.tasks.length,
      tasks:
        detailLevel === 'comprehensive'
          ? group.tasks.map(task => ({
              id: task.id,
              title: task.title,
              description: task.description,
              estimatedHours: task.estimatedHours,
              complexity: task.complexity,
              category: task.category,
              agentTypes: task.agentTypes,
              dependencies: task.dependencies,
            }))
          : undefined,
      sampleTasks:
        detailLevel === 'detailed'
          ? group.tasks.slice(0, 3).map(task => ({
              title: task.title,
              complexity: task.complexity,
              estimatedHours: task.estimatedHours,
            }))
          : undefined,
    })),
  };

  return formatted;
}

/**
 * Format risk analysis based on detail level
 */
function formatRiskAnalysis(riskAssessment: any, detailLevel: string): any {
  const formatted: any = {
    summary: {
      overallRisk: riskAssessment.overallRisk,
      totalRisks: riskAssessment.risks.length,
      riskDistribution: {
        critical: riskAssessment.risks.filter(
          (r: any) => r.severity === 'critical'
        ).length,
        high: riskAssessment.risks.filter((r: any) => r.severity === 'high')
          .length,
        medium: riskAssessment.risks.filter((r: any) => r.severity === 'medium')
          .length,
        low: riskAssessment.risks.filter((r: any) => r.severity === 'low')
          .length,
      },
    },
    topRisks: riskAssessment.risks
      .sort((a: any, b: any) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(
        0,
        detailLevel === 'summary' ? 3 : detailLevel === 'detailed' ? 5 : 10
      )
      .map((risk: any) => ({
        id: risk.id,
        category: risk.category,
        severity: risk.severity,
        probability: risk.probability,
        description: risk.description,
        impact: detailLevel !== 'summary' ? risk.impact : undefined,
        mitigation:
          detailLevel === 'comprehensive' ? risk.mitigation : undefined,
      })),
    mitigationStrategies:
      detailLevel !== 'summary'
        ? riskAssessment.mitigationStrategies.slice(
            0,
            detailLevel === 'comprehensive' ? 10 : 5
          )
        : undefined,
  };

  // Add risk matrix for comprehensive level
  if (detailLevel === 'comprehensive') {
    formatted.riskMatrix = generateRiskMatrix(riskAssessment.risks);
  }

  return formatted;
}

/**
 * Format technology recommendations
 */
function formatTechnologyRecommendations(
  techStack: any[],
  detailLevel: string,
  preferredTech?: string[]
): any {
  const categoryGroups = techStack.reduce((groups: any, tech: any) => {
    if (!groups[tech.category]) {
      groups[tech.category] = [];
    }
    groups[tech.category].push(tech);
    return groups;
  }, {});

  const formatted: any = {
    summary: {
      totalRecommendations: techStack.length,
      categories: Object.keys(categoryGroups),
      averageConfidence:
        Math.round(
          (techStack.reduce((sum, tech) => sum + tech.confidence, 0) /
            techStack.length) *
            100
        ) / 100,
    },
    byCategory: Object.entries(categoryGroups).map(
      ([category, technologies]: [string, any]) => ({
        category,
        recommendations: technologies.map((tech: any) => ({
          technology: tech.technology,
          version: tech.version,
          confidence: tech.confidence,
          reasoning: detailLevel !== 'summary' ? tech.reasoning : undefined,
          alternatives:
            detailLevel === 'comprehensive' ? tech.alternatives : undefined,
          preferred:
            preferredTech?.includes(tech.technology.toLowerCase()) || false,
        })),
      })
    ),
  };

  // Add alignment analysis if preferred technologies provided
  if (preferredTech && preferredTech.length > 0) {
    const alignedTech = techStack.filter(tech =>
      preferredTech.some(preferred =>
        tech.technology.toLowerCase().includes(preferred.toLowerCase())
      )
    );

    formatted.preferredTechAlignment = {
      alignmentScore: Math.round(
        (alignedTech.length / preferredTech.length) * 100
      ),
      alignedTechnologies: alignedTech.map(tech => tech.technology),
      missingPreferred: preferredTech.filter(
        preferred =>
          !techStack.some(tech =>
            tech.technology.toLowerCase().includes(preferred.toLowerCase())
          )
      ),
    };
  }

  return formatted;
}

/**
 * Format implementation plan
 */
function formatImplementationPlan(
  phases: any[],
  taskGroups: any[],
  detailLevel: string
): any {
  const totalDuration = phases.reduce(
    (sum, phase) => sum + phase.estimatedDuration,
    0
  );
  const criticalPath = phases.filter(phase => phase.criticalPath);

  const formatted = {
    summary: {
      totalPhases: phases.length,
      totalDuration,
      criticalPathLength: criticalPath.length,
      parallelPhases: phases.length - criticalPath.length,
    },
    phases: phases.map(phase => ({
      id: phase.id,
      name: phase.name,
      description: detailLevel !== 'summary' ? phase.description : undefined,
      estimatedDuration: phase.estimatedDuration,
      criticalPath: phase.criticalPath,
      dependencies:
        detailLevel === 'comprehensive' ? phase.dependencies : undefined,
      deliverables: detailLevel !== 'summary' ? phase.deliverables : undefined,
      taskGroups:
        detailLevel === 'comprehensive'
          ? phase.taskGroups
              .map((tgId: string) => {
                const taskGroup = taskGroups.find(tg => tg.id === tgId);
                return taskGroup
                  ? {
                      id: taskGroup.id,
                      title: taskGroup.title,
                      estimatedHours: taskGroup.estimatedHours,
                    }
                  : null;
              })
              .filter(Boolean)
          : undefined,
    })),
    criticalPath: {
      phases: criticalPath.map(phase => ({
        name: phase.name,
        duration: phase.estimatedDuration,
      })),
      totalDuration: criticalPath.reduce(
        (sum, phase) => sum + phase.estimatedDuration,
        0
      ),
    },
  };

  return formatted;
}

/**
 * Generate executive summary for comprehensive reports
 */
function generateExecutiveSummary(guidance: any, constraints?: any): any {
  const summary: any = {
    projectViability: assessProjectViability(guidance),
    keyFindings: generateKeyFindings(guidance),
    recommendations: generateExecutiveRecommendations(guidance),
    successFactors: identifySuccessFactors(guidance),
    potentialChallenges: identifyPotentialChallenges(guidance),
  };

  // Add constraint analysis if provided
  if (constraints) {
    summary.constraintAnalysis = analyzeConstraints(guidance, constraints);
  }

  return summary;
}

/**
 * Generate LOCOMOTIVE-specific recommendations
 */
function generateLocomotiveRecommendations(
  guidance: any,
  targetTeamSize?: number
): any {
  const totalAgents = guidance.agentRecommendations.reduce(
    (sum: number, agent: any) => sum + agent.count,
    0
  );

  const recommendations = {
    orchestrationStrategy: determineOrchestrationStrategy(
      guidance.estimatedComplexity,
      totalAgents
    ),
    agentDeployment: {
      concurrent: Math.min(totalAgents, targetTeamSize || totalAgents),
      sequential: totalAgents > (targetTeamSize || 10),
      specialization: guidance.agentRecommendations
        .slice(0, 3)
        .map((agent: any) => ({
          type: agent.agentType,
          priority: agent.priority,
          specialization: agent.specialization,
        })),
    },
    taskDistribution: generateTaskDistribution(guidance.taskBreakdown),
    monitoringRecommendations: generateMonitoringRecommendations(
      guidance.riskAssessment
    ),
  };

  return recommendations;
}

/**
 * Helper functions for analysis
 */
function generateRiskMatrix(risks: any[]): any {
  const matrix = {
    high_high: [],
    high_medium: [],
    high_low: [],
    medium_high: [],
    medium_medium: [],
    medium_low: [],
    low_high: [],
    low_medium: [],
    low_low: [],
  };

  risks.forEach(risk => {
    const key = `${risk.probability}_${risk.severity}`;
    if (matrix[key as keyof typeof matrix]) {
      matrix[key as keyof typeof matrix].push({
        id: risk.id,
        description: risk.description,
      });
    }
  });

  return matrix;
}

function assessProjectViability(guidance: any): string {
  const riskScore = guidance.riskAssessment.overallRisk;
  const complexity = guidance.estimatedComplexity;

  if (riskScore === 'critical' || complexity === 'very-high') {
    return 'HIGH_RISK';
  } else if (riskScore === 'high' || complexity === 'high') {
    return 'MEDIUM_RISK';
  } else {
    return 'LOW_RISK';
  }
}

function generateKeyFindings(guidance: any): string[] {
  const findings = [];

  findings.push(
    `Project complexity assessed as ${guidance.estimatedComplexity}`
  );
  findings.push(
    `Estimated duration: ${guidance.estimatedDuration.minimum}-${guidance.estimatedDuration.maximum} ${guidance.estimatedDuration.unit}`
  );
  findings.push(`Overall risk level: ${guidance.riskAssessment.overallRisk}`);
  findings.push(
    `Recommended team size: ${guidance.agentRecommendations.reduce((sum: number, agent: any) => sum + agent.count, 0)} agents`
  );

  const criticalRisks = guidance.riskAssessment.risks.filter(
    (r: any) => r.severity === 'critical'
  ).length;
  if (criticalRisks > 0) {
    findings.push(
      `${criticalRisks} critical risks identified requiring immediate attention`
    );
  }

  return findings;
}

function generateExecutiveRecommendations(guidance: any): string[] {
  const recommendations = [];

  if (guidance.estimatedComplexity === 'very-high') {
    recommendations.push('Consider phased approach with MVP first');
  }

  if (
    guidance.riskAssessment.overallRisk === 'high' ||
    guidance.riskAssessment.overallRisk === 'critical'
  ) {
    recommendations.push(
      'Invest in comprehensive risk mitigation before starting development'
    );
  }

  recommendations.push(
    'Implement continuous monitoring and regular milestone reviews'
  );

  const topAgent = guidance.agentRecommendations[0];
  if (topAgent) {
    recommendations.push(
      `Prioritize ${topAgent.agentType} agent deployment for early wins`
    );
  }

  return recommendations;
}

function identifySuccessFactors(guidance: any): string[] {
  const factors = [
    'Strong project planning and requirement definition',
    'Appropriate team composition and sizing',
    'Proactive risk management and mitigation',
    'Regular progress monitoring and course correction',
  ];

  if (
    guidance.estimatedComplexity === 'low' ||
    guidance.estimatedComplexity === 'medium'
  ) {
    factors.push('Manageable complexity supports successful delivery');
  }

  return factors;
}

function identifyPotentialChallenges(guidance: any): string[] {
  const challenges = [];

  if (guidance.estimatedComplexity === 'very-high') {
    challenges.push('High complexity may lead to scope creep and delays');
  }

  if (guidance.riskAssessment.risks.length > 5) {
    challenges.push(
      'Multiple risks require careful coordination and monitoring'
    );
  }

  const totalHours = guidance.taskBreakdown.reduce(
    (sum: number, group: any) => sum + group.estimatedHours,
    0
  );
  if (totalHours > 400) {
    challenges.push('Large scope requires strong project management');
  }

  return challenges;
}

function analyzeConstraints(guidance: any, constraints: any): any {
  const analysis = {
    feasibility: 'FEASIBLE',
    concerns: [],
    recommendations: [],
  };

  // Timeline constraint analysis
  if (constraints.timeline) {
    const estimatedWeeks = guidance.estimatedDuration.maximum;
    const constraintWeeks =
      parseInt(constraints.timeline.replace(/\D/g, '')) || estimatedWeeks;

    if (estimatedWeeks > constraintWeeks) {
      analysis.feasibility = 'CHALLENGING';
      analysis.concerns.push(
        `Timeline constraint (${constraintWeeks} weeks) is tighter than estimate (${estimatedWeeks} weeks)`
      );
      analysis.recommendations.push(
        'Consider reducing scope or increasing team size'
      );
    }
  }

  return analysis;
}

function determineOrchestrationStrategy(
  complexity: string,
  agentCount: number
): any {
  if (complexity === 'very-high' || agentCount > 8) {
    return {
      type: 'hierarchical',
      description: 'Use lead agents to coordinate specialized sub-teams',
      structure: 'Architect → Lead Engineers → Specialized Agents',
    };
  } else if (agentCount > 4) {
    return {
      type: 'collaborative',
      description:
        'Direct collaboration between agents with shared coordination',
      structure: 'Cross-functional agent pairs with shared oversight',
    };
  } else {
    return {
      type: 'simple',
      description: 'Direct agent coordination with minimal hierarchy',
      structure: 'Flat structure with regular synchronization',
    };
  }
}

function generateTaskDistribution(taskGroups: any[]): any {
  const distribution = {
    parallel: [],
    sequential: [],
    critical: [],
  };

  taskGroups.forEach(group => {
    if (group.dependencies.length === 0) {
      distribution.parallel.push({
        id: group.id,
        title: group.title,
        estimatedHours: group.estimatedHours,
      });
    } else {
      distribution.sequential.push({
        id: group.id,
        title: group.title,
        dependencies: group.dependencies,
      });
    }

    if (group.priority >= 8) {
      distribution.critical.push({
        id: group.id,
        title: group.title,
        reason: 'High priority task group',
      });
    }
  });

  return distribution;
}

function generateMonitoringRecommendations(riskAssessment: any): string[] {
  const recommendations = [
    'Implement daily agent status reports and progress tracking',
    'Set up automated quality gates for code and documentation',
  ];

  if (
    riskAssessment.overallRisk === 'high' ||
    riskAssessment.overallRisk === 'critical'
  ) {
    recommendations.push(
      'Establish weekly risk review meetings with stakeholders'
    );
    recommendations.push(
      'Implement early warning systems for critical risk indicators'
    );
  }

  recommendations.push(
    'Create cross-agent communication protocols and shared knowledge base'
  );

  return recommendations;
}
