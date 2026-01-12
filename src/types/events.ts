// Event types matching Supabase database schema

export type EventType = 'recurring' | 'dated'

export interface EventDay {
  id?: string
  dayNumber: number
  date: string // e.g., "Friday, 9 January 2026"
  choir: string
  sponsorsPilgrims: string
  areaCoordinators: string
}

export interface EventSuspension {
  id?: string
  startDate: string // Date in YYYY-MM-DD format
  endDate: string // Date in YYYY-MM-DD format
  reason?: string
}

export interface BaseEvent {
  id: string
  slug: string
  title: string
  type: EventType
  venue: string
  address: string
  content?: string
  published: boolean
  created_at: string
  updated_at: string
  created_by?: string
  last_modified_by?: string

  // Author information (from view)
  creator_email?: string
  creator_name?: string
  creator_avatar?: string
  last_modified_by_email?: string
  last_modified_by_name?: string
  last_modified_by_avatar?: string
}

export interface RecurringEvent extends BaseEvent {
  type: 'recurring'
  recurrence: string // e.g., "Every First and Third Friday of the Month"
  time: string // e.g., "7:30 PM"
  suspensions?: EventSuspension[]

  // These should be null for recurring events
  start_date?: never
  end_date?: never
  rosary_time?: never
  parking_info?: never
  days?: never
}

export interface DatedEvent extends BaseEvent {
  type: 'dated'
  start_date: string // e.g., "January 9, 2026"
  end_date: string
  rosary_time?: string
  parking_info?: string
  days: EventDay[]

  // These should be null for dated events
  recurrence?: never
  time?: never
  suspensions?: never
}

export type Event = RecurringEvent | DatedEvent

// Type guards
export function isRecurringEvent(event: Event): event is RecurringEvent {
  return event.type === 'recurring'
}

export function isDatedEvent(event: Event): event is DatedEvent {
  return event.type === 'dated'
}

// Create/Update DTOs
export interface CreateRecurringEventDTO {
  slug: string
  title: string
  type: 'recurring'
  recurrence: string
  time: string
  venue: string
  address: string
  content?: string
  published?: boolean
}

export interface CreateDatedEventDTO {
  slug: string
  title: string
  type: 'dated'
  start_date: string
  end_date: string
  venue: string
  address: string
  rosary_time?: string
  parking_info?: string
  content?: string
  published?: boolean
  days: Omit<EventDay, 'id'>[]
}

export type CreateEventDTO = CreateRecurringEventDTO | CreateDatedEventDTO

export interface UpdateRecurringEventDTO extends Partial<CreateRecurringEventDTO> {
  id: string
}

export interface UpdateDatedEventDTO extends Partial<Omit<CreateDatedEventDTO, 'days'>> {
  id: string
  days?: Omit<EventDay, 'id'>[]
}

export type UpdateEventDTO = UpdateRecurringEventDTO | UpdateDatedEventDTO
