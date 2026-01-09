import { Base64 } from 'js-base64';
import { Post, GitHubFile, GitHubCommitResponse, GitHubUser } from '@/types';

const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'SantoNinoNZ';
const REPO_NAME = 'santoninonz.github.io';
const POSTS_PATH = 'public/posts';

export class GitHubAPI {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${GITHUB_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${error}`);
    }

    return response.json();
  }

  async getUser(): Promise<GitHubUser> {
    return this.request('/user');
  }

  async getPostFiles(): Promise<GitHubFile[]> {
    const files = await this.request(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_PATH}`);
    return files.filter((file: GitHubFile) =>
      file.type === 'file' && file.name.endsWith('.md')
    );
  }

  async getPostContent(filename: string): Promise<Post> {
    const response = await this.request(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_PATH}/${filename}`);
    const content = Base64.decode(response.content);

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\\n([\\s\\S]*?)\\n---\\n([\\s\\S]*)$/);
    let title = filename.replace('.md', '');
    let date = '';
    let excerpt = '';
    let imageUrl = '';
    let markdownContent = content;

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      markdownContent = frontmatterMatch[2];

      // Parse YAML frontmatter (simple parsing)
      const titleMatch = frontmatter.match(/^title:\\s*(.+)$/m);
      const dateMatch = frontmatter.match(/^date:\\s*(.+)$/m);
      const excerptMatch = frontmatter.match(/^excerpt:\\s*(.+)$/m);
      const imageMatch = frontmatter.match(/^imageUrl:\\s*(.+)$/m);

      if (titleMatch) title = titleMatch[1].replace(/["']/g, '');
      if (dateMatch) date = dateMatch[1].replace(/["']/g, '');
      if (excerptMatch) excerpt = excerptMatch[1].replace(/["']/g, '');
      if (imageMatch) imageUrl = imageMatch[1].replace(/["']/g, '');
    }

    return {
      slug: filename.replace('.md', ''),
      title,
      date,
      excerpt,
      imageUrl,
      content: markdownContent,
      sha: response.sha
    };
  }

  async savePost(post: Post, isNew: boolean = false): Promise<GitHubCommitResponse> {
    const filename = `${post.slug}.md`;
    const frontmatter = this.createFrontmatter(post);
    const fullContent = `---\\n${frontmatter}\\n---\\n\\n${post.content}`;
    const encodedContent = Base64.encode(fullContent);

    const commitData = {
      message: isNew ? `Add new post: ${post.title}` : `Update post: ${post.title}`,
      content: encodedContent,
      ...(post.sha && !isNew ? { sha: post.sha } : {})
    };

    return this.request(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_PATH}/${filename}`,
      {
        method: 'PUT',
        body: JSON.stringify(commitData)
      }
    );
  }

  async deletePost(slug: string, sha: string): Promise<void> {
    const filename = `${slug}.md`;

    await this.request(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_PATH}/${filename}`,
      {
        method: 'DELETE',
        body: JSON.stringify({
          message: `Delete post: ${slug}`,
          sha: sha
        })
      }
    );
  }

  async uploadImage(file: File, path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Content = (reader.result as string).split(',')[1];
          const filename = `${Date.now()}-${file.name}`;
          const fullPath = `public/posts/assets/images/${filename}`;

          await this.request(
            `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${fullPath}`,
            {
              method: 'PUT',
              body: JSON.stringify({
                message: `Upload image: ${filename}`,
                content: base64Content
              })
            }
          );

          resolve(`/posts/assets/images/${filename}`);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private createFrontmatter(post: Post): string {
    const parts = [];
    if (post.title) parts.push(`title: "${post.title}"`);
    if (post.date) parts.push(`date: "${post.date}"`);
    if (post.excerpt) parts.push(`excerpt: "${post.excerpt}"`);
    if (post.imageUrl) parts.push(`imageUrl: "${post.imageUrl}"`);
    return parts.join('\\n');
  }
}