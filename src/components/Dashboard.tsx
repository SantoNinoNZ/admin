'use client'

import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabaseAPI } from '@/lib/supabase-api'
import { StaticPostsService } from '@/lib/static-posts-service'
import type { PostWithDetails, PostFormData, User, UnifiedPost, StaticPost } from '@/types'
import { PostEditor } from './PostEditor'
import { PostList } from './PostList'
import { UserList } from './UserList'
import {
  Layout,
  Menu,
  Spin,
  Button,
  Alert,
  Avatar,
  Space,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  LogoutOutlined,
  UserOutlined,
  LeftOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { notification } from 'antd'

const { Sider, Header, Content } = Layout
const { Title } = Typography

interface DashboardProps {
  session: Session
  onLogout: () => void
}

export function Dashboard({ session, onLogout }: DashboardProps) {
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedPost, setSelectedPost] = useState<PostFormData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState('posts')

  useEffect(() => {
    loadPosts()
    // Temporarily disabled - causing errors
    // loadUsers()
  }, [])

  const loadPosts = async () => {
    try {
      setLoadingPosts(true)
      setError('')

      // Fetch both database and static posts in parallel
      const [databasePosts, staticPosts] = await Promise.all([
        supabaseAPI.getPosts({
          orderBy: 'updated_at',
          orderDirection: 'desc'
        }),
        StaticPostsService.getAllStaticPosts()
      ])

      // Combine and sort by date
      const allPosts = [...databasePosts, ...staticPosts].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime()
        const dateB = new Date(b.updated_at || b.created_at).getTime()
        return dateB - dateA
      })

      setPosts(allPosts)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load posts'
      setError(message)
      notification.error({ title: 'Error', description: message });
    } finally {
      setLoadingPosts(false)
    }
  }

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      setError('')
      const usersData = await supabaseAPI.getUsers()
      setUsers(usersData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users'
      setError(message)
      notification.error({ title: 'Error', description: message });
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleCreateNew = () => {
    const newPost: PostFormData = {
      slug: '',
      title: '',
      excerpt: '',
      content: '',
      imageUrl: '',
      published: false,
      categoryId: undefined,
      tagIds: []
    }
    setSelectedPost(newPost)
    setIsCreating(true)
  }

  const handleEditPost = (post: UnifiedPost) => {
    const isStatic = 'source' in post && post.source === 'static'

    const formData: PostFormData = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      imageUrl: post.image_url || '',
      published: post.published,
      publishedAt: post.published_at || undefined,
      categoryId: post.category_id || undefined,
      tagIds: (Array.isArray(post.tags) ? post.tags.map((t: any) => t.id) : []) || [],
      metaTitle: post.meta_title || '',
      metaDescription: post.meta_description || '',
      metaKeywords: post.meta_keywords || [],
      ogImage: post.og_image || '',
      source: isStatic ? 'static' : 'database',
      fileName: isStatic ? (post as StaticPost).fileName : undefined,
      fileSha: isStatic ? (post as StaticPost).fileSha : undefined,
    }
    setSelectedPost(formData)
    setIsCreating(false)
  }

  const handleSavePost = async (postData: PostFormData) => {
    try {
      // Handle static posts differently
      if (postData.source === 'static' && postData.fileName && postData.fileSha) {
        // Update static post (commit to GitHub)
        await StaticPostsService.updateStaticPost(
          postData.fileName,
          postData.fileSha,
          postData
        );
        notification.success({
          message: 'Success',
          description: 'Static post updated and committed to GitHub!',
          duration: 5,
        });
      } else {
        // Handle database posts
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
        };

        if (isCreating) {
          await supabaseAPI.createPost(payload, postData.tagIds);
          notification.success({ title: 'Success', description: 'Post created successfully!' });
        } else if (postData.id) {
          await supabaseAPI.updatePost(postData.id, payload, postData.tagIds);
          notification.success({ title: 'Success', description: 'Post updated successfully!' });
        }
      }

      await loadPosts()
      setSelectedPost(null)
      setIsCreating(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save post'
      setError(message)
      notification.error({ title: 'Error', description: message });
      throw err
    }
  }

  const handleDeletePost = async (post: UnifiedPost) => {
    try {
      const isStatic = 'source' in post && post.source === 'static'

      if (isStatic) {
        // Delete static post (commit to GitHub)
        const staticPost = post as StaticPost
        await StaticPostsService.deleteStaticPost(
          staticPost.fileName,
          staticPost.fileSha,
          staticPost.title
        );
        notification.success({
          message: 'Success',
          description: 'Static post deleted and committed to GitHub!',
          duration: 5,
        });
      } else {
        // Delete database post
        await supabaseAPI.deletePost(post.id)
        notification.success({ title: 'Success', description: 'Post deleted successfully!' });
      }

      await loadPosts()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete post'
      setError(message)
      notification.error({ title: 'Error', description: message });
    }
  }

  const handleCancel = () => {
    setSelectedPost(null)
    setIsCreating(false)
  }

  const user = {
    name: session.user.user_metadata?.full_name || session.user.email || 'User',
    email: session.user.email || '',
    avatar: session.user.user_metadata?.avatar_url || ''
  }

  const renderContent = () => {
    // Show loading spinner based on selected menu
    if (selectedMenu === 'posts' && loadingPosts) {
      return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>;
    }
    if (selectedMenu === 'users' && loadingUsers) {
      return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>;
    }

    if (error && posts.length === 0 && users.length === 0) {
      return <Alert title="Error" description={error} type="error" showIcon closable />;
    }
    if (selectedPost) {
      return <PostEditor post={selectedPost} isNew={isCreating} onSave={handleSavePost} onCancel={handleCancel} />;
    }
    if (selectedMenu === 'users') {
      return (
        <>
          <Title level={2}>Users</Title>
          <p className="mb-4 text-gray-500">Manage your users ({users.length} total)</p>
          <UserList users={users} />
        </>
      );
    }
    return (
      <>
        <Title level={2}>Posts</Title>
        <p className="mb-4 text-gray-500">Manage your blog posts ({posts.length} total)</p>
        <PostList posts={posts} onEdit={handleEditPost} onDelete={handleDeletePost} />
      </>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          background: '#001529'
        }}
        trigger={null}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Space orientation="vertical" align="center" style={{ width: '100%' }}>
            <Avatar
              size={collapsed ? 40 : 64}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff' }}
            />
            {!collapsed && (
              <>
                <Title level={5} style={{ color: 'white', margin: '8px 0 0 0' }}>
                  {user.name}
                </Title>
                <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '12px' }}>
                  {user.email}
                </span>
              </>
            )}
          </Space>
        </div>
        <Menu
          theme="dark"
          defaultSelectedKeys={['1']}
          mode="inline"
          style={{ borderRight: 0 }}
          items={[
            {
              key: 'posts',
              icon: <EditOutlined />,
              label: 'Posts',
              onClick: () => setSelectedMenu('posts'),
            },
            {
              key: 'users',
              icon: <TeamOutlined />,
              label: 'Users',
              onClick: () => setSelectedMenu('users'),
            },
            {
              key: '2',
              icon: <LogoutOutlined />,
              label: 'Sign Out',
              onClick: onLogout,
            },
          ]}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            padding: '16px',
            textAlign: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <RightOutlined style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '14px' }} />
          ) : (
            <LeftOutlined style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '14px' }} />
          )}
        </div>
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {selectedPost ? (isCreating ? 'Create Post' : 'Edit Post') : (selectedMenu === 'posts' ? 'Posts' : 'Users')}
            </Title>
          </div>
          {selectedMenu === 'posts' && !selectedPost && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
              New Post
            </Button>
          )}
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f0f2f5', minHeight: 280 }}>
          <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

