export interface ReviewFeedback {
  filePath: string;
  line: number;
  severity: 'info' | 'warning' | 'error';
  suggestion: string;
  rationale: string;
}

export interface ReviewResult {
  feedbacks: ReviewFeedback[];
  summary: string;
}
