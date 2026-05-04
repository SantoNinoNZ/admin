'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { supabaseAPI } from '@/lib/supabase-api'
import type { PrayerRequest, PrayerRequestStatus } from '@/types/requests'
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
  praying: 'purple',
  completed: 'green',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  praying: 'Praying',
  completed: 'Completed',
}

export function IntercessionsPage() {
  const [requests, setRequests] = useState<PrayerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<PrayerRequest | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await supabaseAPI.getPrayerRequests()
      setRequests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prayer requests')
    } finally {
      setLoading(false)
    }
  }

  const openDrawer = async (record: PrayerRequest) => {
    setSelected(record)
    setDrawerOpen(true)

    if (!record.is_read) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabaseAPI.markPrayerRequestRead(record.id, user.id, user.email || '')
        setRequests(prev => prev.map(r => r.id === record.id ? { ...r, is_read: true, read_by_email: user.email || '', read_at: new Date().toISOString() } : r))
        setSelected(prev => prev ? { ...prev, is_read: true, read_by_email: user.email || '', read_at: new Date().toISOString() } : prev)
      }
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!selected) return
    setUpdating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      await supabaseAPI.updatePrayerRequestStatus(selected.id, status, user.id, user.email || '')
      const updated = { ...selected, status, actioned_by_email: user.email || '', actioned_at: new Date().toISOString() }
      setSelected(updated)
      setRequests(prev => prev.map(r => r.id === selected.id ? updated : r))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await supabaseAPI.deletePrayerRequest(id)
      setRequests(prev => prev.filter(r => r.id !== id))
      if (selected?.id === id) {
        setDrawerOpen(false)
        setSelected(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const unreadCount = requests.filter(r => !r.is_read).length

  const columns = [
    {
      title: '',
      dataIndex: 'is_read',
      width: 12,
      render: (isRead: boolean) => isRead ? null : <Badge status="processing" />,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (name: string, record: PrayerRequest) => (
        <Space>
          <Text strong={!record.is_read}>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
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
      render: (_: any, record: PrayerRequest) => (
        <Space>
          <Tooltip title="View">
            <Button icon={<EyeOutlined />} size="small" onClick={() => openDrawer(record)} />
          </Tooltip>
          <Popconfirm title="Delete this prayer request?" onConfirm={() => handleDelete(record.id)} okText="Delete" okType="danger">
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
            Intercessions{unreadCount > 0 && <Badge count={unreadCount} style={{ marginLeft: 12 }} />}
          </Title>
          <Text type="secondary">Prayer requests from devotees ({requests.length} total)</Text>
        </div>
        <Button onClick={load}>Refresh</Button>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}

      <Table
        dataSource={requests}
        columns={columns}
        rowKey="id"
        rowClassName={(record) => record.is_read ? '' : 'font-bold'}
        onRow={(record) => ({ onClick: () => openDrawer(record), style: { cursor: 'pointer' } })}
        pagination={{ pageSize: 20 }}
      />

      <Drawer
        title={selected ? `Prayer Request — ${selected.name}` : ''}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null) }}
        width={520}
        extra={
          selected && (
            <Popconfirm title="Delete this prayer request?" onConfirm={() => handleDelete(selected.id)} okText="Delete" okType="danger">
              <Button icon={<DeleteOutlined />} danger size="small">Delete</Button>
            </Popconfirm>
          )
        }
      >
        {selected && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Name">{selected.name}</Descriptions.Item>
              <Descriptions.Item label="Email">{selected.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Contact">{selected.contact || '—'}</Descriptions.Item>
              <Descriptions.Item label="Received">{format(new Date(selected.created_at), 'dd MMM yyyy HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Read by">{selected.read_by_email || 'Not yet read'}</Descriptions.Item>
              <Descriptions.Item label="Actioned by">{selected.actioned_by_email || '—'}</Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>Prayer Request:</Text>
              <Paragraph style={{ marginTop: 8, padding: '12px', background: '#f9f9f9', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                {selected.prayer_request}
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
                    { value: 'praying', label: 'Praying' },
                    { value: 'completed', label: 'Completed' },
                  ]}
                />
                {selected.status === 'completed' && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />}
              </div>
            </div>
          </Space>
        )}
      </Drawer>
    </>
  )
}
