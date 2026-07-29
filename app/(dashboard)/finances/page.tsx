import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinancesClient } from './finances-client'

export const metadata = {
  title: 'Finances & Payouts — Crenelle',
  description: 'View your event earnings, ticket revenue breakdown, and bank payouts.',
}

export default async function FinancesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <FinancesClient />
    </div>
  )
}
