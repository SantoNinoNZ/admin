'use client'

import { useState, useEffect } from 'react'
import { supabaseAPI } from '@/lib/supabase-api'
import { StaticPostsService } from '@/lib/static-posts-service'
import type { PostFormData, UnifiedPost } from '@/types'
import { PostEditor } from '@/components/PostEditor'
import { PostList } from '@/components/PostList'
import { Button, Spin, Alert, Typography, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const { Title } = Typography

export default function PostsPage() {
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPost, setSelectedPost] = useState<PostFormData | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      setError('')

      const [databasePosts, staticPosts] = await Promise.all([
        supabaseAPI.getPosts({
          orderBy: 'updated_at',
          orderDirection: 'desc'
        }),
        StaticPostsService.getAllStaticPosts()
      ])

      const unifiedPosts: UnifiedPost[] = [
        ...databasePosts,
        ...staticPosts
      ]

      unifiedPosts.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.published_at || 0).getTime()
        const dateB = new Date(b.updated_at || b.published_at || 0).getTime()
        return dateB - dateA
      })

      setPosts(unifiedPosts)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load posts'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePost = async (postData: PostFormData) => {
    if (selectedPost && selectedPost.id) {
      await supabaseAPI.updatePost(selectedPost.id, postData)
    } else {
      await supabaseAPI.createPost(postData)
    }
    await loadPosts()
    setSelectedPost(null)
    setIsCreating(false)
  }

  const handleCancelEdit = () => {
    setSelectedPost(null)
    setIsCreating(false)
  }

  const handleEditPost = (post: UnifiedPost) => {
    // Check if it's a static post by checking if it has an id
    if (!('id' in post) || !post.id) {
      alert('Cannot edit static posts')
      return
    }
    setSelectedPost(post as PostFormData)
    setIsCreating(false)
  }

  const handleDeletePost = async (post: UnifiedPost) => {
    if ('id' in post && post.id) {
      await supabaseAPI.deletePost(post.id)
      await loadPosts()
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>
  }

  if (error && posts.length === 0) {
    return <Alert message="Error" description={error} type="error" showIcon closable />
  }

  if (isCreating) {
    // Create a minimal empty post for new posts
    const emptyPost: PostFormData = {
      id: '',
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      published: false,
      publishedAt: new Date().toISOString(),
      imageUrl: undefined,
      categoryId: undefined
    }
    return <PostEditor post={emptyPost} isNew={true} onSave={handleSavePost} onCancel={handleCancelEdit} />
  }

  if (selectedPost) {
    return <PostEditor post={selectedPost} isNew={false} onSave={handleSavePost} onCancel={handleCancelEdit} />
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>Posts</Title>
          <p style={{ margin: 0, color: '#666' }}>Manage your blog posts ({posts.length} total)</p>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreating(true)} size="large">
          New Post
        </Button>
      </div>
      <PostList posts={posts} onEdit={handleEditPost} onDelete={handleDeletePost} />
    </>
  )
}
