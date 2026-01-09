'use client'

import { Post } from '@/types'
import { Edit, Trash2, Calendar, FileText } from 'lucide-react'

interface PostListProps {
  posts: Post[];
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
}

export function PostList({ posts, onEdit, onDelete }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-12 text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-lora text-white mb-2">No posts found</h3>
        <p className="text-gray-300">Create your first post to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-lora font-bold text-white">
          Posts ({posts.length})
        </h2>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => (
          <div
            key={post.slug}
            className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/15 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-lora font-semibold text-white mb-2 truncate">
                  {post.title || post.slug}
                </h3>

                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center text-gray-300 text-sm">
                    <Calendar className="w-4 h-4 mr-1" />
                    {post.date ? new Date(post.date).toLocaleDateString() : 'No date'}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {post.slug}.md
                  </div>
                </div>

                {post.excerpt && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}

                {post.imageUrl && (
                  <div className="text-xs text-gray-400 mb-3">
                    📷 Has featured image
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  Content: {post.content.length} characters
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onEdit(post)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  title="Edit post"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(post)}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  title="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}