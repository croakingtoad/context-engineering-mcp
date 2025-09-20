import { QuestionEngine } from '../src/lib/question-engine';
import { ProjectAnalysis, Question, QuestionnaireSession, QuestionTemplate } from '../src/types';

describe('QuestionEngine', () => {
  let questionEngine: QuestionEngine;
  let mockProjectAnalysis: ProjectAnalysis;

  beforeEach(() => {
    questionEngine = new QuestionEngine();

    mockProjectAnalysis = {
      rootPath: '/test/project',
      language: 'typescript',
      framework: 'react, express',
      architecture: ['Component-based', 'Service-oriented'],
      dependencies: {
        'react': '^18.0.0',
        'express': '^4.18.0',
        'zod': '^3.20.0',
      },
      devDependencies: {
        'typescript': '^5.0.0',
        '@types/node': '^20.0.0',
      },
      fileAnalyses: [],
      patterns: [
        {
          id: 'service-pattern',
          name: 'Service Layer',
          description: 'Service layer architecture detected',
          type: 'architectural',
          confidence: 0.8,
          examples: [],
        },
        {
          id: 'component-structure',
          name: 'Component-based Architecture',
          description: 'React component structure detected',
          type: 'framework',
          confidence: 0.9,
          examples: [],
        },
      ],
      conventions: {
        naming: 'camelCase',
        structure: ['src', 'components', 'services'],
        imports: 'relative',
      },
      recommendations: [],
      generatedAt: new Date(),
    };
  });

  describe('generateContextualQuestions', () => {
    it('should generate questions based on project context', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);

      expect(questions).toBeDefined();
      expect(questions.length).toBeGreaterThan(0);

      // Should have questions about React components
      const reactQuestions = questions.filter(q =>
        q.text.toLowerCase().includes('component') || q.text.toLowerCase().includes('react')
      );
      expect(reactQuestions.length).toBeGreaterThan(0);

      // Should have questions about API/backend
      const apiQuestions = questions.filter(q =>
        q.text.toLowerCase().includes('api') || q.text.toLowerCase().includes('endpoint')
      );
      expect(apiQuestions.length).toBeGreaterThan(0);
    });

    it('should prioritize questions correctly', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);

      const sortedByPriority = questions.sort((a, b) => b.priority - a.priority);
      expect(sortedByPriority[0].priority).toBeGreaterThanOrEqual(sortedByPriority[1].priority);
    });

    it('should include required questions', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);

      const requiredQuestions = questions.filter(q => q.required);
      expect(requiredQuestions.length).toBeGreaterThan(0);
    });

    it('should generate framework-specific questions', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);

      // Should include React-specific questions
      const reactContextQuestions = questions.filter(q => q.context?.framework === 'react');
      expect(reactContextQuestions.length).toBeGreaterThan(0);

      // Should include Express-specific questions
      const expressContextQuestions = questions.filter(q => q.context?.framework === 'express');
      expect(expressContextQuestions.length).toBeGreaterThan(0);
    });
  });

  describe('createQuestionnaireSession', () => {
    it('should create a new questionnaire session', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);
      const session = questionEngine.createQuestionnaireSession(
        'test-project',
        mockProjectAnalysis,
        questions
      );

      expect(session).toBeDefined();
      expect(session.projectId).toBe('test-project');
      expect(session.context).toBe(mockProjectAnalysis);
      expect(session.questions).toBe(questions);
      expect(session.currentQuestionIndex).toBe(0);
      expect(session.answers).toEqual({});
      expect(session.completedAt).toBeUndefined();
    });
  });

  describe('getNextQuestion', () => {
    it('should return the next question in sequence', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);
      const session = questionEngine.createQuestionnaireSession(
        'test-project',
        mockProjectAnalysis,
        questions
      );

      const firstQuestion = questionEngine.getNextQuestion(session);
      expect(firstQuestion).toBeDefined();
      expect(firstQuestion!.id).toBe(questions[0].id);

      session.currentQuestionIndex = 1;
      const secondQuestion = questionEngine.getNextQuestion(session);
      expect(secondQuestion!.id).toBe(questions[1].id);
    });

    it('should return null when no more questions', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);
      const session = questionEngine.createQuestionnaireSession(
        'test-project',
        mockProjectAnalysis,
        questions
      );

      session.currentQuestionIndex = questions.length;
      const nextQuestion = questionEngine.getNextQuestion(session);
      expect(nextQuestion).toBeNull();
    });

    it('should skip questions with unmet dependencies', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);

      // Add a dependent question
      questions.push({
        id: 'dependent-question',
        text: 'What database will you use?',
        type: 'multiple-choice',
        category: 'technical',
        priority: 1,
        required: false,
        dependsOn: ['has-database'],
        options: ['PostgreSQL', 'MySQL', 'MongoDB'],
      });

      const session = questionEngine.createQuestionnaireSession(
        'test-project',
        mockProjectAnalysis,
        questions
      );

      // Since 'has-database' is not answered, dependent question should be skipped
      while (questionEngine.getNextQuestion(session)) {
        const currentQuestion = questionEngine.getNextQuestion(session);
        if (!currentQuestion) break;

        if (currentQuestion.id !== 'dependent-question') {
          session.answers[currentQuestion.id] = 'test-answer';
          session.currentQuestionIndex++;
        }
      }

      expect(session.answers['dependent-question']).toBeUndefined();
    });
  });

  describe('answerQuestion', () => {
    it('should record answers and advance to next question', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);
      const session = questionEngine.createQuestionnaireSession(
        'test-project',
        mockProjectAnalysis,
        questions
      );

      const firstQuestion = questionEngine.getNextQuestion(session)!;
      const result = questionEngine.answerQuestion(session, firstQuestion.id, 'test-answer');

      expect(result.success).toBe(true);
      expect(session.answers[firstQuestion.id]).toBe('test-answer');
      expect(session.currentQuestionIndex).toBe(1);
    });

    it('should validate required questions', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);
      const requiredQuestion = questions.find(q => q.required)!;

      const session = questionEngine.createQuestionnaireSession(
        'test-project',
        mockProjectAnalysis,
        questions
      );

      // Try to answer with empty value
      const result = questionEngine.answerQuestion(session, requiredQuestion.id, '');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate multiple-choice answers', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);
      const multipleChoiceQuestion = questions.find(q => q.type === 'multiple-choice' && q.options)!;

      if (multipleChoiceQuestion) {
        const session = questionEngine.createQuestionnaireSession(
          'test-project',
          mockProjectAnalysis,
          questions
        );

        // Try to answer with invalid option
        const result = questionEngine.answerQuestion(
          session,
          multipleChoiceQuestion.id,
          'invalid-option'
        );

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('generateFollowUpQuestions', () => {
    it('should generate follow-up questions based on answers', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);
      const session = questionEngine.createQuestionnaireSession(
        'test-project',
        mockProjectAnalysis,
        questions
      );

      // Answer a question that might trigger follow-ups
      session.answers['authentication-type'] = 'JWT';

      const followUpQuestions = await questionEngine.generateFollowUpQuestions(session, 'authentication-type');

      expect(followUpQuestions).toBeDefined();
      if (followUpQuestions.length > 0) {
        expect(followUpQuestions[0].text).toBeDefined();
        expect(followUpQuestions[0].category).toBeDefined();
      }
    });
  });

  describe('isSessionComplete', () => {
    it('should return false for incomplete session', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);
      const session = questionEngine.createQuestionnaireSession(
        'test-project',
        mockProjectAnalysis,
        questions
      );

      expect(questionEngine.isSessionComplete(session)).toBe(false);
    });

    it('should return true when all required questions are answered', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);
      const session = questionEngine.createQuestionnaireSession(
        'test-project',
        mockProjectAnalysis,
        questions
      );

      // Answer all required questions
      const requiredQuestions = questions.filter(q => q.required);
      for (const question of requiredQuestions) {
        session.answers[question.id] = 'test-answer';
      }

      expect(questionEngine.isSessionComplete(session)).toBe(true);
    });
  });

  describe('getQuestionsByCategory', () => {
    it('should return questions filtered by category', async () => {
      const questions = await questionEngine.generateContextualQuestions(mockProjectAnalysis);

      const technicalQuestions = questionEngine.getQuestionsByCategory(questions, 'technical');
      expect(technicalQuestions.every(q => q.category === 'technical')).toBe(true);

      const functionalQuestions = questionEngine.getQuestionsByCategory(questions, 'functional');
      expect(functionalQuestions.every(q => q.category === 'functional')).toBe(true);
    });
  });

  describe('template management', () => {
    it('should load and apply question templates', async () => {
      const template: QuestionTemplate = {
        id: 'react-app',
        name: 'React Application',
        description: 'Questions for React-based applications',
        category: 'frontend',
        questions: [
          {
            id: 'react-routing',
            text: 'Do you need client-side routing?',
            type: 'boolean',
            category: 'technical',
            priority: 8,
            required: true,
          },
          {
            id: 'state-management',
            text: 'What state management solution will you use?',
            type: 'multiple-choice',
            category: 'technical',
            priority: 7,
            required: true,
            options: ['React State', 'Redux', 'Zustand', 'Context API'],
          },
        ],
        applicableFrameworks: ['react'],
      };

      questionEngine.registerTemplate(template);

      const applicableTemplates = questionEngine.getApplicableTemplates(mockProjectAnalysis);
      expect(applicableTemplates.length).toBeGreaterThan(0);
      expect(applicableTemplates.find(t => t.id === 'react-app')).toBeDefined();
    });
  });
});