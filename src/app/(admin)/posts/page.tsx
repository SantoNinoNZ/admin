'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabaseAPI } from '@/lib/supabase-api'
import { StaticPostsService } from '@/lib/static-posts-service'
import type { PostFormData, UnifiedPost } from '@/types'
import { PostEditor } from '@/components/PostEditor'
import { PostList } from '@/components/PostList'
import { Button, Spin, Alert, Typography, Space, Card, Tag, Tooltip, message } from 'antd'
import {
  PlusOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

interface BuildStatus {
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
}

export default function PostsPage() {
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPost, setSelectedPost] = useState<PostFormData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null)
  const [buildLoading, setBuildLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)

  const loadBuildStatus = useCallback(async () => {
    try {
      setBuildLoading(true)
      const status = await supabaseAPI.getBuildStatus()
      setBuildStatus(status)
    } catch (err) {
      console.error('Failed to load build status:', err)
    } finally {
      setBuildLoading(false)
    }
  }, [])

  const handleDeploy = async () => {
    try {
      setDeploying(true)
      await supabaseAPI.triggerRebuild()
      message.success('Deploy triggered! The site will be updated shortly.')
      // Wait a moment then refresh status
      setTimeout(() => {
        loadBuildStatus()
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger deploy'
      message.error(errorMessage)
    } finally {
      setDeploying(false)
    }
  }

  useEffect(() => {
    loadPosts()
    loadBuildStatus()
  }, [loadBuildStatus])

  // Poll for build status while building
  useEffect(() => {
    if (buildStatus?.current?.status === 'in_progress' || buildStatus?.current?.status === 'queued') {
      const interval = setInterval(() => {
        loadBuildStatus()
      }, 10000) // Poll every 10 seconds
      return () => clearInterval(interval)
    }
  }, [buildStatus?.current?.status, loadBuildStatus])

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
    // Debug: log form data
    console.log('handleSavePost received:', postData)
    console.log('categoryId value:', postData.categoryId)

    // Transform camelCase form data to snake_case for database
    const payload = {
      slug: postData.slug,
      title: postData.title,
      excerpt: postData.excerpt || null,
      content: postData.content,
      image_url: postData.imageUrl || null,
      published: postData.published || false,
      category_id: postData.categoryId || null,
      meta_title: postData.metaTitle || null,
      meta_description: postData.metaDescription || null,
      meta_keywords: postData.metaKeywords || null,
      og_image: postData.ogImage || null,
    }

    console.log('Payload being sent:', payload)

    if (selectedPost && selectedPost.id) {
      await supabaseAPI.updatePost(selectedPost.id, payload, postData.tagIds)
    } else {
      await supabaseAPI.createPost(payload, postData.tagIds)
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

    // Transform snake_case database fields to camelCase for PostFormData
    const formData: PostFormData = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || undefined,
      content: post.content,
      imageUrl: post.image_url || undefined,
      published: post.published,
      publishedAt: post.published_at || undefined,
      categoryId: post.category_id || undefined,
      tagIds: Array.isArray(post.tags) ? post.tags.map((t: any) => t.id) : [],
      metaTitle: post.meta_title || undefined,
      metaDescription: post.meta_description || undefined,
      metaKeywords: post.meta_keywords || undefined,
      ogImage: post.og_image || undefined,
    }

    setSelectedPost(formData)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getBuildStatusTag = () => {
    if (!buildStatus?.current) return null

    const { status, conclusion } = buildStatus.current

    if (status === 'in_progress' || status === 'queued') {
      return (
        <Tag icon={<SyncOutlined spin />} color="processing">
          {status === 'queued' ? 'Queued' : 'Building...'}
        </Tag>
      )
    }

    if (status === 'completed') {
      if (conclusion === 'success') {
        return <Tag icon={<CheckCircleOutlined />} color="success">Deployed</Tag>
      }
      if (conclusion === 'failure') {
        return <Tag icon={<CloseCircleOutlined />} color="error">Failed</Tag>
      }
      if (conclusion === 'cancelled') {
        return <Tag icon={<CloseCircleOutlined />} color="warning">Cancelled</Tag>
      }
    }

    return null
  }

  const isBuilding = buildStatus?.current?.status === 'in_progress' || buildStatus?.current?.status === 'queued'

  return (
    <>
      {/* Deploy Status Card */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space size="middle" wrap>
            <Space>
              <RocketOutlined style={{ fontSize: 18, color: '#1890ff' }} />
              <Text strong>Site Deployment</Text>
            </Space>
            {getBuildStatusTag()}
            {buildStatus?.lastSuccessful && (
              <Tooltip title="Last successful deployment">
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {formatDate(buildStatus.lastSuccessful.completed_at)}
                </Text>
              </Tooltip>
            )}
            {buildStatus?.current?.html_url && (
              <Tooltip title="View build on GitHub">
                <a href={buildStatus.current.html_url} target="_blank" rel="noopener noreferrer">
                  <LinkOutlined />
                </a>
              </Tooltip>
            )}
          </Space>
          <Space>
            <Button
              size="small"
              icon={<SyncOutlined spin={buildLoading} />}
              onClick={loadBuildStatus}
              disabled={buildLoading}
            >
              Refresh
            </Button>
            <Tooltip title={isBuilding ? 'Build in progress' : 'Publish all changes to the live site'}>
              <Button
                type="primary"
                icon={<RocketOutlined />}
                onClick={handleDeploy}
                loading={deploying}
                disabled={isBuilding}
              >
                Deploy Site
              </Button>
            </Tooltip>
          </Space>
        </div>
      </Card>

      {/* Posts Header */}
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
