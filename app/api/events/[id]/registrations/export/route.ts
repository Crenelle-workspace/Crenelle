import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'
import type { RegistrationQuestion } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface AttendeeDbRow {
  id: string
  name: string
  email: string
  phone: string | null
  registration_status: 'pending' | 'accepted' | 'rejected' | 'waitlist'
  created_at: string
  ticket_tier_id: string | null
}

interface TierDbRow {
  id: string
  name: string
  price: number
  currency: string
}

interface PaymentDbRow {
  attendee_id: string
  status: string
  created_at: string
}

interface AnswerDbRow {
  attendee_id: string
  answers: Record<string, string | string[]>
}

/**
 * GET /api/events/[id]/registrations/export
 *
 * Query params:
 *   - format: 'csv' | 'xlsx' | 'excel' (default 'csv')
 *   - status: 'all' | 'pending' | 'accepted' | 'rejected' | 'waitlist' (default 'all')
 *
 * Exports all registrants and their answers to custom questions.
 * Auth: Event owner or authorized team member.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
  }

  const formatParam = (request.nextUrl.searchParams.get('format') || 'csv').toLowerCase()
  const isExcel = formatParam === 'xlsx' || formatParam === 'excel' || formatParam === 'xls'
  const statusFilter = request.nextUrl.searchParams.get('status') || 'all'

  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()

  try {
    // 2. Authorize user for this event
    const { data: event, error: eventError } = await adminSupabase
      .from('events')
      .select('id, organizer_id, name, registration_questions, date, timezone')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const isOrganizer = event.organizer_id === user.id
    if (!isOrganizer) {
      const { data: membership } = await adminSupabase
        .from('event_members')
        .select('id')
        .eq('event_id', eventId)
        .eq('member_id', user.id)
        .maybeSingle()

      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 3. Fetch all public registrants, tiers, payments, and answers
    let attendeeQuery = adminSupabase
      .from('attendees')
      .select('id, name, email, phone, registration_status, created_at, ticket_tier_id')
      .eq('event_id', eventId)
      .eq('source', 'public_registration')
      .order('created_at', { ascending: true })

    if (statusFilter !== 'all') {
      attendeeQuery = attendeeQuery.eq('registration_status', statusFilter)
    }

    const [
      { data: attendees, error: attendeesError },
      { data: tiers, error: tiersError },
      { data: payments, error: paymentsError },
      { data: answersData, error: answersError },
    ] = await Promise.all([
      attendeeQuery,
      adminSupabase
        .from('ticket_tiers')
        .select('id, name, price, currency')
        .eq('event_id', eventId),
      adminSupabase
        .from('payments')
        .select('attendee_id, status, created_at')
        .eq('event_id', eventId),
      adminSupabase
        .from('registration_answers')
        .select('attendee_id, answers')
        .eq('event_id', eventId),
    ])

    if (attendeesError) throw attendeesError
    if (tiersError) throw tiersError
    if (paymentsError) throw paymentsError
    if (answersError) throw answersError

    // Map helpers
    const tierMap = new Map<string, TierDbRow>()
    ;((tiers ?? []) as TierDbRow[]).forEach((t) => tierMap.set(t.id, t))

    const paymentsByAttendee = new Map<string, PaymentDbRow[]>()
    ;((payments ?? []) as PaymentDbRow[]).forEach((p) => {
      if (!p.attendee_id) return
      const existing = paymentsByAttendee.get(p.attendee_id) ?? []
      existing.push(p)
      paymentsByAttendee.set(p.attendee_id, existing)
    })

    const answersMap = new Map<string, Record<string, string | string[]>>()
    ;((answersData ?? []) as AnswerDbRow[]).forEach((a) => {
      answersMap.set(a.attendee_id, a.answers || {})
    })

    const questions = ((event.registration_questions as RegistrationQuestion[]) || [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    // Build tabular headers
    const baseHeaders = [
      'Full Name',
      'Email',
      'Phone',
      'Status',
      'Ticket Tier',
      'Payment Status',
      'Registered At',
    ]

    const questionHeaders = questions.map((q) => q.label || 'Question')
    const allHeaders = [...baseHeaders, ...questionHeaders]

    // Build rows
    const rows = ((attendees ?? []) as AttendeeDbRow[]).map((a) => {
      const tier = a.ticket_tier_id ? tierMap.get(a.ticket_tier_id) : null
      const tierLabel = tier ? tier.name : 'Free / Standard'

      // Resolve payment status
      const attPayments = paymentsByAttendee.get(a.id) ?? []
      let paymentLabel = 'Unpaid'
      if (attPayments.some((p) => p.status === 'paid')) {
        paymentLabel = 'Paid'
      } else if (attPayments.some((p) => p.status === 'pending')) {
        paymentLabel = 'Pending'
      } else if (tier && tier.price === 0) {
        paymentLabel = 'Free'
      } else if (attPayments.length > 0) {
        paymentLabel = attPayments[0].status.charAt(0).toUpperCase() + attPayments[0].status.slice(1)
      } else if (!tier || tier.price === 0) {
        paymentLabel = 'Free'
      }

      const formattedDate = new Date(a.created_at).toISOString().replace('T', ' ').slice(0, 19)
      const userAnswers = answersMap.get(a.id) || {}

      const questionAnswers = questions.map((q) => {
        const val = userAnswers[q.id]
        if (Array.isArray(val)) {
          return val.join('; ')
        }
        if (val !== undefined && val !== null) {
          return String(val)
        }
        return ''
      })

      return [
        a.name || 'Unknown',
        a.email || '',
        a.phone || '',
        a.registration_status ? a.registration_status.toUpperCase() : 'PENDING',
        tierLabel,
        paymentLabel,
        formattedDate,
        ...questionAnswers,
      ]
    })

    const safeSlug = (event.name || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const dateStr = new Date().toISOString().slice(0, 10)

    // ── Export Format: Excel (SpreadsheetML XML) ───────────────────────────
    if (isExcel) {
      const escapeXML = (val: unknown): string => {
        if (val === null || val === undefined) return ''
        return String(val)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;')
      }

      const xmlRows = rows
        .map(
          (row) =>
            `      <Row ss:AutoFitHeight="0">\n` +
            row
              .map(
                (cell) =>
                  `        <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXML(cell)}</Data></Cell>`
              )
              .join('\n') +
            `\n      </Row>`
        )
        .join('\n')

      const xmlHeaderRow =
        `      <Row ss:AutoFitHeight="0" ss:Height="22">\n` +
        allHeaders
          .map(
            (h) =>
              `        <Cell ss:StyleID="HeaderCell"><Data ss:Type="String">${escapeXML(h)}</Data></Cell>`
          )
          .join('\n') +
        `\n      </Row>`

      const excelXML = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>${escapeXML(event.name)} - Registrations</Title>
    <Author>Crenelle</Author>
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" />
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#171512" />
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid" />
    </Style>
    <Style ss:ID="HeaderCell">
      <Alignment ss:Vertical="Center" ss:Horizontal="Left" ss:WrapText="1" />
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#171512" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BF8430" />
      </Borders>
    </Style>
    <Style ss:ID="DataCell">
      <Alignment ss:Vertical="Center" ss:Horizontal="Left" ss:WrapText="1" />
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#171512" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EAE7E0" />
      </Borders>
    </Style>
  </Styles>
  <Worksheet ss:Name="Registrations">
    <Table ss:DefaultColumnWidth="140" ss:DefaultRowHeight="20">
${xmlHeaderRow}
${xmlRows}
    </Table>
  </Worksheet>
</Workbook>`

      const filename = `${safeSlug}-registrations-${dateStr}.xls`
      return new NextResponse(excelXML, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // ── Export Format: CSV (with UTF-8 BOM) ────────────────────────────────
    const escapeCSV = (val: unknown): string => {
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvHeader = allHeaders.map(escapeCSV).join(',')
    const csvDataRows = rows.map((r) => r.map(escapeCSV).join(',')).join('\n')
    // Prepend UTF-8 BOM (\uFEFF) for clean unicode opening in Excel & Numbers
    const csvContent = `\uFEFF${csvHeader}\n${csvDataRows}`

    const filename = `${safeSlug}-registrations-${dateStr}.csv`
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { eventId, context: 'registrations_export_route' } })
    return NextResponse.json({ error: 'Failed to generate export file' }, { status: 500 })
  }
}
