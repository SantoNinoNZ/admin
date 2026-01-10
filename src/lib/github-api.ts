// GitHub API service for managing static markdown posts

const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';
const GITHUB_OWNER = 'SantoNinoNZ';
const GITHUB_REPO = 'santoninonz.github.io';
const POSTS_PATH = 'public/posts';

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
}

interface GitHubFileContent {
  content: string;
  sha: string;
  encoding: string;
}

export class GitHubAPI {
  private static async fetchGitHub(endpoint: string, options: RequestInit = {}) {
    const url = `https://api.github.com${endpoint}`;
    console.log('GitHub API Request:', url);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('GitHub API Error:', { url, status: response.status, error });
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * List all markdown files in the posts directory
   */
  static async listPostFiles(): Promise<GitHubFile[]> {
    try {
      const files = await this.fetchGitHub(
        `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_PATH}`
      );

      // Filter only .md files
      return files.filter((file: GitHubFile) =>
        file.type === 'file' && file.name.endsWith('.md')
      );
    } catch (error) {
      console.error('Error listing post files:', error);
      throw error;
    }
  }

  /**
   * Get content of a specific markdown file
   */
  static async getFileContent(fileName: string): Promise<{ content: string; sha: string }> {
    try {
      const data: GitHubFileContent = await this.fetchGitHub(
        `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_PATH}/${fileName}`
      );

      // Decode base64 content
      const content = atob(data.content);

      return {
        content,
        sha: data.sha,
      };
    } catch (error) {
      console.error(`Error getting file content for ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Update a markdown file
   */
  static async updateFile(
    fileName: string,
    content: string,
    sha: string,
    commitMessage: string
  ): Promise<void> {
    try {
      // Encode content to base64
      const encodedContent = btoa(unescape(encodeURIComponent(content)));

      await this.fetchGitHub(
        `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_PATH}/${fileName}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            message: commitMessage,
            content: encodedContent,
            sha: sha,
            branch: 'main',
          }),
        }
      );
    } catch (error) {
      console.error(`Error updating file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a markdown file
   */
  static async deleteFile(
    fileName: string,
    sha: string,
    commitMessage: string
  ): Promise<void> {
    try {
      await this.fetchGitHub(
        `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_PATH}/${fileName}`,
        {
          method: 'DELETE',
          body: JSON.stringify({
            message: commitMessage,
            sha: sha,
            branch: 'main',
          }),
        }
      );
    } catch (error) {
      console.error(`Error deleting file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Check if GitHub token is configured
   */
  static isConfigured(): boolean {
    return !!GITHUB_TOKEN;
  }
}
