/// <reference types="jest" />
import { GitService } from '../../src/services/gitService';
import simpleGit from 'simple-git';

// Mock simple-git module
jest.mock('simple-git');

describe('GitService', () => {
  let gitService: GitService;
  let mockGitInstance: any;

  beforeEach(() => {
    mockGitInstance = {
      checkIsRepo: jest.fn(),
      diff: jest.fn(),
      show: jest.fn(),
    };
    (simpleGit as jest.Mock).mockReturnValue(mockGitInstance);
    gitService = new GitService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('isGitRepo should return true if checkIsRepo resolves to true', async () => {
    mockGitInstance.checkIsRepo.mockResolvedValue(true);
    const result = await gitService.isGitRepo();
    expect(result).toBe(true);
    expect(mockGitInstance.checkIsRepo).toHaveBeenCalledTimes(1);
  });

  test('isGitRepo should return false if checkIsRepo resolves to false', async () => {
    mockGitInstance.checkIsRepo.mockResolvedValue(false);
    const result = await gitService.isGitRepo();
    expect(result).toBe(false);
  });

  test('isGitRepo should return false if checkIsRepo rejects', async () => {
    mockGitInstance.checkIsRepo.mockRejectedValue(new Error('Git error'));
    const result = await gitService.isGitRepo();
    expect(result).toBe(false);
  });

  test('getStagedDiff should return the diff output', async () => {
    const fakeDiff = 'diff --git a/file.txt b/file.txt\n+hello';
    mockGitInstance.diff.mockResolvedValue(fakeDiff);

    const result = await gitService.getStagedDiff();
    expect(result).toBe(fakeDiff);
    expect(mockGitInstance.diff).toHaveBeenCalledWith(['--cached']);
  });

  test('getStagedDiff should throw error on failure', async () => {
    mockGitInstance.diff.mockRejectedValue(new Error('no repo'));
    await expect(gitService.getStagedDiff()).rejects.toThrow('Failed to retrieve staged diff: no repo');
  });

  test('getStagedFiles should return structured files array', async () => {
    mockGitInstance.diff.mockResolvedValue('file1.ts\nfile2.ts\n\n');
    const result = await gitService.getStagedFiles();
    expect(result).toEqual(['file1.ts', 'file2.ts']);
    expect(mockGitInstance.diff).toHaveBeenCalledWith(['--cached', '--name-only']);
  });

  test('getStagedFileContent should call git show with staged file syntax', async () => {
    mockGitInstance.show.mockResolvedValue('console.log("hello");');
    const result = await gitService.getStagedFileContent('src/index.ts');
    expect(result).toBe('console.log("hello");');
    expect(mockGitInstance.show).toHaveBeenCalledWith([':src/index.ts']);
  });
});
