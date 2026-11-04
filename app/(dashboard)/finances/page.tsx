import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinancesClient } from './finances-client'

export const metadata = {
  title: 'Finances & Payouts',
  description: 'View your event earnings, ticket revenue breakdown, and bank payouts.',
}

export default async function FinancesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="w-full">
      <FinancesClient />
    </div>
  )
}
