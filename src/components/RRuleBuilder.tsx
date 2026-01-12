'use client'

import { useState, useEffect } from 'react'
import { Select, Row, Col, Card, Alert, Space, Tag, Radio } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import { RRule } from 'rrule'
import { format, addMonths } from 'date-fns'

interface RRuleBuilderProps {
  value?: string
  onChange?: (value: string) => void
}

const WEEKDAYS = [
  { label: 'Monday', value: 'MO', short: 'Mon' },
  { label: 'Tuesday', value: 'TU', short: 'Tue' },
  { label: 'Wednesday', value: 'WE', short: 'Wed' },
  { label: 'Thursday', value: 'TH', short: 'Thu' },
  { label: 'Friday', value: 'FR', short: 'Fri' },
  { label: 'Saturday', value: 'SA', short: 'Sat' },
  { label: 'Sunday', value: 'SU', short: 'Sun' },
]

const WEEK_POSITIONS = [
  { label: 'First', value: 1 },
  { label: 'Second', value: 2 },
  { label: 'Third', value: 3 },
  { label: 'Fourth', value: 4 },
  { label: 'Last', value: -1 },
]

export function RRuleBuilder({ value, onChange }: RRuleBuilderProps) {
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY' | 'DAILY'>('MONTHLY')
  const [weeklyDays, setWeeklyDays] = useState<string[]>(['FR'])
  const [monthlyType, setMonthlyType] = useState<'specific' | 'dayOfMonth'>('specific')
  const [monthlyPositions, setMonthlyPositions] = useState<number[]>([1, 3])
  const [monthlyDay, setMonthlyDay] = useState<string>('FR')

  // Parse existing RRULE value when component mounts or value changes
  useEffect(() => {
    if (value) {
      try {
        // Parse the RRULE
        if (value.includes('FREQ=WEEKLY')) {
          setFrequency('WEEKLY')
          const match = value.match(/BYDAY=([A-Z,]+)/)
          if (match) {
            setWeeklyDays(match[1].split(',').filter(d => !d.match(/\d/)))
          }
        } else if (value.includes('FREQ=MONTHLY')) {
          setFrequency('MONTHLY')
          const match = value.match(/BYDAY=([-\d,A-Z]+)/)
          if (match) {
            const bydays = match[1]
            // Check if it has positions like 1FR,3FR
            if (bydays.match(/\d/)) {
              setMonthlyType('specific')
              const positions: number[] = []
              let day = 'FR'
              bydays.split(',').forEach(part => {
                const posMatch = part.match(/(-?\d+)([A-Z]+)/)
                if (posMatch) {
                  positions.push(parseInt(posMatch[1]))
                  day = posMatch[2]
                }
              })
              setMonthlyPositions(positions)
              setMonthlyDay(day)
            }
          }
        } else if (value.includes('FREQ=DAILY')) {
          setFrequency('DAILY')
        }
      } catch (error) {
        console.error('Error parsing RRULE:', error)
      }
    }
  }, [value])

  // Generate RRULE string whenever inputs change
  useEffect(() => {
    let rruleString = ''

    if (frequency === 'DAILY') {
      rruleString = 'FREQ=DAILY'
    } else if (frequency === 'WEEKLY') {
      if (weeklyDays.length > 0) {
        rruleString = `FREQ=WEEKLY;BYDAY=${weeklyDays.join(',')}`
      }
    } else if (frequency === 'MONTHLY') {
      if (monthlyType === 'specific' && monthlyPositions.length > 0) {
        const byday = monthlyPositions.map(pos => `${pos}${monthlyDay}`).join(',')
        rruleString = `FREQ=MONTHLY;BYDAY=${byday}`
      }
    }

    if (rruleString && onChange) {
      onChange(rruleString)
    }
  }, [frequency, weeklyDays, monthlyType, monthlyPositions, monthlyDay, onChange])

  // Generate preview dates
  const previewDates = () => {
    if (!value) return []

    try {
      const rrule = RRule.fromString(`DTSTART:${format(new Date(), 'yyyyMMdd')}T000000Z\nRRULE:${value}`)
      const dates = rrule.between(new Date(), addMonths(new Date(), 3), true)
      return dates.slice(0, 5) // Show first 5 occurrences
    } catch (error) {
      return []
    }
  }

  const handleWeeklyDayToggle = (day: string) => {
    setWeeklyDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day)
      } else {
        return [...prev, day]
      }
    })
  }

  const handleMonthlyPositionToggle = (position: number) => {
    setMonthlyPositions(prev => {
      if (prev.includes(position)) {
        return prev.filter(p => p !== position)
      } else {
        return [...prev, position].sort((a, b) => {
          // Sort with -1 (last) at the end
          if (a === -1) return 1
          if (b === -1) return -1
          return a - b
        })
      }
    })
  }

  return (
    <Card size="small" className="bg-gray-50">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            <CalendarOutlined /> Recurrence Pattern
          </div>
          <Radio.Group
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            buttonStyle="solid"
            size="large"
            style={{ width: '100%' }}
          >
            <Radio.Button value="WEEKLY" style={{ width: '33.33%', textAlign: 'center' }}>
              Weekly
            </Radio.Button>
            <Radio.Button value="MONTHLY" style={{ width: '33.33%', textAlign: 'center' }}>
              Monthly
            </Radio.Button>
            <Radio.Button value="DAILY" style={{ width: '33.33%', textAlign: 'center' }}>
              Daily
            </Radio.Button>
          </Radio.Group>
        </div>

        {frequency === 'WEEKLY' && (
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Select Days</div>
            <Space wrap>
              {WEEKDAYS.map(day => (
                <Tag.CheckableTag
                  key={day.value}
                  checked={weeklyDays.includes(day.value)}
                  onChange={() => handleWeeklyDayToggle(day.value)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: weeklyDays.includes(day.value) ? '2px solid #1890ff' : '2px solid #d9d9d9',
                    backgroundColor: weeklyDays.includes(day.value) ? '#e6f7ff' : 'white',
                  }}
                >
                  {day.short}
                </Tag.CheckableTag>
              ))}
            </Space>
          </div>
        )}

        {frequency === 'MONTHLY' && (
          <>
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>Which Week(s)?</div>
              <Space wrap>
                {WEEK_POSITIONS.map(pos => (
                  <Tag.CheckableTag
                    key={pos.value}
                    checked={monthlyPositions.includes(pos.value)}
                    onChange={() => handleMonthlyPositionToggle(pos.value)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      border: monthlyPositions.includes(pos.value) ? '2px solid #1890ff' : '2px solid #d9d9d9',
                      backgroundColor: monthlyPositions.includes(pos.value) ? '#e6f7ff' : 'white',
                    }}
                  >
                    {pos.label}
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>Which Day?</div>
              <Space wrap>
                {WEEKDAYS.map(day => (
                  <Tag.CheckableTag
                    key={day.value}
                    checked={monthlyDay === day.value}
                    onChange={() => setMonthlyDay(day.value)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      border: monthlyDay === day.value ? '2px solid #1890ff' : '2px solid #d9d9d9',
                      backgroundColor: monthlyDay === day.value ? '#e6f7ff' : 'white',
                    }}
                  >
                    {day.short}
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>
          </>
        )}

        {frequency === 'DAILY' && (
          <Alert
            message="Event occurs every day"
            type="info"
            showIcon
          />
        )}

        {value && (
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Preview (Next 5 Occurrences)</div>
            <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #d9d9d9' }}>
              {previewDates().length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {previewDates().map((date, idx) => (
                    <li key={idx}>{format(date, 'EEEE, MMMM d, yyyy')}</li>
                  ))}
                </ul>
              ) : (
                <span style={{ color: '#8c8c8c' }}>No dates to preview</span>
              )}
            </div>
          </div>
        )}

        <div style={{ fontSize: '12px', color: '#8c8c8c', padding: '8px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
          <strong>Generated RRULE:</strong> <code>{value || 'None'}</code>
        </div>
      </Space>
    </Card>
  )
}
