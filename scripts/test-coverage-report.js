#!/usr/bin/env node

/**
 * Generate comprehensive test coverage report
 * Analyzes coverage data and generates detailed reports
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_THRESHOLDS = {
  statements: 90,
  branches: 90,
  functions: 90,
  lines: 90
};

function loadCoverageSummary() {
  const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');

  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Coverage summary not found. Run tests with coverage first.');
    console.error('   npm run test:coverage');
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
}

function formatPercentage(value) {
  return `${value.toFixed(2)}%`;
}

function getStatusIcon(actual, threshold) {
  return actual >= threshold ? '✅' : '❌';
}

function generateReport() {
  console.log('\n📊 Test Coverage Report');
  console.log('='.repeat(60));

  const coverage = loadCoverageSummary();
  const total = coverage.total;

  console.log('\n📈 Overall Coverage:');
  console.log('-'.repeat(40));

  const metrics = ['statements', 'branches', 'functions', 'lines'];
  let allPassed = true;

  metrics.forEach(metric => {
    const actual = total[metric].pct;
    const threshold = COVERAGE_THRESHOLDS[metric];
    const passed = actual >= threshold;
    const icon = getStatusIcon(actual, threshold);

    if (!passed) allPassed = false;

    console.log(`${icon} ${metric.padEnd(12)}: ${formatPercentage(actual).padEnd(8)} (threshold: ${formatPercentage(threshold)})`);
  });

  console.log('\n📁 Per-File Coverage:');
  console.log('-'.repeat(40));

  const files = Object.keys(coverage).filter(key => key !== 'total');
  const lowCoverageFiles = [];

  files.forEach(file => {
    const fileCoverage = coverage[file];
    const avgCoverage = (
      fileCoverage.statements.pct +
      fileCoverage.branches.pct +
      fileCoverage.functions.pct +
      fileCoverage.lines.pct
    ) / 4;

    if (avgCoverage < 80) {
      lowCoverageFiles.push({ file, coverage: avgCoverage });
    }

    const icon = avgCoverage >= 80 ? '✅' : '⚠️';
    console.log(`${icon} ${path.basename(file).padEnd(30)}: ${formatPercentage(avgCoverage)}`);
  });

  if (lowCoverageFiles.length > 0) {
    console.log('\n⚠️  Files needing attention:');
    console.log('-'.repeat(40));
    lowCoverageFiles
      .sort((a, b) => a.coverage - b.coverage)
      .forEach(({ file, coverage }) => {
        console.log(`   ${path.basename(file)}: ${formatPercentage(coverage)}`);
      });
  }

  console.log('\n📋 Summary:');
  console.log('-'.repeat(40));
  console.log(`Total files tested: ${files.length}`);
  console.log(`Files with low coverage: ${lowCoverageFiles.length}`);
  console.log(`Overall status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);

  if (!allPassed) {
    console.log('\n💡 To improve coverage:');
    console.log('   1. Add tests for uncovered functions/branches');
    console.log('   2. Test error handling paths');
    console.log('   3. Add edge case testing');
    console.log('   4. Consider integration tests for complex workflows');
  }

  console.log('\n📊 Detailed HTML report available at: coverage/index.html');
  console.log('🔍 LCOV report available at: coverage/lcov.info');

  return allPassed;
}

function main() {
  try {
    const passed = generateReport();
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Error generating coverage report:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateReport, COVERAGE_THRESHOLDS };