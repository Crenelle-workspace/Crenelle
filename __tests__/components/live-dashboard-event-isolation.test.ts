import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dashboardSource = readFileSync(
  resolve(process.cwd(), 'app/(dashboard)/events/[id]/dashboard/dashboard-client.tsx'),
  'utf8'
)

describe('live dashboard event isolation', () => {
  it('scopes entry logs to the event in the current route', () => {
    const query = dashboardSource.match(
      /\.from\('entry_logs'\)[\s\S]*?\.order\('scanned_at', \{ ascending: false \}\)/
    )?.[0]

    expect(query).toBeDefined()
    expect(query).toContain('invitation:invitations!inner')
    expect(query).toContain('event_id')
    expect(query).toContain(".eq('invitation.event_id', eventId)")
  })
})
