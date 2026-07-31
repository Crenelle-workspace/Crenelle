import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PaymentSettingsForm } from './payment-settings-form'
import type { OrganizerPaymentSettings } from '@/lib/types'

export const metadata = {
  title: 'Payment Settings — Crenelle',
  description: 'Connect your bank account to receive payouts from paid events.',
}

export default async function PaymentsSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch existing payment settings
  const { data: settings } = await supabase
    .from('organizer_payment_settings')
    .select('*')
    .eq('organizer_id', user.id)
    .maybeSingle()

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-sans text-xl font-semibold tracking-tight text-foreground mb-1">
          Payment Settings
        </h1>
        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide">
          Connect your Nigerian bank account to receive payouts from paid tickets. Settlement is T+1 (next business day).
        </p>
      </div>

      <PaymentSettingsForm settings={settings as OrganizerPaymentSettings | null} />
    </div>
  )
}
