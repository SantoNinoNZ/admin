'use client'

import { useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse as dateParse, startOfWeek, getDay, addMonths, isBefore, isAfter, isWithinInterval } from 'date-fns'
import { RRule } from 'rrule'
import type { Event as EventType, RecurringEvent, DatedEvent, EventSuspension } from '@/types/events'
import { Card } from 'antd'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-US': require('date-fns/locale/en-US'),
}

const localizer = dateFnsLocalizer({
  format,
  parse: dateParse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: {
    event: EventType
    isSuspended?: boolean
    type: 'recurring' | 'dated' | 'suspension'
  }
}

interface EventCalendarViewProps {
  events: EventType[]
}

export function EventCalendarView({ events }: EventCalendarViewProps) {
  const calendarEvents = useMemo(() => {
    const result: CalendarEvent[] = []
    const now = new Date()
    const sixMonthsFromNow = addMonths(now, 6)

    events.forEach(event => {
      if (event.type === 'recurring') {
        const recurringEvent = event as RecurringEvent

        // Parse RRULE if available
        if (recurringEvent.rrule) {
          try {
            // Parse the RRULE
            const rrule = RRule.fromString(`DTSTART:${format(now, 'yyyyMMdd')}T000000Z\nRRULE:${recurringEvent.rrule}`)

            // Generate occurrences for the next 6 months
            const occurrences = rrule.between(now, sixMonthsFromNow, true)

            // Get suspensions for this event
            const suspensions = recurringEvent.suspensions || []

            occurrences.forEach(occurrence => {
              // Check if this occurrence is suspended
              const isSuspended = suspensions.some(suspension => {
                const suspensionStart = new Date(suspension.startDate)
                const suspensionEnd = new Date(suspension.endDate)
                return isWithinInterval(occurrence, { start: suspensionStart, end: suspensionEnd })
              })

              // Parse time (e.g., "7:30 PM")
              const timeParts = recurringEvent.time.match(/(\d+):(\d+)\s*(AM|PM)/i)
              let eventDate = occurrence
              if (timeParts) {
                let hours = parseInt(timeParts[1])
                const minutes = parseInt(timeParts[2])
                const isPM = timeParts[3].toUpperCase() === 'PM'

                if (isPM && hours !== 12) hours += 12
                if (!isPM && hours === 12) hours = 0

                eventDate = new Date(occurrence)
                eventDate.setHours(hours, minutes, 0, 0)
              }

              const endDate = new Date(eventDate)
              endDate.setHours(endDate.getHours() + 2) // Assume 2 hour duration

              result.push({
                id: `${event.id}-${occurrence.getTime()}`,
                title: isSuspended ? `[SUSPENDED] ${event.title}` : event.title,
                start: eventDate,
                end: endDate,
                allDay: false,
                resource: {
                  event,
                  isSuspended,
                  type: 'recurring'
                }
              })
            })

            // Add suspension periods as separate calendar entries
            suspensions.forEach(suspension => {
              const suspensionStart = new Date(suspension.startDate)
              const suspensionEnd = new Date(suspension.endDate)

              // Only show suspensions within our date range
              if (isBefore(suspensionStart, sixMonthsFromNow) && isAfter(suspensionEnd, now)) {
                result.push({
                  id: `suspension-${event.id}-${suspension.id}`,
                  title: `⛔ ${event.title} - ${suspension.reason || 'Suspended'}`,
                  start: suspensionStart,
                  end: new Date(suspensionEnd.getTime() + 24 * 60 * 60 * 1000), // Add 1 day for end
                  allDay: true,
                  resource: {
                    event,
                    type: 'suspension'
                  }
                })
              }
            })
          } catch (error) {
            console.error(`Error parsing RRULE for ${event.slug}:`, error)
          }
        } else {
          // No RRULE - just show a placeholder on the first day of next month
          const nextMonth = addMonths(now, 1)
          nextMonth.setDate(1)

          result.push({
            id: `${event.id}-placeholder`,
            title: `${event.title} (${recurringEvent.recurrence})`,
            start: nextMonth,
            end: nextMonth,
            allDay: true,
            resource: {
              event,
              type: 'recurring'
            }
          })
        }
      } else {
        // Dated event
        const datedEvent = event as DatedEvent

        try {
          const startDate = dateParse(datedEvent.start_date, 'MMMM d, yyyy', new Date())
          const endDate = dateParse(datedEvent.end_date, 'MMMM d, yyyy', new Date())

          // Add 1 day to end date for proper display
          const displayEndDate = new Date(endDate)
          displayEndDate.setDate(displayEndDate.getDate() + 1)

          result.push({
            id: event.id,
            title: event.title,
            start: startDate,
            end: displayEndDate,
            allDay: true,
            resource: {
              event,
              type: 'dated'
            }
          })
        } catch (error) {
          console.error(`Error parsing dates for ${event.slug}:`, error)
        }
      }
    })

    return result
  }, [events])

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad'
    let borderColor = '#265985'

    if (event.resource.type === 'suspension') {
      backgroundColor = '#ff4d4f'
      borderColor = '#cf1322'
    } else if (event.resource.type === 'recurring') {
      if (event.resource.isSuspended) {
        backgroundColor = '#8c8c8c'
        borderColor = '#595959'
      } else {
        backgroundColor = '#52c41a'
        borderColor = '#389e0d'
      }
    } else if (event.resource.type === 'dated') {
      backgroundColor = '#1890ff'
      borderColor = '#096dd9'
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        borderRadius: '4px',
        border: `2px solid ${borderColor}`,
      }
    }
  }

  return (
    <Card>
      <div style={{ height: '700px' }}>
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day']}
          defaultView="month"
        />
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#52c41a', borderRadius: '4px' }}></div>
          <span>Recurring Event</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#1890ff', borderRadius: '4px' }}></div>
          <span>Dated Event</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#8c8c8c', borderRadius: '4px' }}></div>
          <span>Suspended Occurrence</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#ff4d4f', borderRadius: '4px' }}></div>
          <span>Suspension Period</span>
        </div>
      </div>
    </Card>
  )
}
