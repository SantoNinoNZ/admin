export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      authors: {
        Row: {
          avatar_url: string | null
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          id: string
          name: string
        }
        Update: {
          avatar_url?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "authors_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          og_image: string | null
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          og_image?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          og_image?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      posts_with_details: {
        Row: {
          author_avatar_url: string | null
          author_id: string | null
          author_name: string | null
          category_id: string | null
          category_name: string | null
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          og_image: string | null
          published: boolean
          published_at: string | null
          slug: string
          tags: Json | null
          title: string
          updated_at: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}