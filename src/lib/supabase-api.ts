/**
 * Supabase API Client for CMS Operations
 *
 * This replaces the GitHub API client (github-api.ts)
 * Provides CRUD operations for posts, categories, tags, and storage
 */

import { supabase } from './supabase'
import type { Post, PostWithDetails, PostInsert, PostUpdate, Category, Tag, User } from '@/types'
import type {
  Event,
  CreateEventDTO,
  UpdateEventDTO,
  EventDay,
  EventSuspension,
  RecurringEvent,
  DatedEvent,
  isRecurringEvent,
  isDatedEvent
} from '@/types/events'

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

    try {
      console.log('Invoking get-users edge function...');

      const { data, error } = await supabase.functions.invoke('get-users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: {}  // Explicitly set empty body for POST request
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);

        // More specific error messages
        if (error.message?.includes('Failed to send') || error.message?.includes('CORS')) {
          console.warn('CORS/Network error, falling back to direct database query');
          // Fallback: Query users table directly (limited info)
          return await this.getUsersFromDB();
        }
        if (error.message?.includes('FunctionsRelayError')) {
          throw new Error('Edge function unavailable. Please check Supabase dashboard for function status.')
        }
        throw new Error(`Failed to fetch users: ${error.message}`)
      }

      if (data?.error) {
        console.error('Edge function returned error:', data.error);
        throw new Error(`Failed to fetch users: ${data.error}`)
      }

      console.log(`Successfully retrieved ${data?.users?.length || 0} users`);
      return data?.users || []
    } catch (err) {
      console.error('Exception in getUsers:', err);
      // Fallback to direct query
      console.warn('Attempting fallback to direct database query...');
      return await this.getUsersFromDB();
    }
  }

  /**
   * Fallback: Get users from database directly (limited info)
   * This only shows users who have a record in the users table
   */
  private async getUsersFromDB(): Promise<User[]> {
    try {
      // users table defined in migration 006
      const { data, error } = await supabase
        .from('users' as any)
        .select('*');

      if (error) {
        console.error('Direct DB query failed:', error);
        throw new Error('Unable to fetch users. Please ensure migrations are run.');
      }

      return (data || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        is_admin: user.is_admin,
        invited_by: user.invited_by,
      }));
    } catch (err) {
      console.error('Fallback query failed:', err);
      throw new Error('Unable to fetch users. Edge function and database query both failed.');
    }
  }

  /**
   * Check if current user is authorized admin
   */
  async isAuthorizedAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    // RPC function defined in migration
    // @ts-ignore
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

    // Generate token (RPC function defined in migration)
    // @ts-ignore
    const { data: tokenData, error: tokenError } = await supabase.rpc('generate_invite_token');

    if (tokenError) {
      throw new Error(`Failed to generate token: ${tokenError.message}`);
    }

    const token = tokenData as string;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invite (invites table defined in migration)
    const { data, error } = await supabase
      .from('invites' as any)
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
      token: (data as any).token,
      expiresAt: (data as any).expires_at,
    };
  }

  /**
   * Get all invites
   */
  async getInvites(): Promise<any[]> {
    // invites table defined in migration
    const { data, error } = await supabase
      .from('invites' as any)
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

    // RPC function defined in migration
    // @ts-ignore
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
    // invites table defined in migration
    const { data, error } = await supabase
      .from('invites' as any)
      .select('email, expires_at, used_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      return { valid: false };
    }

    const isValid = !(data as any).used_at && new Date((data as any).expires_at) > new Date();

    return {
      valid: isValid,
      email: isValid ? (data as any).email : undefined,
    };
  }

  /**
   * Revoke admin access for a user
   */
  async revokeAdminAccess(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Don't allow users to revoke their own access
    if (user.id === userId) {
      throw new Error('Cannot revoke your own admin access');
    }

    // is_admin field defined in migration
    const { error } = await supabase
      .from('users' as any)
      .update({ is_admin: false })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to revoke admin access: ${error.message}`);
    }
  }

  /**
   * Grant admin access to a user
   */
  async grantAdminAccess(userId: string): Promise<void> {
    // is_admin field defined in migration
    const { error } = await supabase
      .from('users' as any)
      .update({ is_admin: true })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to grant admin access: ${error.message}`);
    }
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
   * Creates one if it doesn't exist, syncing from auth.users
   */
  private async ensureAuthorExists(user: any): Promise<void> {
    // Check if author exists
    // Note: Using 'any' cast because database.types.ts is outdated
    const { data: existingAuthor } = await supabase
      .from('authors')
      .select('id, email, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle() as { data: any }

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null
    const email = user.email || ''

    if (!existingAuthor) {
      // Create new author record
      const { error } = await supabase
        .from('authors')
        .insert({
          id: user.id,
          email: email,
          full_name: fullName,
          avatar_url: avatarUrl,
        } as any)

      if (error && error.code !== '23505') {
        console.warn('Could not create author record:', error.message)
      }
    } else {
      // Update existing author with latest info from auth.users
      const needsUpdate =
        existingAuthor.email !== email ||
        existingAuthor.full_name !== fullName ||
        existingAuthor.avatar_url !== avatarUrl

      if (needsUpdate) {
        await supabase
          .from('authors')
          .update({
            email: email,
            full_name: fullName,
            avatar_url: avatarUrl,
          } as any)
          .eq('id', user.id)
      }
    }
  }

  /**
   * Update an existing post
   */
  async updatePost(id: string, updates: PostUpdate, tagIds?: string[]): Promise<Post> {
    // Get current user and ensure they have an author record
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    // Ensure author record exists for the modifier
    await this.ensureAuthorExists(user)

    const updateData: PostUpdate = {
      ...updates,
      // Set published_at when publishing
      published_at: updates.published && !updates.published_at
        ? new Date().toISOString()
        : updates.published_at
    }

    // Note: last_modified_by is set automatically by the database trigger
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

  // ============================================================================
  // EVENTS
  // ============================================================================

  /**
   * Get all events
   */
  async getEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events_with_details' as any)
      .select('*')
      .order('created_at', { ascending: false }) as any

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`)
    }

    return (data || []) as Event[]
  }

  /**
   * Get a single event by ID
   */
  async getEvent(id: string): Promise<Event> {
    const { data, error } = await supabase
      .from('events_with_details' as any)
      .select('*')
      .eq('id', id)
      .single() as any

    if (error) {
      throw new Error(`Failed to fetch event: ${error.message}`)
    }

    return data as Event
  }

  /**
   * Get a single event by slug
   */
  async getEventBySlug(slug: string): Promise<Event> {
    const { data, error } = await supabase
      .from('events_with_details' as any)
      .select('*')
      .eq('slug', slug)
      .single() as any

    if (error) {
      throw new Error(`Failed to fetch event: ${error.message}`)
    }

    return data as Event
  }

  /**
   * Create a new event
   */
  async createEvent(eventData: CreateEventDTO): Promise<Event> {
    // Get current user and ensure they have an author record
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    await this.ensureAuthorExists(user)

    // Extract days if it's a dated event
    const days = 'days' in eventData ? eventData.days : undefined

    // Create the main event record (without days)
    const { days: _, ...eventWithoutDays } = eventData as any

    const { data: newEvent, error: eventError } = await supabase
      .from('events' as any)
      .insert({
        ...eventWithoutDays,
        created_by: user.id
      })
      .select()
      .single() as any

    if (eventError) {
      throw new Error(`Failed to create event: ${eventError.message}`)
    }

    // If it's a dated event, create the days
    if (days && days.length > 0) {
      const daysToInsert = days.map((day: Omit<EventDay, 'id'>) => ({
        event_id: newEvent.id,
        day_number: day.dayNumber,
        date: day.date,
        choir: day.choir,
        sponsors_pilgrims: day.sponsorsPilgrims,
        area_coordinators: day.areaCoordinators
      }))

      const { error: daysError } = await supabase
        .from('event_days' as any)
        .insert(daysToInsert) as any

      if (daysError) {
        // Rollback: delete the event
        await supabase.from('events' as any).delete().eq('id', newEvent.id)
        throw new Error(`Failed to create event days: ${daysError.message}`)
      }
    }

    // Fetch the complete event with all related data
    return this.getEvent(newEvent.id)
  }

  /**
   * Update an existing event
   */
  async updateEvent(id: string, updates: UpdateEventDTO): Promise<Event> {
    // Get current user and ensure they have an author record
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    await this.ensureAuthorExists(user)

    // Extract days if present
    const days = 'days' in updates ? updates.days : undefined
    const { days: _, id: __, ...eventUpdates } = updates as any

    // Update the main event record
    const { error: eventError } = await supabase
      .from('events' as any)
      .update(eventUpdates)
      .eq('id', id) as any

    if (eventError) {
      throw new Error(`Failed to update event: ${eventError.message}`)
    }

    // If days are provided, replace all existing days
    if (days !== undefined) {
      // Delete existing days
      await supabase
        .from('event_days' as any)
        .delete()
        .eq('event_id', id) as any

      // Insert new days if any
      if (days.length > 0) {
        const daysToInsert = days.map((day: Omit<EventDay, 'id'>) => ({
          event_id: id,
          day_number: day.dayNumber,
          date: day.date,
          choir: day.choir,
          sponsors_pilgrims: day.sponsorsPilgrims,
          area_coordinators: day.areaCoordinators
        }))

        const { error: daysError } = await supabase
          .from('event_days' as any)
          .insert(daysToInsert) as any

        if (daysError) {
          throw new Error(`Failed to update event days: ${daysError.message}`)
        }
      }
    }

    // Fetch the complete event with all related data
    return this.getEvent(id)
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('events' as any)
      .delete()
      .eq('id', id) as any

    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`)
    }
  }

  /**
   * Add a suspension to a recurring event
   */
  async addEventSuspension(
    eventId: string,
    suspension: Omit<EventSuspension, 'id'>
  ): Promise<EventSuspension> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('event_suspensions' as any)
      .insert({
        event_id: eventId,
        start_date: suspension.startDate,
        end_date: suspension.endDate,
        reason: suspension.reason,
        created_by: user.id
      })
      .select()
      .single() as any

    if (error) {
      throw new Error(`Failed to add suspension: ${error.message}`)
    }

    return {
      id: data.id,
      startDate: data.start_date,
      endDate: data.end_date,
      reason: data.reason
    }
  }

  /**
   * Remove a suspension from a recurring event
   */
  async removeEventSuspension(suspensionId: string): Promise<void> {
    const { error } = await supabase
      .from('event_suspensions' as any)
      .delete()
      .eq('id', suspensionId) as any

    if (error) {
      throw new Error(`Failed to remove suspension: ${error.message}`)
    }
  }

  /**
   * Get all suspensions for an event
   */
  async getEventSuspensions(eventId: string): Promise<EventSuspension[]> {
    const { data, error } = await supabase
      .from('event_suspensions' as any)
      .select('*')
      .eq('event_id', eventId)
      .order('start_date', { ascending: true }) as any

    if (error) {
      throw new Error(`Failed to fetch suspensions: ${error.message}`)
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      startDate: s.start_date,
      endDate: s.end_date,
      reason: s.reason
    }))
  }

  /**
   * Check if event slug is unique
   */
  async isEventSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('events' as any)
      .select('id')
      .eq('slug', slug)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query as any

    if (error) {
      throw new Error(`Failed to check event slug: ${error.message}`)
    }

    return data.length === 0
  }

  // ============================================================================
  // SITE BUILD / DEPLOY
  // ============================================================================

  private readonly SUPABASE_URL = 'https://uvxrdmwmscevovbbrnky.supabase.co'

  /**
   * Get the current build status from GitHub Actions
   */
  async getBuildStatus(): Promise<{
    current: {
      id: number
      status: 'queued' | 'in_progress' | 'completed'
      conclusion: 'success' | 'failure' | 'cancelled' | null
      created_at: string
      updated_at: string
      html_url: string
      event: string
    } | null
    lastSuccessful: {
      id: number
      completed_at: string
      html_url: string
    } | null
  }> {
    const response = await fetch(`${this.SUPABASE_URL}/functions/v1/get-build-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get build status: ${errorText}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to get build status')
    }

    return {
      current: data.current,
      lastSuccessful: data.lastSuccessful,
    }
  }

  /**
   * Manually trigger a site rebuild
   */
  async triggerRebuild(): Promise<void> {
    const response = await fetch(`${this.SUPABASE_URL}/functions/v1/trigger-rebuild`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        manual: true,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to trigger rebuild: ${errorText}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to trigger rebuild')
    }
  }
}

// Export singleton instance
export const supabaseAPI = new SupabaseAPI()
