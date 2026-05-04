import { Database } from './database.types'

export type PrayerRequest = Database['public']['Tables']['prayer_requests']['Row']
export type HomeVisitRequest = Database['public']['Tables']['home_visit_requests']['Row']
export type ContactMessage = Database['public']['Tables']['contact_messages']['Row']

export type PrayerRequestStatus = 'new' | 'praying' | 'completed'
export type HomeVisitStatus = 'new' | 'confirmed' | 'completed' | 'cancelled'
export type ContactMessageStatus = 'new' | 'read' | 'replied'
