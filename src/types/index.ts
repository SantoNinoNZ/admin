import { Database } from './database.types'

// ============================================================================
// Supabase Type Aliases
// ============================================================================

export type Author = Database['public']['Tables']['authors']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type PostWithDetails = Database['public']['Views']['posts_with_details']['Row']

// Insert types for forms
export type PostInsert = Database['public']['Tables']['posts']['Insert']
export type PostUpdate = Database['public']['Tables']['posts']['Update']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type TagInsert = Database['public']['Tables']['tags']['Insert']

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Extended Post type for UI forms
 * Compatible with PostEditor component
 */
export interface PostFormData {
  id?: string
  slug: string
  title: string
  excerpt?: string
  content: string
  imageUrl?: string
  published?: boolean
  publishedAt?: string
  categoryId?: string
  tagIds?: string[]
  // SEO
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string[]
  ogImage?: string
  // Source tracking
  source?: 'database' | 'static'
  // For static files only
  fileName?: string
  fileSha?: string
}

/**
 * Static post from markdown file
 * Used for listing static posts alongside database posts
 */
export interface StaticPost {
  id: string // Use filename as ID
  slug: string
  title: string
  excerpt?: string
  content: string
  image_url?: string
  published: boolean
  published_at?: string
  created_at: string
  updated_at: string
  // Static file specific
  source: 'static'
  fileName: string
  fileSha: string
  // These will be null for static posts
  author_id: null
  author_name: null
  author_avatar_url: null
  category_id: null
  category_name: null
  tags: null
  meta_description: null
  meta_keywords: null
  meta_title: null
  og_image: null
}

/**
 * Union type for posts from both sources
 */
export type UnifiedPost = PostWithDetails | StaticPost

// ============================================================================
// Re-export database types for convenience
// ============================================================================

export type { Database }

export interface User {
  id: string;
  email?: string;
  last_sign_in_at?: string;
  created_at: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
  is_admin?: boolean;
  invited_by?: string;
}

export interface Invite {
  id: string;
  email: string;
  token: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  used_at?: string;
  used_by?: string;
}
