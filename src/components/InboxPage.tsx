'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { supabaseAPI } from '@/lib/supabase-api'
import type { ContactMessage } from '@/types/requests'
import {
  Table,
  Tag,
  Button,
  Drawer,
  Typography,
  Space,
  Select,
  Badge,
  Popconfirm,
  Alert,
  Spin,
  Descriptions,
  Tooltip,
} from 'antd'
import {
  EyeOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'

const { Title, Text, Paragraph } = Typography

const STATUS_COLORS: Record<string, string> = {
  new: 'blue',
  read: 'cyan',
  replied: 'green',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  read: 'Read',
  replied: 'Replied',
}

export function InboxPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ContactMessage | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await supabaseAPI.getContactMessages()
      setMessages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const openDrawer = async (record: ContactMessage) => {
    setSelected(record)
    setDrawerOpen(true)

    if (!record.is_read) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabaseAPI.markContactMessageRead(record.id, user.id, user.email || '')
        const updated = { ...record, is_read: true, status: 'read', read_by_email: user.email || '', read_at: new Date().toISOString() }
        setMessages(prev => prev.map(m => m.id === record.id ? updated : m))
        setSelected(updated)
      }
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!selected) return
    setUpdating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      await supabaseAPI.updateContactMessageStatus(selected.id, status, user.id, user.email || '')
      const updated = {
        ...selected,
        status,
        ...(status === 'replied' ? { replied_by_email: user.email || '', replied_at: new Date().toISOString() } : {}),
      }
      setSelected(updated)
      setMessages(prev => prev.map(m => m.id === selected.id ? updated : m))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await supabaseAPI.deleteContactMessage(id)
      setMessages(prev => prev.filter(m => m.id !== id))
      if (selected?.id === id) {
        setDrawerOpen(false)
        setSelected(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const unreadCount = messages.filter(m => !m.is_read).length

  const columns = [
    {
      title: '',
      dataIndex: 'is_read',
      width: 12,
      render: (isRead: boolean) => isRead ? null : <Badge status="processing" />,
    },
    {
      title: 'From',
      render: (_: any, record: ContactMessage) => (
        <div>
          <Text strong={!record.is_read}>{record.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
        </div>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      render: (v: string | null, record: ContactMessage) => (
        <Text strong={!record.is_read}>{v || <Text type="secondary">(no subject)</Text>}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>{STATUS_LABELS[status] || status}</Tag>
      ),
    },
    {
      title: 'Received',
      dataIndex: 'created_at',
      render: (v: string) => format(new Date(v), 'dd MMM yyyy HH:mm'),
    },
    {
      title: 'Actions',
      render: (_: any, record: ContactMessage) => (
        <Space>
          <Tooltip title="View">
            <Button icon={<EyeOutlined />} size="small" onClick={() => openDrawer(record)} />
          </Tooltip>
          <Popconfirm title="Delete this message?" onConfirm={() => handleDelete(record.id)} okText="Delete" okType="danger">
            <Tooltip title="Delete">
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (loading) return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Inbox{unreadCount > 0 && <Badge count={unreadCount} style={{ marginLeft: 12 }} />}
          </Title>
          <Text type="secondary">Contact form messages ({messages.length} total)</Text>
        </div>
        <Button onClick={load}>Refresh</Button>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}

      <Table
        dataSource={messages}
        columns={columns}
        rowKey="id"
        onRow={(record) => ({ onClick: () => openDrawer(record), style: { cursor: 'pointer' } })}
        pagination={{ pageSize: 20 }}
      />

      <Drawer
        title={selected ? `Message from ${selected.name}` : ''}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null) }}
        width={520}
        extra={
          selected && (
            <Popconfirm title="Delete this message?" onConfirm={() => handleDelete(selected.id)} okText="Delete" okType="danger">
              <Button icon={<DeleteOutlined />} danger size="small">Delete</Button>
            </Popconfirm>
          )
        }
      >
        {selected && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="From">{selected.name}</Descriptions.Item>
              <Descriptions.Item label="Email">
                <a href={`mailto:${selected.email}`}>{selected.email}</a>
              </Descriptions.Item>
              <Descriptions.Item label="Subject">{selected.subject || '—'}</Descriptions.Item>
              <Descriptions.Item label="Received">{format(new Date(selected.created_at), 'dd MMM yyyy HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Read by">{selected.read_by_email || 'Not yet read'}</Descriptions.Item>
              {selected.read_at && (
                <Descriptions.Item label="Read at">{format(new Date(selected.read_at), 'dd MMM yyyy HH:mm')}</Descriptions.Item>
              )}
              {selected.replied_by_email && (
                <Descriptions.Item label="Replied by">{selected.replied_by_email}</Descriptions.Item>
              )}
            </Descriptions>

            <div>
              <Text strong>Message:</Text>
              <Paragraph style={{ marginTop: 8, padding: '12px', background: '#f9f9f9', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                {selected.message}
              </Paragraph>
            </div>

            <div>
              <Text strong>Status:</Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Select
                  value={selected.status}
                  onChange={handleStatusChange}
                  loading={updating}
                  style={{ width: 160 }}
                  options={[
                    { value: 'new', label: 'New' },
                    { value: 'read', label: 'Read' },
                    { value: 'replied', label: 'Replied' },
                  ]}
                />
                {selected.status === 'replied' && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />}
              </div>
              <div style={{ marginTop: 8 }}>
                <Button
                  type="link"
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || 'Your message')}`}
                  style={{ padding: 0 }}
                >
                  Reply via email
                </Button>
              </div>
            </div>
          </Space>
        )}
      </Drawer>
    </>
  )
}
