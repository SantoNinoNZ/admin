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
}

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
}
