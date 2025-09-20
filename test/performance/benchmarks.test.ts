/**
 * Performance Benchmarking Tests
 * Tests performance characteristics and regression testing
 */

import { TemplateManager } from '../../src/lib/template-manager';
import { PRPGenerator } from '../../src/lib/prp-generator';
import { Factory, FileSystem, Performance } from '../test-helpers/index';
import { PRPTemplate, PRPGenerationRequest } from '../../src/types/index';

describe('Performance Benchmarks', () => {
  let templateManager: TemplateManager;
  let prpGenerator: PRPGenerator;
  let tempDir: string;
  let largeTemplateSet: PRPTemplate[];

  beforeAll(async () => {
    tempDir = await FileSystem.createTempDir('performance-benchmarks');

    // Create a variety of templates for comprehensive performance testing
    largeTemplateSet = [
      // Small templates (1-3 sections)
      ...Array.from({ length: 20 }, (_, i) =>
        Factory.createPRPTemplate({
          id: `small-template-${i}`,
          name: `Small Template ${i}`,
          category: 'small',
          sections: Array.from({ length: Math.min(3, i + 1) }, (_, j) =>
            Factory.createPRPSection({
              title: `Section ${j + 1} for {{projectName}}`,
              content: `Basic content for section ${j + 1} in {{domain}}.`
            })
          )
        })
      ),

      // Medium templates (4-10 sections)
      ...Array.from({ length: 15 }, (_, i) =>
        Factory.createPRPTemplate({
          id: `medium-template-${i}`,
          name: `Medium Template ${i}`,
          category: 'medium',
          sections: Array.from({ length: 4 + (i % 7) }, (_, j) =>
            Factory.createPRPSection({
              title: `Section ${j + 1} for {{projectName}}`,
              content: `Medium content for section ${j + 1} in {{domain}}. `.repeat(5),
              examples: [`Example ${j + 1}`, `Another example for {{projectName}}`],
              requirements: [`Requirement ${j + 1}`, `Another requirement for {{domain}}`]
            })
          )
        })
      ),

      // Large templates (11-25 sections)
      ...Array.from({ length: 10 }, (_, i) =>
        Factory.createPRPTemplate({
          id: `large-template-${i}`,
          name: `Large Template ${i}`,
          category: 'large',
          sections: Array.from({ length: 11 + (i % 15) }, (_, j) =>
            Factory.createPRPSection({
              title: `Section ${j + 1} for {{projectName}}`,
              content: `Extensive content for section ${j + 1} in {{domain}} focusing on {{stakeholders}}. `.repeat(10),
              examples: Array.from({ length: 5 }, (_, k) => `Example ${k + 1} for {{projectName}}`),
              requirements: Array.from({ length: 8 }, (_, k) => `Requirement ${k + 1} for {{domain}}`)
            })
          )
        })
      ),

      // Very large templates (26+ sections)
      ...Array.from({ length: 5 }, (_, i) =>
        Factory.createPRPTemplate({
          id: `xl-template-${i}`,
          name: `Extra Large Template ${i}`,
          category: 'extra-large',
          sections: Array.from({ length: 26 + i * 10 }, (_, j) =>
            Factory.createPRPSection({
              title: `Complex Section ${j + 1} for {{projectName}}`,
              content: `Comprehensive content for section ${j + 1} in {{domain}} with detailed analysis of {{objectives}} and {{constraints}}. `.repeat(15),
              examples: Array.from({ length: 10 }, (_, k) => `Detailed example ${k + 1} for {{projectName}} in {{domain}}`),
              requirements: Array.from({ length: 12 }, (_, k) => `Complex requirement ${k + 1} addressing {{stakeholders}} needs`),
              metadata: {
                complexity: 'high',
                estimatedTime: `${j + 1} hours`,
                dependencies: [`section-${j}`, `section-${j + 2}`]
              }
            })
          )
        })
      )
    ];

    await FileSystem.createMockTemplateFiles(tempDir, largeTemplateSet);

    templateManager = new TemplateManager(tempDir, tempDir);
    await templateManager.initialize();

    prpGenerator = new PRPGenerator(templateManager);
  });

  afterAll(async () => {
    await FileSystem.cleanup(tempDir);
  });

  describe('Template Loading Performance', () => {
    it('should load templates within acceptable time limits', async () => {
      const freshTemplateManager = new TemplateManager(tempDir, tempDir);

      const { duration, result } = await Performance.measureTime(async () => {
        await freshTemplateManager.initialize();
        return freshTemplateManager.getAllTemplates();
      });

      // Should load 50 templates in under 1 second
      expect(duration).toBeLessThan(1000);
      expect(result).toHaveLength(50);
    });

    it('should handle template refresh efficiently', async () => {
      const { duration } = await Performance.measureTime(async () => {
        await templateManager.refresh();
      });

      // Template refresh should be faster than initial load
      expect(duration).toBeLessThan(800);
    });

    it('should perform template searches quickly', async () => {
      const searchTerms = ['template', 'section', 'project', 'content', 'medium'];

      for (const term of searchTerms) {
        const { duration, result } = await Performance.measureTime(async () => {
          return templateManager.searchTemplates(term);
        });

        // Each search should complete in under 100ms
        expect(duration).toBeLessThan(100);
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('should handle category filtering efficiently', async () => {
      const categories = ['small', 'medium', 'large', 'extra-large'];

      for (const category of categories) {
        const { duration, result } = await Performance.measureTime(async () => {
          return templateManager.getTemplatesByCategory(category);
        });

        // Category filtering should be very fast
        expect(duration).toBeLessThan(50);
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('PRP Generation Performance', () => {
    const performanceTestContext = {
      name: 'Performance Test Application',
      domain: 'high-performance web application development',
      stakeholders: [
        'performance engineers',
        'software architects',
        'quality assurance team',
        'product owners',
        'end users',
        'system administrators'
      ],
      objectives: [
        'Achieve 99.9% uptime',
        'Handle 10,000 concurrent users',
        'Maintain sub-second response times',
        'Ensure scalable architecture',
        'Implement comprehensive monitoring'
      ],
      constraints: [
        'Budget limit of $500,000',
        '6-month development timeline',
        'Legacy system integration required',
        'Compliance with industry regulations',
        'Limited infrastructure resources'
      ]
    };

    it('should generate small template PRPs quickly', async () => {
      const smallTemplate = templateManager.getTemplate('small-template-0');
      expect(smallTemplate).not.toBeNull();

      const request: PRPGenerationRequest = {
        templateId: 'small-template-0',
        projectContext: performanceTestContext,
        outputFormat: 'markdown'
      };

      const { duration, result } = await Performance.measureTime(async () => {
        return await prpGenerator.generatePRP(request);
      });

      // Small templates should generate very quickly
      expect(duration).toBeLessThan(50);
      expect(result).toContain('Performance Test Application');
    });

    it('should handle medium template generation efficiently', async () => {
      const request: PRPGenerationRequest = {
        templateId: 'medium-template-5',
        projectContext: performanceTestContext,
        outputFormat: 'markdown'
      };

      const { duration, result } = await Performance.measureTime(async () => {
        return await prpGenerator.generatePRP(request);
      });

      // Medium templates should still be fast
      expect(duration).toBeLessThan(200);
      expect(result).toContain('high-performance web application development');
    });

    it('should handle large template generation within limits', async () => {
      const request: PRPGenerationRequest = {
        templateId: 'large-template-3',
        projectContext: performanceTestContext,
        outputFormat: 'markdown'
      };

      const { duration, result } = await Performance.measureTime(async () => {
        return await prpGenerator.generatePRP(request);
      });

      // Large templates should complete within reasonable time
      expect(duration).toBeLessThan(500);
      expect(result.length).toBeGreaterThan(5000); // Should be substantial content
    });

    it('should handle extra-large template generation', async () => {
      const request: PRPGenerationRequest = {
        templateId: 'xl-template-0',
        projectContext: performanceTestContext,
        outputFormat: 'markdown'
      };

      const { duration, result } = await Performance.measureTime(async () => {
        return await prpGenerator.generatePRP(request);
      });

      // Extra-large templates allowed more time but should still be reasonable
      expect(duration).toBeLessThan(1500);
      expect(result.length).toBeGreaterThan(10000); // Should be very substantial content

      // Verify all context substitutions were processed
      expect(result).not.toContain('{{projectName}}');
      expect(result).not.toContain('{{domain}}');
      expect(result).not.toContain('{{stakeholders}}');
    });

    it('should handle different output formats efficiently', async () => {
      const baseRequest: PRPGenerationRequest = {
        templateId: 'medium-template-0',
        projectContext: performanceTestContext
      };

      const formats: Array<'markdown' | 'json' | 'html'> = ['markdown', 'json', 'html'];
      const results: Record<string, { duration: number; result: string }> = {};

      for (const format of formats) {
        const request = { ...baseRequest, outputFormat: format };
        results[format] = await Performance.measureTime(async () => {
          return await prpGenerator.generatePRP(request);
        });

        // All formats should complete quickly
        expect(results[format].duration).toBeLessThan(300);
      }

      // JSON should generally be fastest (no formatting overhead)
      expect(results.json.duration).toBeLessThanOrEqual(results.markdown.duration);

      // HTML might be slightly slower due to formatting
      // but should still be reasonable
      expect(results.html.duration).toBeLessThan(400);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent template searches', async () => {
      const searchPromises = Array.from({ length: 20 }, (_, i) =>
        Performance.measureTime(async () => {
          return templateManager.searchTemplates(`template-${i % 5}`);
        })
      );

      const { duration, result: results } = await Performance.measureTime(async () => {
        return await Promise.all(searchPromises);
      });

      // All concurrent searches should complete quickly
      expect(duration).toBeLessThan(500);
      expect(results).toHaveLength(20);

      // Individual searches should still be fast despite concurrency
      const maxIndividualTime = Math.max(...results.map(r => r.duration));
      expect(maxIndividualTime).toBeLessThan(200);
    });

    it('should handle concurrent PRP generation', async () => {
      const generationPromises = Array.from({ length: 10 }, (_, i) =>
        Performance.measureTime(async () => {
          const request: PRPGenerationRequest = {
            templateId: `small-template-${i % 5}`,
            projectContext: {
              ...performanceTestContext,
              name: `Concurrent Project ${i}`
            },
            outputFormat: 'markdown'
          };
          return await prpGenerator.generatePRP(request);
        })
      );

      const { duration, result: results } = await Performance.measureTime(async () => {
        return await Promise.all(generationPromises);
      });

      // Concurrent generation should complete within reasonable time
      expect(duration).toBeLessThan(2000);
      expect(results).toHaveLength(10);

      // Verify each generation completed successfully
      results.forEach((result, i) => {
        expect(result.result).toContain(`Concurrent Project ${i}`);
        expect(result.duration).toBeLessThan(1000);
      });
    });

    it('should handle mixed operations concurrently', async () => {
      const mixedOperations = [
        // Template searches
        ...Array.from({ length: 5 }, () =>
          Performance.measureTime(() => Promise.resolve(templateManager.searchTemplates('template')))
        ),
        // Category filtering
        ...Array.from({ length: 5 }, () =>
          Performance.measureTime(() => Promise.resolve(templateManager.getTemplatesByCategory('medium')))
        ),
        // PRP generations
        ...Array.from({ length: 5 }, (_, i) =>
          Performance.measureTime(async () => {
            const request: PRPGenerationRequest = {
              templateId: 'small-template-0',
              projectContext: {
                name: `Mixed Operation ${i}`,
                domain: 'testing'
              }
            };
            return await prpGenerator.generatePRP(request);
          })
        )
      ];

      const { duration, result: results } = await Performance.measureTime(async () => {
        return await Promise.all(mixedOperations);
      });

      // Mixed concurrent operations should complete efficiently
      expect(duration).toBeLessThan(2000);
      expect(results).toHaveLength(15);
    });
  });

  describe('Memory Usage and Scalability', () => {
    it('should handle repeated operations without memory leaks', async () => {
      // Perform many operations to test memory efficiency
      const operations = [];

      for (let i = 0; i < 100; i++) {
        operations.push(
          Performance.measureTime(async () => {
            // Mix of different operations
            const templates = templateManager.getAllTemplates();
            const searched = templateManager.searchTemplates(`template-${i % 10}`);

            if (i % 10 === 0) {
              const request: PRPGenerationRequest = {
                templateId: 'small-template-0',
                projectContext: {
                  name: `Memory Test ${i}`,
                  domain: 'memory-testing'
                }
              };
              await prpGenerator.generatePRP(request);
            }

            return templates.length + searched.length;
          })
        );
      }

      const { duration, result: results } = await Performance.measureTime(async () => {
        return await Promise.all(operations);
      });

      // Should complete all operations efficiently
      expect(duration).toBeLessThan(5000);
      expect(results).toHaveLength(100);

      // Verify consistent performance (no significant degradation)
      const firstTenAvg = results.slice(0, 10).reduce((sum, r) => sum + r.duration, 0) / 10;
      const lastTenAvg = results.slice(-10).reduce((sum, r) => sum + r.duration, 0) / 10;

      // Performance shouldn't degrade significantly over time
      expect(lastTenAvg).toBeLessThan(firstTenAvg * 2);
    });

    it('should handle large context substitutions efficiently', async () => {
      const largeContext = {
        name: 'Large Context Project'.repeat(10),
        domain: 'complex enterprise software development with extensive requirements and stakeholder management',
        stakeholders: Array.from({ length: 50 }, (_, i) => `Stakeholder ${i + 1} with detailed description`),
        objectives: Array.from({ length: 30 }, (_, i) => `Complex objective ${i + 1} with detailed requirements and success criteria`),
        constraints: Array.from({ length: 25 }, (_, i) => `Detailed constraint ${i + 1} with comprehensive impact analysis`)
      };

      const request: PRPGenerationRequest = {
        templateId: 'large-template-0',
        projectContext: largeContext,
        outputFormat: 'markdown'
      };

      const { duration, result } = await Performance.measureTime(async () => {
        return await prpGenerator.generatePRP(request);
      });

      // Should handle large context efficiently
      expect(duration).toBeLessThan(2000);
      expect(result.length).toBeGreaterThan(20000); // Should generate substantial content

      // Verify all substitutions were processed correctly
      expect(result).toContain('Large Context ProjectLarge Context Project'); // Repeated name
      expect(result).toContain('Stakeholder 1 with detailed description');
      expect(result).toContain('Complex objective 1 with detailed');
    });
  });

  describe('Performance Regression Detection', () => {
    const benchmarkThresholds = {
      templateLoading: 1000, // ms
      smallPRPGeneration: 100,
      mediumPRPGeneration: 300,
      largePRPGeneration: 800,
      templateSearch: 150,
      concurrentOperations: 2500
    };

    it('should meet template loading benchmarks', async () => {
      const freshManager = new TemplateManager(tempDir, tempDir);

      const { duration } = await Performance.measureTime(async () => {
        await freshManager.initialize();
      });

      expect(duration).toBeLessThan(benchmarkThresholds.templateLoading);
    });

    it('should meet PRP generation benchmarks', async () => {
      const testCases = [
        { templateId: 'small-template-0', threshold: benchmarkThresholds.smallPRPGeneration },
        { templateId: 'medium-template-0', threshold: benchmarkThresholds.mediumPRPGeneration },
        { templateId: 'large-template-0', threshold: benchmarkThresholds.largePRPGeneration }
      ];

      for (const testCase of testCases) {
        const request: PRPGenerationRequest = {
          templateId: testCase.templateId,
          projectContext: performanceTestContext,
          outputFormat: 'markdown'
        };

        const { duration } = await Performance.measureTime(async () => {
          return await prpGenerator.generatePRP(request);
        });

        expect(duration).toBeLessThan(testCase.threshold);
      }
    });

    it('should meet search performance benchmarks', async () => {
      const { duration } = await Performance.measureTime(async () => {
        return templateManager.searchTemplates('template');
      });

      expect(duration).toBeLessThan(benchmarkThresholds.templateSearch);
    });

    it('should meet concurrent operation benchmarks', async () => {
      const concurrentOps = Array.from({ length: 20 }, (_, i) =>
        templateManager.searchTemplates(`template-${i % 5}`)
      );

      const { duration } = await Performance.measureTime(async () => {
        return await Promise.all(concurrentOps);
      });

      expect(duration).toBeLessThan(benchmarkThresholds.concurrentOperations);
    });

    it('should provide consistent performance across runs', async () => {
      const runs = 5;
      const results: number[] = [];

      for (let i = 0; i < runs; i++) {
        const { duration } = await Performance.measureTime(async () => {
          const request: PRPGenerationRequest = {
            templateId: 'medium-template-0',
            projectContext: performanceTestContext,
            outputFormat: 'markdown'
          };
          return await prpGenerator.generatePRP(request);
        });
        results.push(duration);
      }

      // Calculate variance to check consistency
      const average = results.reduce((a, b) => a + b, 0) / results.length;
      const variance = results.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / results.length;
      const standardDeviation = Math.sqrt(variance);

      // Standard deviation should be less than 20% of average
      expect(standardDeviation).toBeLessThan(average * 0.2);

      // No individual run should be more than 2x the average
      results.forEach(result => {
        expect(result).toBeLessThan(average * 2);
      });
    });
  });
});