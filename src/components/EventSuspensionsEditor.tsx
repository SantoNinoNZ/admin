'use client'

import { useState } from 'react'
import { Button, Card, Form, Input, DatePicker, Space, List, Popconfirm, Alert } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { EventSuspension } from '@/types/events'
import { supabaseAPI } from '@/lib/supabase-api'
import { notification } from 'antd'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface EventSuspensionsEditorProps {
  eventId: string
  suspensions: EventSuspension[]
  onChange: (suspensions: EventSuspension[]) => void
}

export function EventSuspensionsEditor({ eventId, suspensions, onChange }: EventSuspensionsEditorProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleAddSuspension = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const [startDate, endDate] = values.dateRange
      const newSuspension = await supabaseAPI.addEventSuspension(eventId, {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        reason: values.reason,
      })

      onChange([...suspensions, newSuspension])
      form.resetFields()
      notification.success({
        message: 'Suspension Added',
        description: 'The date range suspension has been added successfully.',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add suspension'
      notification.error({
        message: 'Error',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSuspension = async (suspension: EventSuspension) => {
    if (!suspension.id) return

    try {
      setLoading(true)
      await supabaseAPI.removeEventSuspension(suspension.id)
      onChange(suspensions.filter(s => s.id !== suspension.id))
      notification.success({
        message: 'Suspension Removed',
        description: 'The suspension has been removed successfully.',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove suspension'
      notification.error({
        message: 'Error',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Alert
        message="About Suspensions"
        description="Add date ranges when this recurring event should NOT occur. For example, during special events like the Novena Fiesta."
        type="info"
        showIcon
        className="mb-4"
      />

      {/* List of existing suspensions */}
      {suspensions.length > 0 && (
        <List
          className="mb-4"
          dataSource={suspensions}
          renderItem={(suspension) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="delete"
                  title="Remove this suspension?"
                  onConfirm={() => handleDeleteSuspension(suspension)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    loading={loading}
                  >
                    Remove
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={`${suspension.startDate} to ${suspension.endDate}`}
                description={suspension.reason || 'No reason specified'}
              />
            </List.Item>
          )}
        />
      )}

      {/* Add form */}
      <Card title="Add Suspension Period" size="small" className="bg-gray-50">
        <Form form={form} layout="vertical">
          <Form.Item
            label="Date Range"
            name="dateRange"
            rules={[{ required: true, message: 'Please select date range' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item
            label="Reason (Optional)"
            name="reason"
          >
            <Input placeholder="e.g., Santo Nino Fiesta 2026" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddSuspension}
              loading={loading}
            >
              Add Suspension
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
