import { z } from 'zod';
import { PRPValidator } from '../lib/prp-validator.js';

// PRP validator will be injected by main server
let prpValidator: PRPValidator;

export function setPRPValidatorDependency(validator: PRPValidator) {
  prpValidator = validator;
}

const ValidatePRPArgsSchema = z.object({
  prpContent: z.string(),
  templateId: z.string().optional(),
  includeDetailedFeedback: z.boolean().default(true),
});

export async function validatePRPToolHandler(args: unknown): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  try {
    const validatedArgs = ValidatePRPArgsSchema.parse(args);

    if (!prpValidator) {
      throw new Error('PRP validator not initialized');
    }

    // Use real PRP validator
    const validationResult = await prpValidator.validatePRP(
      validatedArgs.prpContent
    );

    const response = {
      isValid: validationResult.isValid,
      score: validationResult.score,
      maxScore: validationResult.maxScore,
      sections: validationResult.sections,
      recommendations: validationResult.recommendations,
      missingElements: validationResult.missingElements,
      antiPatterns: validationResult.antiPatterns,
      message: `PRP validation complete - Score: ${validationResult.score}/${validationResult.maxScore}`,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error validating PRP: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
