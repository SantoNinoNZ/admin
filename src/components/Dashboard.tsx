'use client'

import { useState, useEffect } from 'react'
import { GitHubAPI } from '@/lib/github-api'
import { Post, GitHubUser } from '@/types'
import { PostEditor } from './PostEditor'
import { PostList } from './PostList'
import { Plus, LogOut, User } from 'lucide-react'

interface DashboardProps {
  token: string;
  onLogout: () => void;
}

export function Dashboard({ token, onLogout }: DashboardProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const githubAPI = new GitHubAPI(token)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [userData, postFiles] = await Promise.all([
        githubAPI.getUser(),
        githubAPI.getPostFiles()
      ])

      setUser(userData)

      // Load post content for each file
      const postsData = await Promise.all(
        postFiles.map(file => githubAPI.getPostContent(file.name))
      )

      setPosts(postsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    const newPost: Post = {
      slug: '',
      title: '',
      date: new Date().toISOString().split('T')[0],
      excerpt: '',
      imageUrl: '',
      content: ''
    }
    setSelectedPost(newPost)
    setIsCreating(true)
  }

  const handleEditPost = (post: Post) => {
    setSelectedPost(post)
    setIsCreating(false)
  }

  const handleSavePost = async (post: Post) => {
    try {
      await githubAPI.savePost(post, isCreating)
      await loadInitialData() // Refresh the list
      setSelectedPost(null)
      setIsCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post')
    }
  }

  const handleDeletePost = async (post: Post) => {
    if (!confirm(`Are you sure you want to delete "${post.title}"?`)) return

    try {
      await githubAPI.deletePost(post.slug, post.sha!)
      await loadInitialData() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post')
    }
  }

  const handleCancel = () => {
    setSelectedPost(null)
    setIsCreating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-200">{error}</p>
        <button
          onClick={loadInitialData}
          className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-3">
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-white font-semibold">{user.name}</p>
                <p className="text-gray-300 text-sm">@{user.login}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCreateNew}
            className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Post</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedPost ? (
        <PostEditor
          post={selectedPost}
          isNew={isCreating}
          onSave={handleSavePost}
          onCancel={handleCancel}
          githubAPI={githubAPI}
        />
      ) : (
        <PostList
          posts={posts}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
        />
      )}
    </div>
  )
}