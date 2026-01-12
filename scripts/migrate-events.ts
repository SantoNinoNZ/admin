/**
 * Migration script to import events from YAML/Markdown files into Supabase
 * Run this once after the database migration is complete
 *
 * Usage: npx tsx scripts/migrate-events.ts
 */

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local (fallback to .env)
config({ path: '.env.local' })
config({ path: '.env' })

// Configure Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Path to events files
const EVENTS_WEB_PATH = join('C:', 'Projects', 'santoninonz-web', 'public', 'events')

// Events to migrate (from events-index.yaml)
const events = [
  {
    slug: 'santo-nino-novena-mass',
    filename: 'santo-nino-novena-mass.md'
  },
  {
    slug: 'santo-nino-fiesta-2025',
    filename: 'santo-nino-fiesta-2025.md'
  },
  {
    slug: 'santo-nino-fiesta-2026',
    filename: 'santo-nino-fiesta-2026.md'
  },
  {
    slug: 'santo-nino-fiesta-celebration-2026',
    filename: 'santo-nino-fiesta-celebration-2026.md'
  }
]

interface EventData {
  title: string
  type: 'recurring' | 'dated'
  slug: string
  venue: string
  address: string
  content: string

  // Recurring event fields
  recurrence?: string
  time?: string

  // Dated event fields
  startDate?: string
  endDate?: string
  rosaryTime?: string
  parkingInfo?: string
  days?: Array<{
    dayNumber: number
    date: string
    choir: string
    sponsorsPilgrims: string
    areaCoordinators: string
  }>
}

function parseMarkdownFile(filePath: string): EventData {
  const fileContent = readFileSync(filePath, 'utf-8')

  // Split frontmatter and content
  const parts = fileContent.split('---')
  if (parts.length < 3) {
    throw new Error(`Invalid markdown format in ${filePath}`)
  }

  const frontMatter = yaml.load(parts[1]) as any
  const content = parts.slice(2).join('---').trim()

  return {
    ...frontMatter,
    content
  }
}

async function migrateEvent(eventInfo: { slug: string; filename: string }) {
  console.log(`\nMigrating event: ${eventInfo.slug}`)

  const filePath = join(EVENTS_WEB_PATH, eventInfo.filename)

  try {
    const eventData = parseMarkdownFile(filePath)

    console.log(`  Type: ${eventData.type}`)
    console.log(`  Title: ${eventData.title}`)

    // Check if event already exists
    const { data: existingEvent } = await supabase
      .from('events')
      .select('id')
      .eq('slug', eventData.slug)
      .maybeSingle()

    if (existingEvent) {
      console.log(`  ⚠️  Event already exists, skipping...`)
      return
    }

    // Prepare event data
    const eventRecord: any = {
      slug: eventData.slug,
      title: eventData.title,
      type: eventData.type,
      venue: eventData.venue,
      address: eventData.address,
      content: eventData.content,
      published: true
    }

    if (eventData.type === 'recurring') {
      eventRecord.recurrence = eventData.recurrence
      eventRecord.time = eventData.time
    } else if (eventData.type === 'dated') {
      eventRecord.start_date = eventData.startDate
      eventRecord.end_date = eventData.endDate
      eventRecord.rosary_time = eventData.rosaryTime
      eventRecord.parking_info = eventData.parkingInfo
    }

    // Insert main event record
    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert(eventRecord)
      .select()
      .single()

    if (eventError) {
      console.error(`  ❌ Failed to insert event:`, eventError.message)
      return
    }

    console.log(`  ✅ Event created with ID: ${newEvent.id}`)

    // If it's a dated event, insert days
    if (eventData.type === 'dated' && eventData.days && eventData.days.length > 0) {
      const daysToInsert = eventData.days.map((day) => ({
        event_id: newEvent.id,
        day_number: day.dayNumber,
        date: day.date,
        choir: day.choir,
        sponsors_pilgrims: day.sponsorsPilgrims,
        area_coordinators: day.areaCoordinators
      }))

      const { error: daysError } = await supabase
        .from('event_days')
        .insert(daysToInsert)

      if (daysError) {
        console.error(`  ❌ Failed to insert event days:`, daysError.message)
        // Rollback: delete the event
        await supabase.from('events').delete().eq('id', newEvent.id)
        return
      }

      console.log(`  ✅ Inserted ${eventData.days.length} event days`)
    }

    console.log(`  ✅ Migration complete for ${eventInfo.slug}`)
  } catch (error: any) {
    console.error(`  ❌ Error migrating event:`, error.message)
  }
}

async function main() {
  console.log('========================================')
  console.log('Events Migration Script')
  console.log('========================================')
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log(`Events to migrate: ${events.length}`)
  console.log('========================================')

  for (const event of events) {
    await migrateEvent(event)
  }

  console.log('\n========================================')
  console.log('Migration Complete!')
  console.log('========================================')

  // Optional: Add a suspension example for the recurring event
  console.log('\n📌 Recommended next step:')
  console.log('Add a suspension to santo-nino-novena-mass for the fiesta period:')
  console.log('  - Start Date: 2026-01-09')
  console.log('  - End Date: 2026-01-17')
  console.log('  - Reason: Santo Nino Fiesta 2026')
  console.log('\nYou can do this via the admin panel once it\'s built.')
}

main().catch(console.error)
