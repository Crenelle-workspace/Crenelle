/**
 * Convert the value stored by an HTML time input into a readable 12-hour time.
 * The stored value remains unchanged for forms, calendar exports, and APIs.
 */
export function formatEventTime(time: string | null | undefined): string {
  if (!time) return ''

  const trimmed = time.trim()
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(trimmed)
  if (!match) return time

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return time

  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  return `${displayHour}:${match[2]} ${period}`
}
