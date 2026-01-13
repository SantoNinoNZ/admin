'use client'

import { useState, useEffect } from 'react'
import { supabaseAPI } from '@/lib/supabase-api'
import type { Event, CreateEventDTO, UpdateEventDTO } from '@/types/events'
import { EventEditor } from '@/components/EventEditor'
import { EventList } from '@/components/EventList'
import { EventCalendarView } from '@/components/EventCalendarView'
import { Button, Spin, Alert, Typography, Segmented } from 'antd'
import { PlusOutlined, CalendarOutlined, UnorderedListOutlined } from '@ant-design/icons'

const { Title } = Typography

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await supabaseAPI.getEvents()
      setEvents(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load events'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEvent = async (eventData: CreateEventDTO | UpdateEventDTO) => {
    if ('id' in eventData) {
      await supabaseAPI.updateEvent(eventData.id, eventData)
    } else {
      await supabaseAPI.createEvent(eventData)
    }
    await loadEvents()
    setSelectedEvent(null)
    setIsCreating(false)
  }

  const handleCancelEvent = () => {
    setSelectedEvent(null)
    setIsCreating(false)
  }

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event)
    setIsCreating(false)
  }

  const handleDeleteEvent = async (event: Event) => {
    await supabaseAPI.deleteEvent(event.id)
    await loadEvents()
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>
  }

  if (error && events.length === 0) {
    return <Alert message="Error" description={error} type="error" showIcon closable />
  }

  if (selectedEvent || isCreating) {
    return <EventEditor event={selectedEvent || undefined} isNew={isCreating} onSave={handleSaveEvent} onCancel={handleCancelEvent} />
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Events</Title>
            <p style={{ margin: 0, color: '#666' }}>Manage your events ({events.length} total)</p>
          </div>
          <Segmented
            value={view}
            onChange={(value) => setView(value as 'list' | 'calendar')}
            options={[
              { label: 'List', value: 'list', icon: <UnorderedListOutlined /> },
              { label: 'Calendar', value: 'calendar', icon: <CalendarOutlined /> },
            ]}
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreating(true)} size="large">
          New Event
        </Button>
      </div>

      {view === 'list' ? (
        <EventList events={events} onEdit={handleEditEvent} onDelete={handleDeleteEvent} />
      ) : (
        <EventCalendarView events={events} />
      )}
    </>
  )
}
