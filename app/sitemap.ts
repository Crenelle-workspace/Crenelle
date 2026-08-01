import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

// Public events change independently of deploys, so regenerate hourly.
export const revalidate = 3600

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crenelle.org'

/** Registration pages for every public, non-draft open event. */
async function getEventEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createAdminClient()
    const { data: events } = await supabase
      .from('events')
      .select('registration_slug, updated_at')
      .eq('event_type', 'open')
      .neq('status', 'draft')
      .not('registration_slug', 'is', null)

    if (!events) return []

    return events
      .filter((e) => e.registration_slug)
      .map((e) => ({
        url: `${baseUrl}/register/${e.registration_slug}`,
        lastModified: e.updated_at ? new Date(e.updated_at) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      }))
  } catch {
    // Never let a DB hiccup break sitemap generation — serve static routes.
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  const eventRoutes = await getEventEntries()
  return [...staticRoutes, ...eventRoutes]
}
