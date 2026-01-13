'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import {
  Layout,
  Menu,
  Avatar,
  Space,
  Typography,
  Drawer,
  Button,
} from 'antd'
import {
  EditOutlined,
  LogoutOutlined,
  UserOutlined,
  LeftOutlined,
  RightOutlined,
  TeamOutlined,
  MenuOutlined,
  CalendarOutlined,
} from '@ant-design/icons'

const { Sider, Content, Header } = Layout
const { Title, Text } = Typography

interface AdminLayoutShellProps {
  session: Session
  onLogout: () => void
  section: string
  children: React.ReactNode
}

export function AdminLayoutShell({ session, onLogout, section, children }: AdminLayoutShellProps) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const handleMenuClick = (targetSection: string) => {
    setMobileDrawerOpen(false)
    // basePath '/admin' is automatically prepended by Next.js
    router.push(`/${targetSection}`)
  }

  const menuItems = [
    {
      key: 'posts',
      icon: <EditOutlined />,
      label: 'Posts',
      onClick: () => handleMenuClick('posts'),
    },
    {
      key: 'events',
      icon: <CalendarOutlined />,
      label: 'Events',
      onClick: () => handleMenuClick('events'),
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: 'Users',
      onClick: () => handleMenuClick('users'),
    },
  ]

  const currentUser = {
    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
    email: session.user.email || '',
    avatar: session.user.user_metadata?.avatar_url || ''
  }

  const renderUserProfile = (isCollapsed: boolean) => (
    <div
      style={{
        padding: isCollapsed ? '16px 8px' : '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Avatar
        size={isCollapsed ? 40 : 64}
        src={currentUser.avatar}
        icon={<UserOutlined />}
        style={{ backgroundColor: '#1890ff' }}
      />
      {!isCollapsed && (
        <>
          <div style={{ textAlign: 'center', width: '100%' }}>
            <Text strong style={{ color: 'white', display: 'block', fontSize: '16px' }}>
              {currentUser.name}
            </Text>
            <Text type="secondary" style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '12px' }}>
              {currentUser.email}
            </Text>
          </div>
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={onLogout}
            size="small"
            style={{ marginTop: '8px' }}
          >
            Sign Out
          </Button>
        </>
      )}
    </div>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sider */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={80}
        className="desktop-sider"
      >
        {renderUserProfile(collapsed)}
        <Menu
          theme="dark"
          selectedKeys={[section]}
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
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <RightOutlined style={{ color: 'white' }} /> : <LeftOutlined style={{ color: 'white' }} />}
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
        size="default"
      >
        {renderUserProfile(false)}
        <Menu
          theme="dark"
          selectedKeys={[section]}
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
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
            {children}
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
          .mobile-drawer {
            display: none !important;
          }
          .mobile-header {
            display: none !important;
          }
        }
      `}</style>
    </Layout>
  )
}
