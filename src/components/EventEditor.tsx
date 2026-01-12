'use client'

import { useState, useEffect } from 'react'
import {
  Form,
  Input,
  Button,
  Select,
  Switch,
  Card,
  Space,
  Typography,
  Row,
  Col,
  Alert,
  Divider,
} from 'antd'
import {
  SaveOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import type { Event, CreateEventDTO, UpdateEventDTO, EventDay, EventSuspension, EventType } from '@/types/events'
import { EventDaysEditor } from './EventDaysEditor'
import { EventSuspensionsEditor } from './EventSuspensionsEditor'
import { RRuleBuilder } from './RRuleBuilder'
import { rruleToText } from '@/utils/rrule-to-text'

const { TextArea } = Input
const { Title } = Typography

interface EventEditorProps {
  event?: Event
  isNew: boolean
  onSave: (eventData: CreateEventDTO | UpdateEventDTO) => Promise<void>
  onCancel: () => void
}

export function EventEditor({ event, isNew, onSave, onCancel }: EventEditorProps) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [eventType, setEventType] = useState<EventType>(event?.type || 'recurring')
  const [days, setDays] = useState<Omit<EventDay, 'id'>[]>(
    event && event.type === 'dated' ? event.days.map(d => ({
      dayNumber: d.dayNumber,
      date: d.date,
      choir: d.choir,
      sponsorsPilgrims: d.sponsorsPilgrims,
      areaCoordinators: d.areaCoordinators
    })) : []
  )
  const [suspensions, setSuspensions] = useState<EventSuspension[]>(
    event && event.type === 'recurring' && event.suspensions ? event.suspensions : []
  )

  useEffect(() => {
    if (event) {
      const formData: any = {
        slug: event.slug,
        title: event.title,
        type: event.type,
        venue: event.venue,
        address: event.address,
        content: event.content || '',
        published: event.published,
      }

      if (event.type === 'recurring') {
        formData.recurrence = event.recurrence
        formData.time = event.time
        formData.rrule = event.rrule || ''
      } else if (event.type === 'dated') {
        formData.start_date = event.start_date
        formData.end_date = event.end_date
        formData.rosary_time = event.rosary_time
        formData.parking_info = event.parking_info
      }

      form.setFieldsValue(formData)
    }
  }, [event, form])

  // Auto-generate recurrence text from RRULE when it changes
  const handleFormValuesChange = (changedValues: any) => {
    if (changedValues.rrule !== undefined && eventType === 'recurring') {
      const generatedText = rruleToText(changedValues.rrule)
      if (generatedText) {
        form.setFieldsValue({ recurrence: generatedText })
      }
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      setSaving(true)
      setError('')

      const baseData = {
        slug: values.slug,
        title: values.title,
        type: eventType,
        venue: values.venue,
        address: values.address,
        content: values.content || '',
        published: values.published ?? true,
      }

      let eventData: CreateEventDTO | UpdateEventDTO

      if (eventType === 'recurring') {
        eventData = {
          ...baseData,
          recurrence: values.recurrence,
          time: values.time,
          rrule: values.rrule || undefined,
        } as any
      } else {
        eventData = {
          ...baseData,
          start_date: values.start_date,
          end_date: values.end_date,
          rosary_time: values.rosary_time,
          parking_info: values.parking_info,
          days: days,
        } as any
      }

      if (!isNew && event) {
        eventData = { ...eventData, id: event.id } as UpdateEventDTO
      }

      await onSave(eventData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save event'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleTypeChange = (value: EventType) => {
    setEventType(value)
    // Clear type-specific fields when switching
    if (value === 'recurring') {
      form.setFieldsValue({
        recurrence: '',
        time: '',
        start_date: undefined,
        end_date: undefined,
        rosary_time: undefined,
        parking_info: undefined,
      })
      setDays([])
    } else {
      form.setFieldsValue({
        recurrence: undefined,
        time: undefined,
        start_date: '',
        end_date: '',
      })
      setSuspensions([])
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={onCancel} type="text">
          Back to Events
        </Button>
      </div>

      <Card>
        <Title level={2}>{isNew ? 'Create New Event' : 'Edit Event'}</Title>

        {error && (
          <Alert message="Error" description={error} type="error" showIcon closable className="mb-4" />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={handleFormValuesChange}
          initialValues={{ published: true }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Event Title"
                name="title"
                rules={[{ required: true, message: 'Please enter event title' }]}
              >
                <Input placeholder="Santo Nino Novena Mass" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Slug"
                name="slug"
                rules={[
                  { required: true, message: 'Please enter slug' },
                  { pattern: /^[a-z0-9-]+$/, message: 'Slug must be lowercase with hyphens' }
                ]}
              >
                <Input placeholder="santo-nino-novena-mass" size="large" disabled={!isNew} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Event Type"
                name="type"
                rules={[{ required: true, message: 'Please select event type' }]}
              >
                <Select
                  value={eventType}
                  onChange={handleTypeChange}
                  size="large"
                  disabled={!isNew}
                  options={[
                    { label: 'Recurring Event', value: 'recurring' },
                    { label: 'Dated Event', value: 'dated' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Published" name="published" valuePropName="checked">
                <Switch checkedChildren="Published" unCheckedChildren="Draft" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Schedule Information</Divider>

          {eventType === 'recurring' ? (
            <>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Recurrence Pattern"
                    name="recurrence"
                    rules={[{ required: true, message: 'Please enter recurrence pattern' }]}
                    help="Auto-generated from the recurrence rule below"
                  >
                    <Input placeholder="Every First and Third Friday of the Month" size="large" disabled />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Time"
                    name="time"
                    rules={[{ required: true, message: 'Please enter time' }]}
                  >
                    <Input placeholder="7:30 PM" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item
                    label="Recurrence Rule (Visual Builder)"
                    name="rrule"
                  >
                    <RRuleBuilder />
                  </Form.Item>
                </Col>
              </Row>
            </>
          ) : (
            <>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Start Date"
                    name="start_date"
                    rules={[{ required: true, message: 'Please enter start date' }]}
                  >
                    <Input placeholder="January 9, 2026" size="large" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="End Date"
                    name="end_date"
                    rules={[{ required: true, message: 'Please enter end date' }]}
                  >
                    <Input placeholder="January 17, 2026" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Rosary Time" name="rosary_time">
                    <Input placeholder="6:30 pm" size="large" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Parking Info" name="parking_info">
                    <Input placeholder="Free parking at Wilson's Carpark" size="large" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Divider>Location</Divider>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Venue"
                name="venue"
                rules={[{ required: true, message: 'Please enter venue' }]}
              >
                <Input placeholder="St Benedicts Church" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Address"
                name="address"
                rules={[{ required: true, message: 'Please enter address' }]}
              >
                <Input placeholder="1 Saint Benedicts Street, Eden Terrace, Auckland 1010" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Event Description (Markdown)" name="content">
            <TextArea
              rows={6}
              placeholder="Additional event details in markdown format..."
            />
          </Form.Item>

          {eventType === 'dated' && (
            <>
              <Divider>Event Schedule (Days)</Divider>
              <EventDaysEditor days={days} onChange={setDays} />
            </>
          )}

          {eventType === 'recurring' && !isNew && event && (
            <>
              <Divider>Suspension Dates</Divider>
              <EventSuspensionsEditor
                eventId={event.id}
                suspensions={suspensions}
                onChange={setSuspensions}
              />
            </>
          )}

          <Form.Item className="mt-6">
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
                size="large"
              >
                {isNew ? 'Create Event' : 'Update Event'}
              </Button>
              <Button
                icon={<CloseCircleOutlined />}
                onClick={onCancel}
                size="large"
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
