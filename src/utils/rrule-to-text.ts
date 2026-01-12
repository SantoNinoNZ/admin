/**
 * Convert RRULE to human-readable text
 */
export function rruleToText(rrule: string): string {
  if (!rrule) return ''

  try {
    // Parse FREQ
    const freqMatch = rrule.match(/FREQ=(\w+)/)
    if (!freqMatch) return ''

    const freq = freqMatch[1]

    if (freq === 'DAILY') {
      return 'Every Day'
    }

    if (freq === 'WEEKLY') {
      const bydayMatch = rrule.match(/BYDAY=([A-Z,]+)/)
      if (bydayMatch) {
        const days = bydayMatch[1].split(',')
        const dayNames = days.map(day => {
          const dayMap: Record<string, string> = {
            'MO': 'Monday',
            'TU': 'Tuesday',
            'WE': 'Wednesday',
            'TH': 'Thursday',
            'FR': 'Friday',
            'SA': 'Saturday',
            'SU': 'Sunday',
          }
          return dayMap[day] || day
        })

        if (dayNames.length === 1) {
          return `Every ${dayNames[0]}`
        } else if (dayNames.length === 7) {
          return 'Every Day'
        } else {
          const lastDay = dayNames.pop()
          return `Every ${dayNames.join(', ')} and ${lastDay}`
        }
      }
    }

    if (freq === 'MONTHLY') {
      const bydayMatch = rrule.match(/BYDAY=([-\d,A-Z]+)/)
      if (bydayMatch) {
        const bydays = bydayMatch[1]

        // Parse positions and day (e.g., "1FR,3FR")
        const parts = bydays.split(',')
        const positions: number[] = []
        let dayOfWeek = ''

        parts.forEach(part => {
          const match = part.match(/(-?\d+)([A-Z]+)/)
          if (match) {
            positions.push(parseInt(match[1]))
            dayOfWeek = match[2]
          }
        })

        if (positions.length === 0) return ''

        const dayMap: Record<string, string> = {
          'MO': 'Monday',
          'TU': 'Tuesday',
          'WE': 'Wednesday',
          'TH': 'Thursday',
          'FR': 'Friday',
          'SA': 'Saturday',
          'SU': 'Sunday',
        }

        const positionMap: Record<number, string> = {
          1: 'First',
          2: 'Second',
          3: 'Third',
          4: 'Fourth',
          5: 'Fifth',
          '-1': 'Last',
        }

        const dayName = dayMap[dayOfWeek] || dayOfWeek
        const positionNames = positions.map(p => positionMap[p]).filter(Boolean)

        if (positionNames.length === 1) {
          return `Every ${positionNames[0]} ${dayName} of the Month`
        } else {
          const lastPosition = positionNames.pop()
          return `Every ${positionNames.join(', ')} and ${lastPosition} ${dayName} of the Month`
        }
      }
    }

    return ''
  } catch (error) {
    console.error('Error converting RRULE to text:', error)
    return ''
  }
}
