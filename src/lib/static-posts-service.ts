import { GitHubAPI } from './github-api';
import { parseMarkdown, serializeMarkdown, getSlugFromFilename, getFilenameFromSlug } from './markdown-parser';
import type { StaticPost, PostFormData } from '@/types';

export class StaticPostsService {
  /**
   * Fetch all static posts from GitHub
   * @param limit - Optional limit on number of posts to fetch (default: 50 for performance)
   */
  static async getAllStaticPosts(limit: number = 50): Promise<StaticPost[]> {
    if (!GitHubAPI.isConfigured()) {
      console.warn('GitHub token not configured, skipping static posts');
      return [];
    }

    try {
      console.log('Fetching static posts from GitHub...');
      const files = await GitHubAPI.listPostFiles();
      console.log(`Found ${files.length} markdown files, fetching ${Math.min(limit, files.length)}...`);

      // Limit the number of files to fetch for better performance
      const filesToFetch = files.slice(0, limit);
      const posts: StaticPost[] = [];

      // Fetch content for each file (in parallel with limit)
      const batchSize = 5;
      for (let i = 0; i < filesToFetch.length; i += batchSize) {
        const batch = filesToFetch.slice(i, i + batchSize);
        const batchPosts = await Promise.all(
          batch.map(async (file) => {
            try {
              const { content, sha } = await GitHubAPI.getFileContent(file.name);
              const { frontmatter, content: markdownContent } = parseMarkdown(content);

              const slug = frontmatter.slug || getSlugFromFilename(file.name);

              const post: StaticPost = {
                id: `static-${slug}`,
                slug,
                title: frontmatter.title || slug,
                excerpt: frontmatter.excerpt,
                content: markdownContent,
                image_url: frontmatter.imageUrl,
                published: true, // Static posts are always published
                published_at: frontmatter.date || undefined,
                created_at: frontmatter.date || new Date().toISOString(),
                updated_at: frontmatter.date || new Date().toISOString(),
                source: 'static',
                fileName: file.name,
                fileSha: sha,
                // Nulls for database-only fields
                author_id: null,
                author_name: null,
                author_avatar_url: null,
                category_id: null,
                category_name: null,
                tags: null,
                meta_description: null,
                meta_keywords: null,
                meta_title: null,
                og_image: null,
              };

              return post;
            } catch (error) {
              console.error(`Error fetching content for ${file.name}:`, error);
              return null;
            }
          })
        );

        posts.push(...batchPosts.filter((p): p is StaticPost => p !== null));
      }

      return posts;
    } catch (error) {
      console.error('Error fetching static posts from GitHub:', error);
      if (error instanceof Error && error.message.includes('404')) {
        console.warn('GitHub repository or path not found. Please verify:');
        console.warn('1. Repository exists: SantoNinoNZ/santoninonz.github.io');
        console.warn('2. Path exists: public/posts');
        console.warn('3. GitHub token has access to this repository');
      }
      return [];
    }
  }

  /**
   * Update a static post (commit to GitHub)
   */
  static async updateStaticPost(
    fileName: string,
    fileSha: string,
    postData: PostFormData
  ): Promise<void> {
    if (!GitHubAPI.isConfigured()) {
      throw new Error('GitHub token not configured');
    }

    // Build frontmatter
    const frontmatter: any = {
      title: postData.title,
      date: postData.publishedAt || new Date().toISOString(),
      slug: postData.slug,
    };

    if (postData.imageUrl) {
      frontmatter.imageUrl = postData.imageUrl;
    }

    if (postData.excerpt) {
      frontmatter.excerpt = postData.excerpt;
    }

    // Serialize to markdown
    const markdown = serializeMarkdown(frontmatter, postData.content);

    // Create commit message
    const commitMessage = `chore: update post "${postData.title}"

Updated from admin site

Co-Authored-By: Santo Niño Admin <noreply@santonino-nz.org>`;

    // Commit to GitHub
    await GitHubAPI.updateFile(fileName, markdown, fileSha, commitMessage);
  }

  /**
   * Delete a static post (commit to GitHub)
   */
  static async deleteStaticPost(
    fileName: string,
    fileSha: string,
    title: string
  ): Promise<void> {
    if (!GitHubAPI.isConfigured()) {
      throw new Error('GitHub token not configured');
    }

    // Create commit message
    const commitMessage = `chore: delete post "${title}"

Deleted from admin site

Co-Authored-By: Santo Niño Admin <noreply@santonino-nz.org>`;

    // Delete from GitHub
    await GitHubAPI.deleteFile(fileName, fileSha, commitMessage);
  }
}
