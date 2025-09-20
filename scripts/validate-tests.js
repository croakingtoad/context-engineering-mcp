#!/usr/bin/env node

/**
 * Comprehensive Test Validation Script
 * Validates test suite completeness and quality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const TEST_DIR = path.join(PROJECT_ROOT, 'test');

class TestValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      sourceFiles: 0,
      testFiles: 0,
      coverageGaps: [],
      missingTests: []
    };
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    console.log(`${icons[type]} ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  getAllFiles(dir, extension) {
    const files = [];

    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);

      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        } else if (stat.isFile() && item.endsWith(extension)) {
          files.push(fullPath);
        }
      });
    }

    if (fs.existsSync(dir)) {
      traverse(dir);
    }

    return files;
  }

  validateTestStructure() {
    this.log('🏗️  Validating test structure...', 'info');

    const requiredTestDirs = [
      'test/test-helpers',
      'test/integration',
      'test/e2e',
      'test/performance',
      'test-fixtures'
    ];

    requiredTestDirs.forEach(dir => {
      const fullPath = path.join(PROJECT_ROOT, dir);
      if (!fs.existsSync(fullPath)) {
        this.addError(`Missing required test directory: ${dir}`);
      } else {
        this.log(`Found test directory: ${dir}`, 'success');
      }
    });

    // Check for test helper files
    const testHelpersPath = path.join(PROJECT_ROOT, 'test/test-helpers/index.ts');
    if (!fs.existsSync(testHelpersPath)) {
      this.addError('Missing test helpers: test/test-helpers/index.ts');
    }

    // Check for test fixtures
    const testFixturesPath = path.join(PROJECT_ROOT, 'test-fixtures');
    if (fs.existsSync(testFixturesPath)) {
      const fixtures = fs.readdirSync(testFixturesPath);
      if (fixtures.length === 0) {
        this.addWarning('Test fixtures directory is empty');
      } else {
        this.log(`Found ${fixtures.length} test fixture directories`, 'success');
      }
    }
  }

  validateTestCoverage() {
    this.log('📊 Validating test coverage...', 'info');

    const sourceFiles = this.getAllFiles(SRC_DIR, '.ts').filter(f => !f.includes('.d.ts'));
    const testFiles = this.getAllFiles(PROJECT_ROOT, '.test.ts')
      .concat(this.getAllFiles(PROJECT_ROOT, '.spec.ts'));

    this.stats.sourceFiles = sourceFiles.length;
    this.stats.testFiles = testFiles.length;

    this.log(`Found ${sourceFiles.length} source files`, 'info');
    this.log(`Found ${testFiles.length} test files`, 'info');

    // Check for corresponding test files
    sourceFiles.forEach(sourceFile => {
      const relativePath = path.relative(SRC_DIR, sourceFile);
      const expectedTestPath = path.join(SRC_DIR, path.dirname(relativePath), '__tests__', path.basename(relativePath, '.ts') + '.test.ts');

      if (!fs.existsSync(expectedTestPath)) {
        // Check for alternative test locations
        const altTestPath1 = path.join(TEST_DIR, 'unit', relativePath.replace('.ts', '.test.ts'));
        const altTestPath2 = path.join(TEST_DIR, relativePath.replace('.ts', '.test.ts'));

        if (!fs.existsSync(altTestPath1) && !fs.existsSync(altTestPath2)) {
          this.stats.missingTests.push(relativePath);
          this.addWarning(`No test file found for: ${relativePath}`);
        }
      }
    });

    if (this.stats.missingTests.length === 0) {
      this.log('All source files have corresponding tests', 'success');
    } else {
      this.log(`${this.stats.missingTests.length} source files missing tests`, 'warning');
    }
  }

  validateTestQuality() {
    this.log('🔍 Validating test quality...', 'info');

    const testFiles = this.getAllFiles(PROJECT_ROOT, '.test.ts')
      .concat(this.getAllFiles(PROJECT_ROOT, '.spec.ts'));

    let totalTests = 0;
    let filesWithoutDescribe = 0;
    let filesWithoutBeforeEach = 0;

    testFiles.forEach(testFile => {
      try {
        const content = fs.readFileSync(testFile, 'utf8');

        // Count test cases
        const testMatches = content.match(/\b(it|test)\s*\(/g) || [];
        totalTests += testMatches.length;

        // Check for describe blocks
        if (!content.includes('describe(')) {
          filesWithoutDescribe++;
          this.addWarning(`Test file lacks describe blocks: ${path.relative(PROJECT_ROOT, testFile)}`);
        }

        // Check for setup/teardown
        if (!content.includes('beforeEach') && !content.includes('beforeAll')) {
          filesWithoutBeforeEach++;
        }

        // Check for proper mocking
        if (content.includes('require(') && !content.includes('jest.mock')) {
          this.addWarning(`Test file may need mocking setup: ${path.relative(PROJECT_ROOT, testFile)}`);
        }

        // Check test file size (too large may indicate poor organization)
        const lines = content.split('\n').length;
        if (lines > 1000) {
          this.addWarning(`Large test file (${lines} lines): ${path.relative(PROJECT_ROOT, testFile)}`);
        }

        // Check for async test handling
        if (content.includes('async') && !content.includes('await')) {
          this.addWarning(`Async tests without await: ${path.relative(PROJECT_ROOT, testFile)}`);
        }

      } catch (error) {
        this.addError(`Error reading test file ${testFile}: ${error.message}`);
      }
    });

    this.log(`Total test cases found: ${totalTests}`, 'info');

    if (totalTests < this.stats.sourceFiles * 3) {
      this.addWarning(`Low test-to-source ratio (${(totalTests / this.stats.sourceFiles).toFixed(1)}:1)`);
    } else {
      this.log(`Good test-to-source ratio (${(totalTests / this.stats.sourceFiles).toFixed(1)}:1)`, 'success');
    }
  }

  validateJestConfiguration() {
    this.log('⚙️  Validating Jest configuration...', 'info');

    const jestConfigPath = path.join(PROJECT_ROOT, 'jest.config.js');
    if (!fs.existsSync(jestConfigPath)) {
      this.addError('Missing Jest configuration file');
      return;
    }

    try {
      const jestConfig = require(jestConfigPath);

      // Check required configuration
      const requiredFields = ['preset', 'testEnvironment', 'collectCoverageFrom', 'coverageThreshold'];

      requiredFields.forEach(field => {
        if (!jestConfig[field]) {
          this.addWarning(`Jest config missing: ${field}`);
        }
      });

      // Check coverage thresholds
      if (jestConfig.coverageThreshold) {
        const thresholds = jestConfig.coverageThreshold.global;
        const minThreshold = 90;

        ['branches', 'functions', 'lines', 'statements'].forEach(metric => {
          if (!thresholds[metric] || thresholds[metric] < minThreshold) {
            this.addWarning(`Coverage threshold for ${metric} should be >= ${minThreshold}%`);
          }
        });
      }

      this.log('Jest configuration validated', 'success');

    } catch (error) {
      this.addError(`Error reading Jest config: ${error.message}`);
    }
  }

  runTestSuite() {
    this.log('🧪 Running test suite...', 'info');

    try {
      // Run tests with coverage
      execSync('npm run test:ci', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        timeout: 300000 // 5 minutes
      });

      this.log('Test suite passed', 'success');
      return true;
    } catch (error) {
      this.addError(`Test suite failed: ${error.message}`);
      return false;
    }
  }

  validateCoverageReport() {
    this.log('📈 Validating coverage report...', 'info');

    const coverageSummaryPath = path.join(PROJECT_ROOT, 'coverage/coverage-summary.json');

    if (!fs.existsSync(coverageSummaryPath)) {
      this.addError('Coverage summary not found');
      return;
    }

    try {
      const coverage = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
      const total = coverage.total;

      const metrics = ['statements', 'branches', 'functions', 'lines'];
      let failedMetrics = [];

      metrics.forEach(metric => {
        const percentage = total[metric].pct;
        if (percentage < 90) {
          failedMetrics.push(`${metric}: ${percentage.toFixed(2)}%`);
        }
      });

      if (failedMetrics.length > 0) {
        this.addError(`Coverage below threshold: ${failedMetrics.join(', ')}`);
      } else {
        this.log('All coverage thresholds met', 'success');
      }

      // Check individual file coverage
      const files = Object.keys(coverage).filter(key => key !== 'total');
      const lowCoverageFiles = files.filter(file => {
        const fileCoverage = coverage[file];
        const avgCoverage = (
          fileCoverage.statements.pct +
          fileCoverage.branches.pct +
          fileCoverage.functions.pct +
          fileCoverage.lines.pct
        ) / 4;
        return avgCoverage < 80;
      });

      if (lowCoverageFiles.length > 0) {
        this.addWarning(`${lowCoverageFiles.length} files have low coverage (<80%)`);
        this.stats.coverageGaps = lowCoverageFiles;
      }

    } catch (error) {
      this.addError(`Error reading coverage report: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST VALIDATION REPORT');
    console.log('='.repeat(60));

    console.log('\n📊 Statistics:');
    console.log(`Source files: ${this.stats.sourceFiles}`);
    console.log(`Test files: ${this.stats.testFiles}`);
    console.log(`Missing test files: ${this.stats.missingTests.length}`);
    console.log(`Low coverage files: ${this.stats.coverageGaps.length}`);

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach((warning, i) => {
        console.log(`${i + 1}. ${warning}`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }

    console.log('\n📈 Recommendations:');
    if (this.stats.missingTests.length > 0) {
      console.log('• Add tests for files without coverage');
    }
    if (this.stats.coverageGaps.length > 0) {
      console.log('• Improve coverage for low-coverage files');
    }
    if (this.warnings.length > 5) {
      console.log('• Address test quality warnings');
    }
    if (this.errors.length === 0 && this.warnings.length < 3) {
      console.log('• Test suite is in excellent condition! 🎉');
    }

    console.log('\n' + '='.repeat(60));

    const status = this.errors.length === 0 ? 'PASSED' : 'FAILED';
    const icon = this.errors.length === 0 ? '✅' : '❌';
    console.log(`${icon} Overall Status: ${status}`);
    console.log('='.repeat(60));

    return this.errors.length === 0;
  }

  run() {
    this.log('🚀 Starting comprehensive test validation...', 'info');

    this.validateTestStructure();
    this.validateTestCoverage();
    this.validateJestConfiguration();
    this.validateTestQuality();

    // Run tests only if structure is valid
    if (this.errors.length === 0) {
      const testsPassed = this.runTestSuite();
      if (testsPassed) {
        this.validateCoverageReport();
      }
    } else {
      this.log('Skipping test execution due to structure errors', 'warning');
    }

    return this.generateReport();
  }
}

function main() {
  const validator = new TestValidator();
  const passed = validator.run();
  process.exit(passed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { TestValidator };