'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Post } from '@/types'
import { GitHubAPI } from '@/lib/github-api'
import { Save, X, Upload, Calendar, Type, FileText, Image as ImageIcon } from 'lucide-react'

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

interface PostEditorProps {
  post: Post;
  isNew: boolean;
  onSave: (post: Post) => void;
  onCancel: () => void;
  githubAPI: GitHubAPI;
}

export function PostEditor({ post, isNew, onSave, onCancel, githubAPI }: PostEditorProps) {
  const [editedPost, setEditedPost] = useState<Post>(post)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setEditedPost(post)
  }, [post])

  const handleSave = async () => {
    if (!editedPost.title.trim()) {
      setError('Title is required')
      return
    }

    if (!editedPost.slug.trim()) {
      setError('Slug is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      await onSave(editedPost)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setUploading(true)
    setError('')

    try {
      const imageUrl = await githubAPI.uploadImage(file, 'posts/assets/images/')
      setEditedPost(prev => ({ ...prev, imageUrl }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const generateSlugFromTitle = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleTitleChange = (title: string) => {
    const updates: Partial<Post> = { title }

    // Auto-generate slug if it's a new post or slug is empty
    if (isNew || !editedPost.slug) {
      updates.slug = generateSlugFromTitle(title)
    }

    setEditedPost(prev => ({ ...prev, ...updates }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-lora font-bold text-white">
          {isNew ? 'Create New Post' : 'Edit Post'}
        </h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Post Metadata */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
              <Type className="w-4 h-4" />
              <span>Title</span>
            </label>
            <input
              type="text"
              value={editedPost.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter post title"
              className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
              <FileText className="w-4 h-4" />
              <span>Slug</span>
            </label>
            <input
              type="text"
              value={editedPost.slug}
              onChange={(e) => setEditedPost(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="post-slug"
              className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4" />
              <span>Date</span>
            </label>
            <input
              type="date"
              value={editedPost.date}
              onChange={(e) => setEditedPost(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
              <ImageIcon className="w-4 h-4" />
              <span>Featured Image</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={editedPost.imageUrl || ''}
                onChange={(e) => setEditedPost(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="Image URL or upload"
                className="flex-1 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <label className="bg-secondary hover:bg-secondary/90 text-white px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && <p className="text-xs text-gray-400 mt-1">Uploading image...</p>}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Excerpt
          </label>
          <textarea
            value={editedPost.excerpt || ''}
            onChange={(e) => setEditedPost(prev => ({ ...prev, excerpt: e.target.value }))}
            placeholder="Brief description of the post"
            rows={2}
            className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Content Editor */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-300 mb-4">
          Content (Markdown)
        </label>
        <div className="markdown-editor">
          <MDEditor
            value={editedPost.content}
            onChange={(val) => setEditedPost(prev => ({ ...prev, content: val || '' }))}
            height={500}
            preview="edit"
            hideToolbar={false}
            data-color-mode="dark"
          />
        </div>
      </div>
    </div>
  )
}