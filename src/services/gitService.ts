import simpleGit, { SimpleGit } from 'simple-git';

export class GitService {
  private git: SimpleGit;

  constructor(workingDir: string = process.cwd()) {
    this.git = simpleGit(workingDir);
  }

  /**
   * Checks if the directory is a valid git repository.
   */
  async isGitRepo(): Promise<boolean> {
    try {
      return await this.git.checkIsRepo();
    } catch {
      return false;
    }
  }

  /**
   * Retrieves the current staged git diff.
   */
  async getStagedDiff(): Promise<string> {
    try {
      return await this.git.diff(['--cached']);
    } catch (error: any) {
      throw new Error(`Failed to retrieve staged diff: ${error.message}`);
    }
  }

  /**
   * Retrieves the list of currently staged files.
   */
  async getStagedFiles(): Promise<string[]> {
    try {
      const diffNameOnly = await this.git.diff(['--cached', '--name-only']);
      return diffNameOnly
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
    } catch (error: any) {
      throw new Error(`Failed to retrieve staged files list: ${error.message}`);
    }
  }

  /**
   * Retrieves the content of a specific file as currently staged in the git index.
   */
  async getStagedFileContent(filePath: string): Promise<string> {
    try {
      return await this.git.show([`:${filePath}`]);
    } catch (error: any) {
      throw new Error(`Failed to retrieve staged content for ${filePath}: ${error.message}`);
    }
  }
}
