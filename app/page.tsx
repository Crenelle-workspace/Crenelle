import { createClient } from '@/lib/supabase/server'
import { LandingPageClient } from './landing-page-client'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <LandingPageClient user={user} />
}
