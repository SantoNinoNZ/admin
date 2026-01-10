import yaml from 'js-yaml';

interface MarkdownFrontmatter {
  title?: string;
  date?: string;
  slug?: string;
  imageUrl?: string;
  excerpt?: string;
  [key: string]: any;
}

interface ParsedMarkdown {
  frontmatter: MarkdownFrontmatter;
  content: string;
}

/**
 * Parse markdown file with YAML frontmatter
 */
export function parseMarkdown(markdown: string): ParsedMarkdown {
  // Match frontmatter between --- delimiters
  const frontMatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontMatterMatch) {
    // No frontmatter found, return entire content
    return {
      frontmatter: {},
      content: markdown,
    };
  }

  const [, frontMatterYaml, content] = frontMatterMatch;

  try {
    const frontmatter = yaml.load(frontMatterYaml) as MarkdownFrontmatter;
    return {
      frontmatter,
      content: content.trim(),
    };
  } catch (error) {
    console.error('Error parsing frontmatter:', error);
    return {
      frontmatter: {},
      content: markdown,
    };
  }
}

/**
 * Serialize frontmatter and content back to markdown
 */
export function serializeMarkdown(
  frontmatter: MarkdownFrontmatter,
  content: string
): string {
  const frontmatterYaml = yaml.dump(frontmatter, {
    lineWidth: -1, // Don't wrap lines
    noRefs: true,
  });

  return `---\n${frontmatterYaml}---\n\n${content}`;
}

/**
 * Extract slug from filename (remove .md extension)
 */
export function getSlugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

/**
 * Convert slug to filename (add .md extension)
 */
export function getFilenameFromSlug(slug: string): string {
  return `${slug}.md`;
}
