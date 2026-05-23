import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { ReviewResult } from '../types';

export class AIService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
    if (!apiKey) {
      throw new Error('API key is required for AIService');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  /**
   * Generates a structured code review of the provided Git staged diff using JSON schema matching.
   */
  async generateReview(diff: string): Promise<ReviewResult> {
    if (!diff.trim()) {
      return { feedbacks: [], summary: 'No staged changes detected to review.' };
    }

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            feedbacks: {
              type: SchemaType.ARRAY,
              description: 'List of specific code review feedbacks',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  filePath: { type: SchemaType.STRING, description: 'The relative file path of the reviewed file' },
                  line: { type: SchemaType.INTEGER, description: 'The line number where the issue or point of interest is found' },
                  severity: { 
                    type: SchemaType.STRING, 
                    enum: ['info', 'warning', 'error'],
                    format: 'enum',
                    description: 'The severity level of the review comment'
                  },
                  suggestion: { type: SchemaType.STRING, description: 'Actionable suggestion for improvements or bug fix' },
                  rationale: { type: SchemaType.STRING, description: 'Explanation or reasoning behind the suggestion' }
                },
                required: ['filePath', 'line', 'severity', 'suggestion', 'rationale']
              }
            },
            summary: { type: SchemaType.STRING, description: 'High-level executive summary of the code changes and overall code quality' }
          },
          required: ['feedbacks', 'summary']
        }
      }
    });

    const systemPrompt = `You are an elite, senior software engineer and security auditor.
Analyze the provided Git staged diff and conduct a thorough code review.

Focus your analysis on:
1. Critical bugs, memory leaks, resource exhaustion, logical errors.
2. Inefficient algorithms or inappropriate choice of data structures.
3. Clean code practices, readability, naming conventions, and style consistency.
4. Security vulnerabilities (e.g. SQL injection, unhandled input, secret exposure).

Provide constructive, actionable suggestions with precise line numbers and file paths as indicated in the diff headers.`;

    const prompt = `Here is the Git staged diff to review:\n\n${diff}`;

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: systemPrompt,
      });

      const responseText = result.response.text();
      return JSON.parse(responseText) as ReviewResult;
    } catch (error: any) {
      throw new Error(`AI Code Review failed: ${error.message}`);
    }
  }

  /**
   * Generates a complete Jest test file for a TypeScript source file's content.
   */
  async generateTestFile(filePath: string, fileContent: string): Promise<string> {
    if (!fileContent.trim()) {
      throw new Error(`File ${filePath} is empty. Cannot generate unit tests.`);
    }

    const model = this.genAI.getGenerativeModel({
      model: this.modelName
    });

    const systemPrompt = `You are a senior test automation engineer specializing in Jest and TypeScript.
Your job is to generate a comprehensive, production-grade Jest unit test file for the provided TypeScript code.

Follow these strict guidelines:
1. Write pure, syntactically correct TypeScript.
2. Use Jest assertions, hooks (describe, test/it, beforeEach, mock), and mocks.
3. Cover happy paths, edge cases, error handling, null/undefined inputs.
4. If the code imports other local files, assume their paths relative to the current file.
5. Mock external modules or API calls where appropriate.
6. Return ONLY the code inside a typescript markdown codeblock (i.e. between \`\`\`typescript and \`\`\`). Do not add any conversational text or comments outside the codeblock.`;

    const prompt = `Generate a Jest unit test suite for the file "${filePath}" with the following source content:\n\n${fileContent}`;

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: systemPrompt,
      });

      const text = result.response.text();
      // Extract code inside typescript fenced block if present
      const codeBlockMatch = text.match(/```typescript([\s\S]*?)```/);
      if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
      }
      return text.trim();
    } catch (error: any) {
      throw new Error(`AI Test Generation failed: ${error.message}`);
    }
  }
}
