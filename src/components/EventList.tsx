'use client'

import { Table, Button, Space, Tag, Popconfirm, Typography } from 'antd'
import { EditOutlined, DeleteOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons'
import type { Event, RecurringEvent, DatedEvent } from '@/types/events'

const { Text } = Typography

interface EventListProps {
  events: Event[]
  onEdit: (event: Event) => void
  onDelete: (event: Event) => void
}

export function EventList({ events, onEdit, onDelete }: EventListProps) {
  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: '25%',
      render: (title: string, record: Event) => (
        <div>
          <div className="font-medium">{title}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.slug}
          </Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: '10%',
      render: (type: string) => (
        <Tag color={type === 'recurring' ? 'blue' : 'green'}>
          {type === 'recurring' ? 'Recurring' : 'Dated'}
        </Tag>
      ),
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: '25%',
      render: (_: any, record: Event) => {
        if (record.type === 'recurring') {
          const recurringEvent = record as RecurringEvent
          return (
            <div>
              <div className="flex items-center gap-2">
                <CalendarOutlined />
                <Text>{recurringEvent.recurrence}</Text>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <ClockCircleOutlined />
                <Text type="secondary">{recurringEvent.time}</Text>
              </div>
            </div>
          )
        } else {
          const datedEvent = record as DatedEvent
          return (
            <div>
              <div className="flex items-center gap-2">
                <CalendarOutlined />
                <Text>{datedEvent.start_date}</Text>
              </div>
              {datedEvent.start_date !== datedEvent.end_date && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  to {datedEvent.end_date}
                </Text>
              )}
            </div>
          )
        }
      },
    },
    {
      title: 'Venue',
      dataIndex: 'venue',
      key: 'venue',
      width: '20%',
      render: (venue: string) => (
        <Text ellipsis style={{ maxWidth: '200px' }}>{venue}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'published',
      key: 'published',
      width: '10%',
      render: (published: boolean) => (
        <Tag color={published ? 'success' : 'default'}>
          {published ? 'Published' : 'Draft'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_: any, record: Event) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            size="small"
          />
          <Popconfirm
            title="Delete Event"
            description="Are you sure you want to delete this event?"
            onConfirm={() => onDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="overflow-x-auto">
      <Table
        columns={columns}
        dataSource={events}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} events`,
        }}
        scroll={{ x: 800 }}
      />
    </div>
  )
}
