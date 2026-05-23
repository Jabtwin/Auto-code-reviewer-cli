#!/usr/bin/env node
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { GitService } from './services/gitService';
import { AIService } from './services/aiService';
import { Logger } from './utils/logger';

// Load environment variables from .env file
dotenv.config();

const program = new Command();

program
  .name('ai-git')
  .description('AI-Powered Git Workflow Assistant (Auto-Reviewer & Tester)')
  .version('1.0.0');

/**
 * Helper to initialize services and return them.
 */
function getServices(options: { model?: string }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    Logger.error('GEMINI_API_KEY is not defined in your environment variables.');
    Logger.info('Please create a .env file in the root of your project or export the variable:');
    console.log('  GEMINI_API_KEY=your_api_key_here\n');
    process.exit(1);
  }

  const modelName = options.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const gitService = new GitService();
  const aiService = new AIService(apiKey, modelName);

  return { gitService, aiService };
}

program
  .command('review')
  .description('Reviews currently staged Git changes and generates feedback')
  .option('-m, --model <model>', 'Gemini model to use (default: gemini-1.5-flash)')
  .option('-s, --strict', 'Fail and exit with code 1 if any ERROR level feedback is found')
  .action(async (options) => {
    try {
      const { gitService, aiService } = getServices(options);

      Logger.info('Checking Git repository status...');
      const isRepo = await gitService.isGitRepo();
      if (!isRepo) {
        Logger.error('The current directory is not a valid Git repository.');
        process.exit(1);
      }

      Logger.info('Retrieving staged files...');
      const stagedFiles = await gitService.getStagedFiles();
      if (stagedFiles.length === 0) {
        Logger.warn('No staged files found. Please stage your changes with "git add" before running review.');
        process.exit(0);
      }

      Logger.info(`Staged files detected: ${stagedFiles.join(', ')}`);
      Logger.info('Generating staged diff...');
      const diff = await gitService.getStagedDiff();

      Logger.info('Analyzing changes with Gemini AI...');
      const reviewResult = await aiService.generateReview(diff);

      Logger.printReview(reviewResult);

      if (options.strict) {
        const hasErrors = reviewResult.feedbacks.some((fb) => fb.severity === 'error');
        if (hasErrors) {
          Logger.error('Strict mode enabled: Staged changes contain critical error-level feedback. Blocking hook execution.');
          process.exit(1);
        }
      }
    } catch (error: any) {
      Logger.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('generate-tests')
  .description('Generates Jest boilerplate tests for a specific staged file')
  .argument('<filePath>', 'Path of the staged file to generate tests for')
  .option('-m, --model <model>', 'Gemini model to use (default: gemini-1.5-flash)')
  .option('-o, --output <outputPath>', 'Specify custom output path for the test file')
  .action(async (filePath, options) => {
    try {
      const { gitService, aiService } = getServices(options);

      Logger.info('Checking Git repository status...');
      const isRepo = await gitService.isGitRepo();
      if (!isRepo) {
        Logger.error('The current directory is not a valid Git repository.');
        process.exit(1);
      }

      // Resolve file path relative to working dir
      const absolutePath = path.resolve(process.cwd(), filePath);
      if (!fs.existsSync(absolutePath)) {
        Logger.error(`File not found: ${filePath}`);
        process.exit(1);
      }

      // Check if file is staged
      const stagedFiles = await gitService.getStagedFiles();
      const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, '/');
      const isStaged = stagedFiles.includes(relativePath);

      if (!isStaged) {
        Logger.warn(`Warning: File "${filePath}" is not staged in git. We will generate tests using its working directory content.`);
      }

      Logger.info(`Reading content of ${filePath}...`);
      let fileContent = '';
      if (isStaged) {
        fileContent = await gitService.getStagedFileContent(relativePath);
      } else {
        fileContent = fs.readFileSync(absolutePath, 'utf-8');
      }

      Logger.info('Requesting test generation from Gemini...');
      const testCode = await aiService.generateTestFile(relativePath, fileContent);

      // Determine output path
      let outputPath = options.output;
      if (!outputPath) {
        const parsedPath = path.parse(absolutePath);
        outputPath = path.join(parsedPath.dir, `${parsedPath.name}.test.ts`);
      }

      // If output directory doesn't exist, create it recursively
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      Logger.info(`Writing generated test boilerplate to: ${outputPath}`);
      fs.writeFileSync(outputPath, testCode, 'utf-8');
      Logger.success('Successfully generated unit test boilerplate file! 🎉');
    } catch (error: any) {
      Logger.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
