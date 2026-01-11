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
  Drawer,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  LogoutOutlined,
  UserOutlined,
  LeftOutlined,
  RightOutlined,
  TeamOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { notification } from 'antd'

const { Sider, Content, Header } = Layout
const { Title } = Typography

interface AdminLayoutProps {
  session: Session
  onLogout: () => void
}

export function AdminLayout({ session, onLogout }: AdminLayoutProps) {
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedPost, setSelectedPost] = useState<PostFormData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState('posts')
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

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

  const menuItems = [
    {
      key: 'posts',
      icon: <EditOutlined />,
      label: 'Posts',
      onClick: () => {
        setSelectedMenu('posts')
        setMobileDrawerOpen(false)
      },
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: 'Users',
      onClick: () => {
        setSelectedMenu('users')
        setMobileDrawerOpen(false)
      },
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: () => {
        setMobileDrawerOpen(false)
        onLogout()
      },
    },
  ]

  const renderUserProfile = (isCollapsed = false) => (
    <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <Space orientation="vertical" align="center" style={{ width: '100%' }}>
        <Avatar
          size={isCollapsed ? 40 : 64}
          icon={<UserOutlined />}
          style={{ backgroundColor: '#1890ff' }}
        />
        {!isCollapsed && (
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
  )

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <Title level={2} style={{ margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.5rem)' }}>Posts</Title>
            <p className="mb-0 text-gray-500" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
              Manage your blog posts ({posts.length} total)
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateNew}
            size="large"
            style={{ flexShrink: 0 }}
          >
            <span className="hide-on-mobile">New Post</span>
            <span className="show-on-mobile">New</span>
          </Button>
        </div>
        <PostList posts={posts} onEdit={handleEditPost} onDelete={handleDeletePost} />
      </>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          background: '#001529'
        }}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={80}
        className="desktop-sider"
      >
        {renderUserProfile(collapsed)}
        <Menu
          theme="dark"
          selectedKeys={[selectedMenu]}
          mode="inline"
          style={{ borderRight: 0 }}
          items={menuItems}
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

      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        className="mobile-drawer"
        styles={{
          body: { padding: 0, background: '#001529' },
        }}
        width={280}
      >
        {renderUserProfile(false)}
        <Menu
          theme="dark"
          selectedKeys={[selectedMenu]}
          mode="inline"
          style={{ borderRight: 0, background: '#001529' }}
          items={menuItems}
        />
      </Drawer>

      <Layout>
        {/* Mobile Header */}
        <Header className="mobile-header" style={{
          background: '#fff',
          padding: '0 16px',
          display: 'none',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileDrawerOpen(true)}
            style={{ marginRight: 16 }}
          />
          <Title level={4} style={{ margin: 0 }}>
            Santo Niño Admin
          </Title>
        </Header>

        <Content style={{ padding: '16px', background: '#f0f2f5', minHeight: '100vh' }}>
          <div style={{ background: '#fff', padding: '16px', minHeight: 360, borderRadius: '8px' }}>
            {renderContent()}
          </div>
        </Content>
      </Layout>

      <style jsx global>{`
        @media (max-width: 991px) {
          .desktop-sider {
            display: none !important;
          }
          .mobile-header {
            display: flex !important;
          }
        }
        @media (min-width: 992px) {
          .mobile-drawer .ant-drawer {
            display: none;
          }
          .mobile-header {
            display: none !important;
          }
        }
        @media (max-width: 576px) {
          .hide-on-mobile {
            display: none !important;
          }
          .show-on-mobile {
            display: inline !important;
          }
        }
        @media (min-width: 577px) {
          .hide-on-mobile {
            display: inline !important;
          }
          .show-on-mobile {
            display: none !important;
          }
        }
      `}</style>
    </Layout>
  )
}

