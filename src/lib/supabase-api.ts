/**
 * Supabase API Client for CMS Operations
 *
 * This replaces the GitHub API client (github-api.ts)
 * Provides CRUD operations for posts, categories, tags, and storage
 */

import { supabase } from './supabase'
import type { Post, PostWithDetails, PostInsert, PostUpdate, Category, Tag, User } from '@/types'

export class SupabaseAPI {

  // ============================================================================
  // USERS
  // ============================================================================

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('get-users', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    if (data.error) {
      throw new Error(`Failed to fetch users: ${data.error}`)
    }

    return data.users || []
  }

  /**
   * Check if current user is authorized admin
   */
  async isAuthorizedAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    // @ts-ignore - RPC function defined in migration
    const { data, error } = await supabase.rpc('is_authorized_admin', {
      user_id: user.id
    });

    if (error) {
      console.error('Error checking admin authorization:', error);
      return false;
    }

    return data === true;
  }

  /**
   * Create an invite link
   */
  async createInvite(email: string, expiresInDays: number = 7): Promise<{ token: string; expiresAt: string }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate token
    // @ts-ignore - RPC function defined in migration
    const { data: tokenData, error: tokenError } = await supabase.rpc('generate_invite_token');

    if (tokenError) {
      throw new Error(`Failed to generate token: ${tokenError.message}`);
    }

    const token = tokenData as string;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invite
    const { data, error } = await supabase
      .from('invites')
      .insert({
        email,
        token,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create invite: ${error.message}`);
    }

    return {
      token: data.token,
      expiresAt: data.expires_at,
    };
  }

  /**
   * Get all invites
   */
  async getInvites(): Promise<any[]> {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch invites: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Validate and consume an invite token
   */
  async consumeInvite(token: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // @ts-ignore - RPC function defined in migration
    const { data, error } = await supabase.rpc('consume_invite', {
      invite_token: token,
      user_id: user.id
    });

    if (error) {
      throw new Error(`Failed to consume invite: ${error.message}`);
    }

    return data === true;
  }

  /**
   * Validate an invite token (without consuming)
   */
  async validateInvite(token: string): Promise<{ valid: boolean; email?: string }> {
    const { data, error } = await supabase
      .from('invites')
      .select('email, expires_at, used_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      return { valid: false };
    }

    const isValid = !data.used_at && new Date(data.expires_at) > new Date();

    return {
      valid: isValid,
      email: isValid ? data.email : undefined,
    };
  }

  // ============================================================================
  // POSTS
  // ============================================================================

  /**
   * Get all posts with optional filters
   */
  async getPosts(options?: {
    published?: boolean
    limit?: number
    offset?: number
    orderBy?: 'created_at' | 'updated_at' | 'published_at'
    orderDirection?: 'asc' | 'desc'
  }): Promise<PostWithDetails[]> {
    let query = supabase
      .from('posts_with_details')
      .select('*')

    if (options?.published !== undefined) {
      query = query.eq('published', options.published)
    }

    const orderBy = options?.orderBy || 'updated_at'
    const orderDirection = options?.orderDirection || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get a single post by slug
   */
  async getPostBySlug(slug: string): Promise<PostWithDetails | null> {
    const { data, error } = await supabase
      .from('posts_with_details')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null
      }
      throw new Error(`Failed to fetch post: ${error.message}`)
    }

    return data
  }

  /**
   * Get a single post by ID
   */
  async getPostById(id: string): Promise<PostWithDetails | null> {
    const { data, error } = await supabase
      .from('posts_with_details')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch post: ${error.message}`)
    }

    return data
  }

  /**
   * Create a new post
   */
  async createPost(post: PostInsert, tagIds?: string[]): Promise<Post> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    // Ensure author record exists (in case trigger didn't fire)
    await this.ensureAuthorExists(user)

    const postData: PostInsert = {
      ...post,
      author_id: user.id,
      published_at: post.published ? new Date().toISOString() : null
    }

    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`)
    }

    // Add tags if provided
    if (tagIds && tagIds.length > 0) {
      await this.setPostTags(data.id, tagIds)
    }

    return data
  }

  /**
   * Ensure author record exists for a user
   * Creates one if it doesn't exist using RPC to bypass RLS
   */
  private async ensureAuthorExists(user: any): Promise<void> {
    // Check if author exists
    const { data: existingAuthor } = await supabase
      .from('authors')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!existingAuthor) {
      // Try to create author record
      // Note: Using 'any' type cast because database.types.ts is outdated
      // TODO: Regenerate types with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
      const { error } = await supabase
        .from('authors')
        .insert({
          id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User',
          avatar_url: user.user_metadata?.avatar_url || null,
        } as any)

      // If insert fails due to RLS or duplicate, that's okay
      // The post will still be created with author_id, and trigger will handle it later
      if (error && error.code !== '23505' && error.code !== '42501') {
        console.warn('Could not create author record:', error.message)
      }
    }
  }

  /**
   * Update an existing post
   */
  async updatePost(id: string, updates: PostUpdate, tagIds?: string[]): Promise<Post> {
    const updateData: PostUpdate = {
      ...updates,
      // Set published_at when publishing
      published_at: updates.published && !updates.published_at
        ? new Date().toISOString()
        : updates.published_at
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`)
    }

    // Update tags if provided
    if (tagIds !== undefined) {
      await this.setPostTags(id, tagIds)
    }

    return data
  }

  /**
   * Delete a post
   */
  async deletePost(id: string): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete post: ${error.message}`)
    }
  }

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }

    return data || []
  }

  /**
   * Create a category
   */
  async createCategory(name: string, slug: string, description?: string, color?: string): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, slug, description, color })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`)
    }

    return data
  }

  // ============================================================================
  // TAGS
  // ============================================================================

  /**
   * Get all tags
   */
  async getTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch tags: ${error.message}`)
    }

    return data || []
  }

  /**
   * Create a tag
   */
  async createTag(name: string, slug: string): Promise<Tag> {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, slug })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create tag: ${error.message}`)
    }

    return data
  }

  /**
   * Set tags for a post (replaces existing)
   */
  async setPostTags(postId: string, tagIds: string[]): Promise<void> {
    // Delete existing tags
    const { error: deleteError } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId)

    if (deleteError) {
      throw new Error(`Failed to clear post tags: ${deleteError.message}`)
    }

    // Insert new tags
    if (tagIds.length > 0) {
      const postTags = tagIds.map(tagId => ({ post_id: postId, tag_id: tagId }))
      const { error: insertError } = await supabase
        .from('post_tags')
        .insert(postTags)

      if (insertError) {
        throw new Error(`Failed to set post tags: ${insertError.message}`)
      }
    }
  }

  // ============================================================================
  // STORAGE
  // ============================================================================

  /**
   * Upload an image to Supabase Storage
   */
  async uploadImage(file: File, folder: 'images' | 'featured' | 'assets' = 'images'): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    const { data, error } = await supabase.storage
      .from('post-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(data.path)

    return publicUrl
  }

  /**
   * Delete an image from storage
   */
  async deleteImage(url: string): Promise<void> {
    // Extract path from URL
    const path = url.split('/post-media/').pop()
    if (!path) {
      throw new Error('Invalid image URL')
    }

    const { error } = await supabase.storage
      .from('post-media')
      .remove([path])

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`)
    }
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  /**
   * Generate a URL-friendly slug from a title
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  /**
   * Check if slug is unique
   */
  async isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('posts')
      .select('id')
      .eq('slug', slug)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to check slug: ${error.message}`)
    }

    return data.length === 0
  }
}

// Export singleton instance
export const supabaseAPI = new SupabaseAPI()
