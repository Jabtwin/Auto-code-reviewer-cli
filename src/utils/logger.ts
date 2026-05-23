import pc from 'picocolors';
import { ReviewResult, ReviewFeedback } from '../types';

export class Logger {
  static info(message: string): void {
    console.log(`${pc.cyan(pc.bold('ℹ'))} ${message}`);
  }

  static success(message: string): void {
    console.log(`${pc.green(pc.bold('✔'))} ${message}`);
  }

  static warn(message: string): void {
    console.log(`${pc.yellow(pc.bold('⚠'))} ${message}`);
  }

  static error(message: string): void {
    console.error(`${pc.red(pc.bold('✖'))} ${pc.red(message)}`);
  }

  static heading(text: string): void {
    console.log('\n' + pc.cyan(pc.bold('=== ' + text + ' ===')) + '\n');
  }

  static printReview(review: ReviewResult): void {
    console.log('\n' + pc.cyan(pc.bold('╔══════════════════════════════════════════════════════════════════════════════╗')));
    console.log(`${pc.cyan(pc.bold('║'))} ${pc.magenta(pc.bold('🤖 AI AUTO-REVIEW EXECUTIVE SUMMARY'))}${' '.repeat(40)} ${pc.cyan(pc.bold('║'))}`);
    console.log(pc.cyan(pc.bold('╚══════════════════════════════════════════════════════════════════════════════╝')));

    // Print summary blockquoted
    const formattedSummary = review.summary
      .split('\n')
      .map((line) => `${pc.dim('│')} ${line}`)
      .join('\n');
    console.log(formattedSummary + '\n');

    if (!review.feedbacks || review.feedbacks.length === 0) {
      Logger.success('No issues or optimizations suggested. Code looks pristine! ✨');
      return;
    }

    // Group feedbacks by file
    const grouped: { [filePath: string]: ReviewFeedback[] } = {};
    for (const fb of review.feedbacks) {
      if (!grouped[fb.filePath]) {
        grouped[fb.filePath] = [];
      }
      grouped[fb.filePath].push(fb);
    }

    Logger.heading('DETAILED CODE REVIEW FEEDBACK');

    for (const [filePath, feedbacks] of Object.entries(grouped)) {
      console.log(`${pc.underline(pc.bold(pc.white(filePath)))} (${feedbacks.length} suggestion${feedbacks.length > 1 ? 's' : ''})`);
      console.log(pc.dim('─'.repeat(filePath.length + 15)));

      for (const fb of feedbacks) {
        let sevTag = '';
        if (fb.severity === 'error') {
          sevTag = pc.bgRed(pc.bold(' ERROR '));
        } else if (fb.severity === 'warning') {
          sevTag = pc.bgYellow(pc.bold(pc.black(' WARN ')));
        } else {
          sevTag = pc.bgBlue(pc.bold(' INFO '));
        }

        console.log(`  ${sevTag} ${pc.dim('Line ')}${pc.yellow(fb.line)}:`);
        console.log(`    ${pc.bold('Suggestion:')} ${pc.white(fb.suggestion)}`);
        console.log(`    ${pc.bold('Rationale: ')} ${pc.dim(fb.rationale)}`);
        console.log();
      }
    }

    // Print a quick stats summary
    const counts = { error: 0, warning: 0, info: 0 };
    for (const fb of review.feedbacks) {
      counts[fb.severity] = (counts[fb.severity] || 0) + 1;
    }

    console.log(pc.dim('─'.repeat(80)));
    console.log(
      `${pc.bold('Audit Stats:')} ` +
      `${pc.red(pc.bold(counts.error)) + ' error(s)'} | ` +
      `${pc.yellow(pc.bold(counts.warning)) + ' warning(s)'} | ` +
      `${pc.blue(pc.bold(counts.info)) + ' info comment(s)'}`
    );
    console.log();
  }
}
