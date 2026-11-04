'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SectionHeader } from '@/components/section-header'
import { EmailThemePicker } from '@/components/email-theme-picker'
import { ReadOnlyPill } from '@/components/read-only-pill'
import type { EmailTheme } from '@/lib/types'

export default function EmailClient({ eventId, canEdit = true }: { eventId: string; canEdit?: boolean }) {
  const [emailTheme, setEmailTheme] = useState<EmailTheme>('classic')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTheme() {
      const supabase = createClient()
      const { data } = await supabase
        .from('events')
        .select('email_theme')
        .eq('id', eventId)
        .single()

      if (data?.email_theme) {
        setEmailTheme(data.email_theme as EmailTheme)
      }
      setLoading(false)
    }

    void loadTheme()
  }, [eventId])

  if (loading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse">
        <div className="border-b-2 border-foreground/20 pb-6">
          <SectionHeader
            eyebrow="Email Invitations"
            title="Email Themes"
            subtitle="Loading theme options…"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-foreground/20 pb-6">
        <SectionHeader
          eyebrow="Email Invitations"
          title="Email Themes"
          subtitle="Customize the visual template and theme for ticket entry passes sent to your guests"
        />
        {!canEdit && (
          <ReadOnlyPill mode="preview" label="THEMES // PREVIEW MODE" />
        )}
      </div>

      {/* Theme Picker Section */}
      <EmailThemePicker eventId={eventId} currentTheme={emailTheme} canEdit={canEdit} />
    </div>
  )
}
