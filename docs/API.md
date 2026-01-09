# GitHub API Integration Documentation

## Overview

The Santo Niño Admin Interface integrates directly with the GitHub REST API v3 to manage content in the `santoninonz.github.io` repository. This document details the API integration, authentication, and all endpoints used.

## Authentication

### Personal Access Token (PAT)
The admin interface uses GitHub Personal Access Tokens for authentication.

#### Required Scopes
- **repo**: Full control of private repositories (includes public repositories)

#### Token Security
- **Storage**: Browser localStorage only (client-side)
- **Transmission**: HTTPS headers only
- **Expiration**: Follows GitHub token expiration settings
- **Revocation**: Can be revoked in GitHub settings

#### Token Validation
```typescript
// Validate token on authentication
async validateToken(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error('Invalid token');
  }

  return response.json();
}
```

## API Client Architecture

### Base Configuration
```typescript
class GitHubAPI {
  private static readonly API_BASE = 'https://api.github.com';
  private static readonly REPO_OWNER = 'SantoNinoNZ';
  private static readonly REPO_NAME = 'santoninonz.github.io';
  private static readonly POSTS_PATH = 'public/posts';

  constructor(private token: string) {}
}
```

### Request Wrapper
```typescript
private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${GitHubAPI.API_BASE}${endpoint}`;

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
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}
```

## API Endpoints

### 1. User Information

#### Get Authenticated User
- **Endpoint**: `GET /user`
- **Purpose**: Get current user information and validate token
- **Response**: User profile data

```typescript
async getUser(): Promise<GitHubUser> {
  return this.request('/user');
}
```

**Response Example:**
```json
{
  "login": "username",
  "id": 12345,
  "avatar_url": "https://avatars.githubusercontent.com/u/12345",
  "name": "User Name",
  "email": "user@example.com"
}
```

### 2. File Operations

#### List Files in Directory
- **Endpoint**: `GET /repos/{owner}/{repo}/contents/{path}`
- **Purpose**: Get list of markdown files in posts directory
- **Parameters**:
  - `path`: Directory path (`public/posts`)

```typescript
async getPostFiles(): Promise<GitHubFile[]> {
  const files = await this.request(
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_PATH}`
  );

  return files.filter((file: GitHubFile) =>
    file.type === 'file' && file.name.endsWith('.md')
  );
}
```

**Response Example:**
```json
[
  {
    "name": "my-post.md",
    "path": "public/posts/my-post.md",
    "sha": "3d21ec53a331a6f037a91c368710b99387d012c1",
    "size": 2048,
    "url": "https://api.github.com/repos/SantoNinoNZ/santoninonz.github.io/contents/public/posts/my-post.md",
    "html_url": "https://github.com/SantoNinoNZ/santoninonz.github.io/blob/main/public/posts/my-post.md",
    "download_url": "https://raw.githubusercontent.com/SantoNinoNZ/santoninonz.github.io/main/public/posts/my-post.md",
    "type": "file"
  }
]
```

#### Get File Content
- **Endpoint**: `GET /repos/{owner}/{repo}/contents/{path}`
- **Purpose**: Download and decode file content
- **Response**: File metadata and base64-encoded content

```typescript
async getPostContent(filename: string): Promise<Post> {
  const response = await this.request(
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_PATH}/${filename}`
  );

  // Decode base64 content
  const content = Base64.decode(response.content);

  // Parse frontmatter and content
  return this.parseMarkdownContent(content, filename, response.sha);
}
```

#### Create/Update File
- **Endpoint**: `PUT /repos/{owner}/{repo}/contents/{path}`
- **Purpose**: Create new file or update existing file
- **Request Body**: File content (base64-encoded) and commit message

```typescript
async savePost(post: Post, isNew: boolean = false): Promise<GitHubCommitResponse> {
  const filename = `${post.slug}.md`;
  const content = this.createMarkdownContent(post);
  const encodedContent = Base64.encode(content);

  const requestBody = {
    message: isNew ? `Add new post: ${post.title}` : `Update post: ${post.title}`,
    content: encodedContent,
    ...(post.sha && !isNew ? { sha: post.sha } : {})
  };

  return this.request(
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_PATH}/${filename}`,
    {
      method: 'PUT',
      body: JSON.stringify(requestBody)
    }
  );
}
```

**Request Body Example:**
```json
{
  "message": "Add new post: My Amazing Post",
  "content": "LS0tCnRpdGxlOiAiTXkgQW1hemluZyBQb3N0IgpkYXRlOiAiMjAyNC0wMS0xNSIKZXhjZXJwdDogIkEgYnJpZWYgZGVzY3JpcHRpb24iCmltYWdlVXJsOiAiL3Bvc3RzL2Fzc2V0cy9pbWFnZXMvaW1hZ2UuanBnIgotLS0KCiMgTXkgQW1hemluZyBQb3N0CgpUaGlzIGlzIHRoZSBjb250ZW50IG9mIG15IGFtYXppbmcgcG9zdC4="
}
```

#### Delete File
- **Endpoint**: `DELETE /repos/{owner}/{repo}/contents/{path}`
- **Purpose**: Delete a file from the repository
- **Required**: File SHA for verification

```typescript
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
```

### 3. Image Upload

#### Upload Image File
- **Endpoint**: `PUT /repos/{owner}/{repo}/contents/{path}`
- **Purpose**: Upload image file to assets directory
- **Process**: Convert file to base64 and upload

```typescript
async uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const base64Content = (reader.result as string).split(',')[1];
        const filename = `${Date.now()}-${file.name}`;
        const path = `public/posts/assets/images/${filename}`;

        await this.request(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
          method: 'PUT',
          body: JSON.stringify({
            message: `Upload image: ${filename}`,
            content: base64Content
          })
        });

        resolve(`/posts/assets/images/${filename}`);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
```

## Rate Limiting

### GitHub API Limits
- **Authenticated requests**: 5,000 per hour per token
- **Rate limit headers**: Included in every response
- **Reset time**: Provided in response headers

### Rate Limit Monitoring
```typescript
private handleRateLimit(response: Response): void {
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const resetTime = response.headers.get('X-RateLimit-Reset');

  if (remaining && parseInt(remaining) < 100) {
    console.warn(`Low rate limit: ${remaining} requests remaining`);
  }

  if (response.status === 403 && remaining === '0') {
    const resetDate = new Date(parseInt(resetTime!) * 1000);
    throw new Error(`Rate limit exceeded. Resets at ${resetDate.toLocaleString()}`);
  }
}
```

### Rate Limit Best Practices
1. **Cache responses**: Store file listings in component state
2. **Batch operations**: Combine multiple file operations when possible
3. **Monitor usage**: Track remaining requests
4. **Retry logic**: Implement exponential backoff for 403 errors

## Content Processing

### Markdown File Structure
```markdown
---
title: "Post Title"
date: "2024-01-15"
excerpt: "Brief description"
imageUrl: "/posts/assets/images/image.jpg"
---

# Post Content

This is the markdown content of the post.
```

### Frontmatter Parsing
```typescript
private parseMarkdownContent(content: string, filename: string, sha: string): Post {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    // No frontmatter, treat entire content as markdown
    return {
      slug: filename.replace('.md', ''),
      title: filename.replace('.md', '').replace(/-/g, ' '),
      date: '',
      content: content,
      sha
    };
  }

  const [, frontmatter, markdownContent] = frontmatterMatch;
  const metadata = this.parseFrontmatter(frontmatter);

  return {
    slug: filename.replace('.md', ''),
    title: metadata.title || filename.replace('.md', ''),
    date: metadata.date || '',
    excerpt: metadata.excerpt || '',
    imageUrl: metadata.imageUrl || '',
    content: markdownContent.trim(),
    sha
  };
}
```

### Frontmatter Generation
```typescript
private createMarkdownContent(post: Post): string {
  const frontmatter = this.createFrontmatter(post);
  return `---\n${frontmatter}\n---\n\n${post.content}`;
}

private createFrontmatter(post: Post): string {
  const parts = [];
  if (post.title) parts.push(`title: "${post.title}"`);
  if (post.date) parts.push(`date: "${post.date}"`);
  if (post.excerpt) parts.push(`excerpt: "${post.excerpt}"`);
  if (post.imageUrl) parts.push(`imageUrl: "${post.imageUrl}"`);
  return parts.join('\n');
}
```

## Error Handling

### API Error Types
1. **Authentication Errors (401)**: Invalid or expired token
2. **Permission Errors (403)**: Insufficient repository access or rate limit
3. **Not Found Errors (404)**: File or repository doesn't exist
4. **Validation Errors (422)**: Invalid request data

### Error Handling Strategy
```typescript
private async handleApiError(response: Response): Promise<never> {
  const errorText = await response.text();

  switch (response.status) {
    case 401:
      throw new Error('Authentication failed. Please check your GitHub token.');
    case 403:
      if (response.headers.get('X-RateLimit-Remaining') === '0') {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
      }
      throw new Error('Permission denied. Ensure your token has repository access.');
    case 404:
      throw new Error('File or repository not found.');
    case 422:
      throw new Error(`Validation error: ${errorText}`);
    default:
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
  }
}
```

## Testing the API Integration

### Manual API Testing
```typescript
// Test basic connectivity
const testConnection = async (token: string) => {
  try {
    const api = new GitHubAPI(token);
    const user = await api.getUser();
    console.log('Connected as:', user.login);

    const files = await api.getPostFiles();
    console.log('Found posts:', files.length);

    return true;
  } catch (error) {
    console.error('Connection failed:', error.message);
    return false;
  }
};
```

### API Response Validation
```typescript
// Validate file structure
const validateFileStructure = (files: GitHubFile[]) => {
  return files.every(file =>
    file.name &&
    file.path &&
    file.sha &&
    file.type === 'file' &&
    file.name.endsWith('.md')
  );
};
```

## Security Considerations

### Token Security
- **Never log tokens**: Ensure tokens don't appear in console or logs
- **HTTPS only**: All API communication must be encrypted
- **Client-side storage**: Tokens stored only in browser localStorage
- **Token rotation**: Encourage regular token updates

### API Security
- **Validate responses**: Check response structure before processing
- **Sanitize content**: Clean user input before sending to API
- **Error messages**: Don't expose sensitive information in error messages

### Content Security
- **File validation**: Verify file types and sizes before upload
- **Path validation**: Ensure file paths are within allowed directories
- **Content filtering**: Validate markdown content for security issues

This API documentation provides a comprehensive guide for understanding and maintaining the GitHub API integration in the Santo Niño Admin Interface.