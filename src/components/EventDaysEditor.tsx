'use client'

import { useState } from 'react'
import { Button, Card, Form, Input, Space, Typography, Row, Col, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { EventDay } from '@/types/events'

const { Title } = Typography
const { TextArea } = Input

interface EventDaysEditorProps {
  days: Omit<EventDay, 'id'>[]
  onChange: (days: Omit<EventDay, 'id'>[]) => void
}

export function EventDaysEditor({ days, onChange }: EventDaysEditorProps) {
  const [editingDay, setEditingDay] = useState<Omit<EventDay, 'id'> | null>(null)
  const [form] = Form.useForm()

  const handleAddDay = () => {
    form.validateFields().then((values) => {
      const newDay: Omit<EventDay, 'id'> = {
        dayNumber: days.length + 1,
        date: values.date,
        choir: values.choir,
        sponsorsPilgrims: values.sponsorsPilgrims,
        areaCoordinators: values.areaCoordinators,
      }

      onChange([...days, newDay])
      form.resetFields()
      setEditingDay(null)
    })
  }

  const handleUpdateDay = (index: number) => {
    form.validateFields().then((values) => {
      const updatedDays = [...days]
      updatedDays[index] = {
        dayNumber: days[index].dayNumber,
        date: values.date,
        choir: values.choir,
        sponsorsPilgrims: values.sponsorsPilgrims,
        areaCoordinators: values.areaCoordinators,
      }
      onChange(updatedDays)
      form.resetFields()
      setEditingDay(null)
    })
  }

  const handleDeleteDay = (index: number) => {
    const updatedDays = days.filter((_, i) => i !== index)
    // Renumber days
    updatedDays.forEach((day, i) => {
      day.dayNumber = i + 1
    })
    onChange(updatedDays)
  }

  const handleEditDay = (day: Omit<EventDay, 'id'>) => {
    setEditingDay(day)
    form.setFieldsValue({
      date: day.date,
      choir: day.choir,
      sponsorsPilgrims: day.sponsorsPilgrims,
      areaCoordinators: day.areaCoordinators,
    })
  }

  const handleCancelEdit = () => {
    setEditingDay(null)
    form.resetFields()
  }

  return (
    <div>
      {/* List of existing days */}
      {days.length > 0 && (
        <div className="mb-4">
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {days.map((day, index) => (
              <Card
                key={index}
                size="small"
                title={`Day ${day.dayNumber}: ${day.date}`}
                extra={
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleEditDay(day)}
                    >
                      Edit
                    </Button>
                    <Popconfirm
                      title="Delete this day?"
                      onConfirm={() => handleDeleteDay(index)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </Space>
                }
              >
                <div>
                  <strong>Choir:</strong> {day.choir}
                </div>
                <div>
                  <strong>Sponsors/Pilgrims:</strong> {day.sponsorsPilgrims}
                </div>
                <div>
                  <strong>Area Coordinators:</strong> {day.areaCoordinators}
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}

      {/* Add/Edit form */}
      <Card
        title={editingDay ? 'Edit Day' : 'Add New Day'}
        size="small"
        className="bg-gray-50"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label="Date"
                name="date"
                rules={[{ required: true, message: 'Please enter date' }]}
              >
                <Input placeholder="Friday, 9 January 2026" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label="Choir"
                name="choir"
                rules={[{ required: true, message: 'Please enter choir name' }]}
              >
                <Input placeholder="HUNI (Holy Cross Parish Papatoetoe Filipino Choir)" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label="Sponsors/Pilgrims"
                name="sponsorsPilgrims"
                rules={[{ required: true, message: 'Please enter sponsors and pilgrims' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="All devotees of Senor Sto. Niño & Organizers"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label="Area Coordinators"
                name="areaCoordinators"
                rules={[{ required: true, message: 'Please enter area coordinators' }]}
              >
                <Input placeholder="Piercy and Mercy Gomez" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              {editingDay ? (
                <>
                  <Button
                    type="primary"
                    onClick={() => handleUpdateDay(days.findIndex(d => d === editingDay))}
                  >
                    Update Day
                  </Button>
                  <Button onClick={handleCancelEdit}>Cancel</Button>
                </>
              ) : (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddDay}
                >
                  Add Day
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
