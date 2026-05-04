'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { supabaseAPI } from '@/lib/supabase-api'
import type { HomeVisitRequest } from '@/types/requests'
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
  Input,
  DatePicker,
  TimePicker,
  Tooltip,
  Form,
} from 'antd'
import {
  EyeOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const STATUS_COLORS: Record<string, string> = {
  new: 'blue',
  confirmed: 'gold',
  completed: 'green',
  cancelled: 'red',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function VisitationsPage() {
  const [requests, setRequests] = useState<HomeVisitRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<HomeVisitRequest | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await supabaseAPI.getHomeVisitRequests()
      setRequests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load home visit requests')
    } finally {
      setLoading(false)
    }
  }

  const openDrawer = async (record: HomeVisitRequest) => {
    setSelected(record)
    setDrawerOpen(true)
    form.setFieldsValue({
      status: record.status,
      scheduled_date: record.scheduled_date ? dayjs(record.scheduled_date) : null,
      scheduled_time: record.scheduled_time ? dayjs(record.scheduled_time, 'HH:mm') : null,
      notes: record.notes || '',
    })

    if (!record.is_read) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabaseAPI.markHomeVisitRead(record.id, user.id, user.email || '')
        setRequests(prev => prev.map(r => r.id === record.id ? { ...r, is_read: true, read_by_email: user.email || '', read_at: new Date().toISOString() } : r))
        setSelected(prev => prev ? { ...prev, is_read: true } : prev)
      }
    }
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const values = form.getFieldsValue()
      const updates: any = {
        status: values.status,
        notes: values.notes || null,
        scheduled_date: values.scheduled_date ? values.scheduled_date.format('YYYY-MM-DD') : null,
        scheduled_time: values.scheduled_time ? values.scheduled_time.format('HH:mm') : null,
        actioned_by: user.id,
        actioned_by_email: user.email || '',
        actioned_at: new Date().toISOString(),
      }

      await supabaseAPI.updateHomeVisitRequest(selected.id, updates)
      const updated = { ...selected, ...updates }
      setSelected(updated)
      setRequests(prev => prev.map(r => r.id === selected.id ? updated : r))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await supabaseAPI.deleteHomeVisitRequest(id)
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
      render: (name: string, record: HomeVisitRequest) => <Text strong={!record.is_read}>{name}</Text>,
    },
    {
      title: 'Contact',
      dataIndex: 'contact',
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
      title: 'Scheduled',
      dataIndex: 'scheduled_date',
      render: (v: string | null, record: HomeVisitRequest) =>
        v ? `${format(new Date(v), 'dd MMM yyyy')}${record.scheduled_time ? ` ${record.scheduled_time}` : ''}` : <Text type="secondary">Not scheduled</Text>,
    },
    {
      title: 'Received',
      dataIndex: 'created_at',
      render: (v: string) => format(new Date(v), 'dd MMM yyyy'),
    },
    {
      title: 'Actions',
      render: (_: any, record: HomeVisitRequest) => (
        <Space>
          <Tooltip title="View & Schedule">
            <Button icon={<EyeOutlined />} size="small" onClick={() => openDrawer(record)} />
          </Tooltip>
          <Popconfirm title="Delete this request?" onConfirm={() => handleDelete(record.id)} okText="Delete" okType="danger">
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
            Visitations{unreadCount > 0 && <Badge count={unreadCount} style={{ marginLeft: 12 }} />}
          </Title>
          <Text type="secondary">Home visit requests from devotees ({requests.length} total)</Text>
        </div>
        <Button onClick={load}>Refresh</Button>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}

      <Table
        dataSource={requests}
        columns={columns}
        rowKey="id"
        onRow={(record) => ({ onClick: () => openDrawer(record), style: { cursor: 'pointer' } })}
        pagination={{ pageSize: 20 }}
      />

      <Drawer
        title={selected ? `Home Visit Request — ${selected.name}` : ''}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null) }}
        width={540}
        extra={
          <Space>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>Save</Button>
            {selected && (
              <Popconfirm title="Delete this request?" onConfirm={() => handleDelete(selected.id)} okText="Delete" okType="danger">
                <Button icon={<DeleteOutlined />} danger size="small">Delete</Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        {selected && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Name">{selected.name}</Descriptions.Item>
              <Descriptions.Item label="Email">{selected.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Contact">{selected.contact || '—'}</Descriptions.Item>
              <Descriptions.Item label="Address">{selected.address || '—'}</Descriptions.Item>
              <Descriptions.Item label="Received">{format(new Date(selected.created_at), 'dd MMM yyyy HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Read by">{selected.read_by_email || 'Not yet read'}</Descriptions.Item>
              <Descriptions.Item label="Actioned by">{selected.actioned_by_email || '—'}</Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>Requested Date/Time:</Text>
              <Paragraph style={{ marginTop: 8, padding: '12px', background: '#f9f9f9', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                {selected.requested_datetime}
              </Paragraph>
            </div>

            <Form form={form} layout="vertical">
              <Form.Item label="Status" name="status">
                <Select
                  options={[
                    { value: 'new', label: 'New' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="Scheduled Date" name="scheduled_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Scheduled Time" name="scheduled_time">
                <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={15} />
              </Form.Item>
              <Form.Item label="Notes" name="notes">
                <TextArea rows={4} placeholder="Internal notes..." />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Drawer>
    </>
  )
}
