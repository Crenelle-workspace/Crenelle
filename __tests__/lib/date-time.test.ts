import { describe, expect, it } from 'vitest'
import { formatEventTime } from '@/lib/date-time'

describe('formatEventTime', () => {
  it.each([
    ['00:00', '12:00 AM'],
    ['09:15', '9:15 AM'],
    ['12:00', '12:00 PM'],
    ['18:30', '6:30 PM'],
    ['23:59:00', '11:59 PM'],
  ])('formats %s as %s', (stored, displayed) => {
    expect(formatEventTime(stored)).toBe(displayed)
  })

  it('handles an unset time without inventing a value', () => {
    expect(formatEventTime(null)).toBe('')
    expect(formatEventTime(undefined)).toBe('')
  })

  it('leaves malformed or out-of-range values unchanged', () => {
    expect(formatEventTime('evening')).toBe('evening')
    expect(formatEventTime('25:00')).toBe('25:00')
  })
})
