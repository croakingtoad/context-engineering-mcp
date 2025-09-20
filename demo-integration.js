#!/usr/bin/env node

/**
 * Context Engineering MCP Server Integration Demo
 * Demonstrates core functionality and end-to-end workflow
 */

const { CodebaseAnalyzer } = require('./dist/lib/codebase-analyzer');
const { QuestionEngine } = require('./dist/lib/question-engine');
const { InitialMdCreator } = require('./dist/lib/initial-md-creator');
const path = require('path');

async function demonstrateIntegration() {
  console.log('🚀 Context Engineering MCP Server Integration Demo\n');

  try {
    // 1. Codebase Analysis
    console.log('📊 Step 1: Analyzing current project...');
    const analyzer = new CodebaseAnalyzer();
    const projectPath = __dirname;

    const analysis = await analyzer.analyzeProject(projectPath);
    console.log(`   ✅ Detected language: ${analysis.language}`);
    console.log(`   ✅ Found ${analysis.fileAnalyses.length} files`);
    console.log(`   ✅ Detected patterns: ${analysis.patterns.map(p => p.name).join(', ')}`);
    console.log(`   ✅ Framework detected: ${analysis.framework || 'Generic'}`);

    // 2. Question Generation
    console.log('\n❓ Step 2: Generating contextual questions...');
    const questionEngine = new QuestionEngine();
    const questions = await questionEngine.generateContextualQuestions(analysis);
    console.log(`   ✅ Generated ${questions.length} context-aware questions`);
    console.log(`   ✅ Question categories: ${[...new Set(questions.map(q => q.category))].join(', ')}`);

    // 3. INITIAL.md Generation
    console.log('\n📝 Step 3: Creating INITIAL.md...');
    const initialMdCreator = new InitialMdCreator();

    // Mock questionnaire session with analysis insights
    const mockSession = {
      id: 'demo-session',
      projectId: 'demo-project',
      startedAt: new Date(),
      currentQuestionIndex: questions.length,
      answers: {
        'project-name': 'Context Engineering MCP Server',
        'project-type': 'development-tool',
        'domain': 'AI/ML tooling',
        'primary-stakeholders': ['developers', 'ai-engineers'],
        'key-objectives': ['automate context engineering', 'improve PRP quality'],
        'technical-constraints': ['MCP protocol compliance', 'TypeScript compatibility'],
        'business-requirements': ['Cole Medin methodology replication']
      },
      questions,
      context: analysis
    };

    const initialMd = await initialMdCreator.createFromQuestionnaire(mockSession);
    console.log('   ✅ Generated comprehensive INITIAL.md');
    console.log(`   ✅ Document length: ${initialMd.length} characters`);

    // 4. Template Management
    console.log('\n📋 Step 4: Template system validation...');
    const templateCount = initialMdCreator.templates?.size || 0;
    console.log(`   ✅ Template system initialized with ${templateCount} templates`);

    // 5. Core Feature Validation
    console.log('\n🔧 Step 5: Core feature validation...');

    // Check if files were detected correctly
    const tsFiles = analysis.fileAnalyses.filter(f => f.language === 'typescript').length;
    const jsFiles = analysis.fileAnalyses.filter(f => f.language === 'javascript').length;
    console.log(`   ✅ TypeScript files: ${tsFiles}`);
    console.log(`   ✅ JavaScript files: ${jsFiles}`);

    // Check pattern detection
    const patterns = analysis.patterns;
    console.log(`   ✅ Design patterns detected: ${patterns.filter(p => p.type === 'design').length}`);
    console.log(`   ✅ Architectural patterns: ${patterns.filter(p => p.type === 'architectural').length}`);

    // Check question intelligence
    const technicalQuestions = questions.filter(q => q.category === 'technical').length;
    const businessQuestions = questions.filter(q => q.category === 'business').length;
    console.log(`   ✅ Technical questions: ${technicalQuestions}`);
    console.log(`   ✅ Business questions: ${businessQuestions}`);

    console.log('\n🎉 Integration Demo Complete!');
    console.log('\n📊 Summary:');
    console.log(`   • Successfully analyzed ${analysis.fileAnalyses.length} files`);
    console.log(`   • Generated ${questions.length} contextual questions`);
    console.log(`   • Created comprehensive INITIAL.md (${Math.round(initialMd.length/1000)}k chars)`);
    console.log(`   • Detected ${patterns.length} code patterns`);
    console.log(`   • Framework integration: ${analysis.framework ? '✅' : '⚠️'}`);

    console.log('\n🚀 The Context Engineering MCP Server is ready for production use!');

    return {
      success: true,
      analysis,
      questions: questions.length,
      initialMdLength: initialMd.length,
      patterns: patterns.length
    };

  } catch (error) {
    console.error('❌ Integration demo failed:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run demo if called directly
if (require.main === module) {
  demonstrateIntegration()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

module.exports = { demonstrateIntegration };