/// <reference types="jest" />
import { AIService } from '../../src/services/aiService';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the SDK
jest.mock('@google/generative-ai');

describe('AIService', () => {
  let aiService: AIService;
  let mockGenAIInstance: any;
  let mockModelInstance: any;

  beforeEach(() => {
    mockModelInstance = {
      generateContent: jest.fn(),
    };
    mockGenAIInstance = {
      getGenerativeModel: jest.fn().mockReturnValue(mockModelInstance),
    };
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => mockGenAIInstance);
    aiService = new AIService('fake-api-key');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('constructor should throw error if API key is empty', () => {
    expect(() => new AIService('')).toThrow('API key is required for AIService');
  });

  test('generateReview should return empty if diff is empty', async () => {
    const result = await aiService.generateReview('');
    expect(result).toEqual({ feedbacks: [], summary: 'No staged changes detected to review.' });
    expect(mockGenAIInstance.getGenerativeModel).not.toHaveBeenCalled();
  });

  test('generateReview should call generateContent and parse JSON output', async () => {
    const fakeReviewResult = {
      feedbacks: [
        {
          filePath: 'src/index.ts',
          line: 10,
          severity: 'error',
          suggestion: 'Fix typo',
          rationale: 'It causes crash'
        }
      ],
      summary: 'Overall good'
    };

    mockModelInstance.generateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(fakeReviewResult)
      }
    });

    const result = await aiService.generateReview('some-diff');
    expect(result).toEqual(fakeReviewResult);
    expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-1.5-flash',
        generationConfig: expect.objectContaining({
          responseMimeType: 'application/json'
        })
      })
    );
  });

  test('generateReview should throw error if generateContent fails', async () => {
    mockModelInstance.generateContent.mockRejectedValue(new Error('API quota exceeded'));
    await expect(aiService.generateReview('some-diff')).rejects.toThrow('AI Code Review failed: API quota exceeded');
  });

  test('generateTestFile should return extracted code block from generateContent', async () => {
    const fakeSource = 'export const add = (a: number, b: number) => a + b;';
    const fakeTestCode = `
import { add } from './add';
test('add', () => {
  expect(add(1, 2)).toBe(3);
});
`;
    const fakeResponse = `Here is your test file:
\`\`\`typescript${fakeTestCode}\`\`\`
I hope this helps!`;

    mockModelInstance.generateContent.mockResolvedValue({
      response: {
        text: () => fakeResponse
      }
    });

    const result = await aiService.generateTestFile('src/add.ts', fakeSource);
    expect(result).toBe(fakeTestCode.trim());
    expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-1.5-flash' });
  });

  test('generateTestFile should throw error if fileContent is empty', async () => {
    await expect(aiService.generateTestFile('src/add.ts', '')).rejects.toThrow('File src/add.ts is empty. Cannot generate unit tests.');
  });
});
