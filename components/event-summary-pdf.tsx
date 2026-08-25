import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export interface EventSummaryReportProps {
  event: {
    name: string
    date: string
    time: string | null
    timezone?: string
    venue: string
    description?: string | null
    capacity?: number | null
    event_type?: 'open' | 'closed'
    registration_slug?: string | null
    auto_approve_registrations?: boolean
    agenda?: Array<{
      id: string
      time: string
      title: string
      description?: string
      speaker?: string
    }> | null
    speakers?: Array<{
      id: string
      name: string
      role: string
      company?: string
      bio?: string
    }> | null
    registration_questions?: Array<{
      id: string
      label: string
      type: string
      options?: string[]
      required?: boolean
    }> | null
  } | null
  stats: {
    totalSeats: number
    totalInvited: number
    arrived: number
    arrivedSeats: number
    pendingSeats: number
    arrivalRate: number
    capacityUtilization?: number
    peakCheckInTime: string
    entranceStats: Array<{ label: string; count: number; percentage?: number }>
    recentEntries: Array<{
      guestName: string
      seatInfo: string | null
      tierName?: string | null
      scannedAt: string
      partySize: number
      scannerGate?: string | null
    }>
    financials?: {
      grossRevenueKobo: number
      platformFeeKobo: number
      organiserPayoutKobo: number
      currency: string
      paidTicketsCount: number
      freeTicketsCount: number
    }
    tierBreakdown?: Array<{
      id: string
      name: string
      priceKobo: number
      currency: string
      capacity: number | null
      allocatedCount: number
      arrivedCount: number
      revenueKobo: number
    }>
    registrationFunnel?: {
      totalApplications: number
      accepted: number
      pending: number
      waitlist: number
      rejected: number
      sources: {
        publicRegistration: number
        csvImport: number
        manual: number
      }
    }
    customQuestions?: Array<{
      id: string
      label: string
      type: string
      responsesCount: number
      topAnswers?: Array<{ text: string; count: number }>
      aiSummary?: string  // Gemini-generated prose for 'text' type questions
    }>
  }
}

// ── Crenelle Luxury Editorial PDF Design System ────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    color: '#0C0B09',
  },
  // Top Banner & Branding
  header: {
    marginBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0C0B09',
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandTag: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#BF8430', // Crenelle Signature Copper
    letterSpacing: 1.5,
  },
  badgePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    backgroundColor: '#FAF9F6',
  },
  badgeText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#171512',
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 20,
    color: '#0C0B09',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  metaBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#8A847C',
    marginRight: 4,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#171512',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4DC',
    paddingBottom: 4,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionAccentBar: {
    width: 3,
    height: 10,
    backgroundColor: '#BF8430',
    marginRight: 6,
    borderRadius: 1,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#0C0B09',
  },
  sectionSubtext: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#8A847C',
  },

  // KPI Scorecard Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  kpiCard: {
    width: '23.5%',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    borderRadius: 6,
    padding: 8,
  },
  kpiLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    textTransform: 'uppercase',
    color: '#8A847C',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  kpiValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#0C0B09',
    letterSpacing: -0.2,
  },
  kpiValueEmerald: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#10B981', // Vibrant Emerald (AGENTS.md)
  },
  kpiValueCopper: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#BF8430', // Crenelle Copper
  },
  kpiValueCoral: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#EF4444', // Vibrant Coral (AGENTS.md)
  },
  kpiSub: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: '#6E6A62',
    marginTop: 3,
    lineHeight: 1.2,
  },

  // Two Column Container
  twoCol: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  col: {
    flex: 1,
  },

  // Tables
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F3EE',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4DC',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    textTransform: 'uppercase',
    color: '#6E6A62',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#FAF9F6',
  },
  tableCell: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#171512',
  },
  tableCellBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#0C0B09',
  },
  tableCellMuted: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#8A847C',
  },
  tableCellEmerald: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#10B981',
  },
  tableCellCopper: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#BF8430',
  },

  // Gate Progress Rows
  gateItem: {
    marginBottom: 6,
  },
  gateMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  gateLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#171512',
  },
  gateCount: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#BF8430',
  },
  progressBarBg: {
    width: '100%',
    height: 4.5,
    backgroundColor: '#E8E4DC',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#BF8430',
    borderRadius: 2,
  },

  // Registration Funnel Pill Card
  funnelRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  funnelCard: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
  },
  funnelLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    textTransform: 'uppercase',
    color: '#8A847C',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  funnelValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#0C0B09',
  },

  // Agenda & Speaker List
  agendaItem: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
  },
  agendaTimeBadge: {
    width: 65,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#BF8430',
  },
  agendaContent: {
    flex: 1,
  },
  agendaTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#0C0B09',
  },
  agendaSpeaker: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#6E6A62',
    marginTop: 1,
  },

  speakerCard: {
    width: '48%',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
  },
  speakerName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#0C0B09',
  },
  speakerRole: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#BF8430',
    marginTop: 1,
  },

  // Custom Questions Grid
  questionBox: {
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    borderRadius: 6,
    padding: 7,
    marginBottom: 6,
  },
  questionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#0C0B09',
    marginBottom: 5,
  },
  questionTypeBadge: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    letterSpacing: 0.5,
    color: '#8A847C',
    marginBottom: 4,
  },
  // Bar chart rows (radio / checkbox)
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 5,
  },
  chartBarLabel: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: '#171512',
    width: '38%',
  },
  chartBarTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#E8E4DC',
    borderRadius: 2,
    overflow: 'hidden',
  },
  chartBarFillCopper: {
    height: '100%',
    backgroundColor: '#BF8430',
    borderRadius: 2,
  },
  chartBarCount: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    color: '#6E6A62',
    width: '16%',
    textAlign: 'right',
  },
  // AI Summary box (text questions)
  aiSummaryBox: {
    backgroundColor: '#F5F3EE',
    borderLeftWidth: 2,
    borderLeftColor: '#BF8430',
    paddingVertical: 5,
    paddingHorizontal: 7,
    marginTop: 2,
    borderRadius: 2,
  },
  aiSummaryLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    color: '#BF8430',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  aiSummaryText: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#171512',
    lineHeight: 1.45,
  },
  answerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1.5,
  },
  answerText: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#6E6A62',
  },
  answerCount: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#BF8430',
  },

  // Dynamic Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#E8E4DC',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBrand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#8A847C',
    letterSpacing: 0.8,
  },
  footerPageNum: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: '#8A847C',
  },
})

// Currency Formatter Helper
function formatCurrency(kobo: number, currency: string = 'NGN'): string {
  const major = Math.round(kobo / 100)
  return `${currency} ${major.toLocaleString('en-NG')}`
}

export function EventSummaryReport({ event, stats }: EventSummaryReportProps) {
  const formattedDate = event?.date
    ? new Date(event.date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A'

  const safeArrivalRate = Math.min(100, Math.max(0, stats.arrivalRate))
  const safePendingSeats = Math.max(0, stats.pendingSeats)
  const safeNoShowRate = Math.max(0, 100 - safeArrivalRate)

  const totalCapacity = event?.capacity && event.capacity > 0
    ? Math.max(event.capacity, stats.totalSeats, stats.arrived)
    : (stats.totalSeats > 0 ? stats.totalSeats : null)

  const capacityPct = totalCapacity && totalCapacity > 0
    ? Math.min(100, Math.round((stats.arrived / totalCapacity) * 100))
    : null

  const isPaidEvent = Boolean(stats.financials && stats.financials.grossRevenueKobo > 0)
  const hasTierData = Boolean(stats.tierBreakdown && stats.tierBreakdown.length > 0)
  const hasFunnelData = Boolean(stats.registrationFunnel && stats.registrationFunnel.totalApplications > 0)
  const hasAgenda = Boolean(event?.agenda && event.agenda.length > 0)
  const hasSpeakers = Boolean(event?.speakers && event.speakers.length > 0)
  const hasQuestions = Boolean(stats.customQuestions && stats.customQuestions.length > 0)

  return (
    <Document title={`${event?.name || 'Event'} - Executive Summary`} author="Crenelle">
      {/* ── PAGE 1: Executive Overview, Financials & Attendance Intelligence ── */}
      <Page size="A4" style={styles.page}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTag}>CRENELLE // EXECUTIVE POST-EVENT INTELLIGENCE</Text>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>
                {event?.event_type === 'open' ? 'OPEN REGISTRATION' : 'PRIVATE INVITATION'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{event?.name || 'Untitled Event'}</Text>
          <View style={styles.metaBar}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>DATE:</Text>
              <Text style={styles.metaValue}>{formattedDate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>TIME:</Text>
              <Text style={styles.metaValue}>
                {event?.time || 'N/A'} {event?.timezone ? `(${event.timezone})` : ''}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>VENUE:</Text>
              <Text style={styles.metaValue}>{event?.venue || 'N/A'}</Text>
            </View>
            {totalCapacity ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>CAPACITY:</Text>
                <Text style={styles.metaValue}>{totalCapacity} Seats</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Section 1: Executive KPIs Scorecard */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Executive Scorecard</Text>
          </View>
          <Text style={styles.sectionSubtext}>Key Performance & Attendance Metrics</Text>
        </View>

        <View style={styles.kpiGrid}>
          {/* KPI 1: Attendance Rate */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ATTENDANCE RATE</Text>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValueEmerald}>{safeArrivalRate}%</Text>
            </View>
            <Text style={styles.kpiSub}>
              {stats.arrivedSeats} of {stats.totalInvited} invited checked in
            </Text>
          </View>

          {/* KPI 2: Total Admitted */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL ADMITTED</Text>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>{stats.arrived}</Text>
              <Text style={styles.tableCellMuted}>guests</Text>
            </View>
            <Text style={styles.kpiSub}>
              {capacityPct !== null ? `${capacityPct}% venue capacity reached` : `${stats.totalSeats} total seats`}
            </Text>
          </View>

          {/* KPI 3: Revenue or No-shows */}
          <View style={styles.kpiCard}>
            {isPaidEvent && stats.financials ? (
              <>
                <Text style={styles.kpiLabel}>GROSS REVENUE</Text>
                <View style={styles.kpiValueRow}>
                  <Text style={styles.kpiValueCopper}>
                    {formatCurrency(stats.financials.grossRevenueKobo, stats.financials.currency)}
                  </Text>
                </View>
                <Text style={styles.kpiSub}>
                  Payout: {formatCurrency(stats.financials.organiserPayoutKobo, stats.financials.currency)}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.kpiLabel}>NO-SHOWS</Text>
                <View style={styles.kpiValueRow}>
                  <Text style={styles.kpiValueCoral}>{safePendingSeats}</Text>
                  <Text style={styles.tableCellMuted}>seats</Text>
                </View>
                <Text style={styles.kpiSub}>
                  {safeNoShowRate}% pending invitations
                </Text>
              </>
            )}
          </View>

          {/* KPI 4: Peak Check-in Velocity */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>PEAK CHECK-IN</Text>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>{stats.peakCheckInTime.split(' (')[0]}</Text>
            </View>
            <Text style={styles.kpiSub}>
              {stats.peakCheckInTime.includes('(')
                ? stats.peakCheckInTime.substring(stats.peakCheckInTime.indexOf('('))
                : 'Highest 30-min window'}
            </Text>
          </View>
        </View>

        {/* Section 2: Ticket Tiers & Financial Performance (If configured) */}
        {hasTierData && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>Ticket Tiers & Revenue Breakdown</Text>
              </View>
              {stats.financials ? (
                <Text style={styles.sectionSubtext}>
                  {stats.financials.paidTicketsCount} Paid • {stats.financials.freeTicketsCount} Free
                </Text>
              ) : null}
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '28%' }]}>TIER NAME</Text>
                <Text style={[styles.tableHeaderCell, { width: '18%' }]}>PRICE</Text>
                <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'center' }]}>ALLOCATED</Text>
                <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'center' }]}>ADMITTED</Text>
                <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'right' }]}>REVENUE</Text>
              </View>

              {stats.tierBreakdown?.map((tier, index) => {
                const turnOut = tier.allocatedCount > 0
                  ? Math.round((tier.arrivedCount / tier.allocatedCount) * 100)
                  : 0
                return (
                  <View
                    key={tier.id}
                    style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
                  >
                    <Text style={[styles.tableCellBold, { width: '28%' }]}>{tier.name}</Text>
                    <Text style={[styles.tableCell, { width: '18%' }]}>
                      {tier.priceKobo > 0 ? formatCurrency(tier.priceKobo, tier.currency) : 'Free'}
                    </Text>
                    <Text style={[styles.tableCell, { width: '18%', textAlign: 'center' }]}>
                      {tier.allocatedCount} {tier.capacity ? `/ ${tier.capacity}` : ''}
                    </Text>
                    <Text style={[styles.tableCellEmerald, { width: '18%', textAlign: 'center' }]}>
                      {tier.arrivedCount} ({turnOut}%)
                    </Text>
                    <Text style={[styles.tableCellCopper, { width: '18%', textAlign: 'right' }]}>
                      {tier.revenueKobo > 0 ? formatCurrency(tier.revenueKobo, tier.currency) : '—'}
                    </Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Section 3: Registration Funnel & Gate Logistics */}
        <View style={styles.twoCol}>
          {/* Column 1: Public Registration Pipeline */}
          <View style={styles.col}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>Registration Pipeline</Text>
              </View>
            </View>

            {hasFunnelData && stats.registrationFunnel ? (
              <>
                <View style={styles.funnelRow}>
                  <View style={styles.funnelCard}>
                    <Text style={styles.funnelLabel}>ACCEPTED</Text>
                    <Text style={[styles.funnelValue, { color: '#10B981' }]}>
                      {stats.registrationFunnel.accepted}
                    </Text>
                  </View>
                  <View style={styles.funnelCard}>
                    <Text style={styles.funnelLabel}>PENDING</Text>
                    <Text style={[styles.funnelValue, { color: '#D97706' }]}>
                      {stats.registrationFunnel.pending}
                    </Text>
                  </View>
                  <View style={styles.funnelCard}>
                    <Text style={styles.funnelLabel}>WAITLIST</Text>
                    <Text style={styles.funnelValue}>
                      {stats.registrationFunnel.waitlist}
                    </Text>
                  </View>
                  <View style={styles.funnelCard}>
                    <Text style={styles.funnelLabel}>REJECTED</Text>
                    <Text style={[styles.funnelValue, { color: '#EF4444' }]}>
                      {stats.registrationFunnel.rejected}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: '#6E6A62', lineHeight: 1.3 }}>
                  Source: {stats.registrationFunnel.sources.publicRegistration} via Web Portal •{' '}
                  {stats.registrationFunnel.sources.csvImport} via CSV Import •{' '}
                  {stats.registrationFunnel.sources.manual} Direct Additions
                </Text>
              </>
            ) : (
              <View style={[styles.kpiCard, { width: '100%' }]}>
                <Text style={styles.kpiLabel}>INVITATION DISTRIBUTION</Text>
                <Text style={{ fontFamily: 'Helvetica', fontSize: 7.5, color: '#171512', lineHeight: 1.4 }}>
                  Total Invitations: {stats.totalInvited}{'\n'}
                  Checked-in Seats: {stats.arrived}{'\n'}
                  No-show Rate: {safeNoShowRate}%
                </Text>
              </View>
            )}
          </View>

          {/* Column 2: Entrance Gate Logistics */}
          <View style={styles.col}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>Entrance Gate Traffic</Text>
              </View>
            </View>

            {stats.entranceStats.length === 0 ? (
              <Text style={{ fontFamily: 'Helvetica', fontSize: 7.5, color: '#8A847C', marginTop: 4 }}>
                No entrance scan data recorded
              </Text>
            ) : (
              stats.entranceStats.map((gate) => {
                const gatePct = stats.arrived > 0 ? Math.round((gate.count / stats.arrived) * 100) : 0
                return (
                  <View key={gate.label} style={styles.gateItem}>
                    <View style={styles.gateMeta}>
                      <Text style={styles.gateLabel}>{gate.label.toUpperCase()}</Text>
                      <Text style={styles.gateCount}>
                        {gate.count} scans ({gatePct}%)
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${gatePct}%` }]} />
                    </View>
                  </View>
                )
              })
            )}
          </View>
        </View>

        {/* Section 4: Recent Arrivals Ledger (Top 8 for Page 1) */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Recent Admissions Audit Log</Text>
          </View>
          <Text style={styles.sectionSubtext}>Timestamped Door Scanner Entries</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '32%' }]}>GUEST NAME</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>TIER / SEAT</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>TIME</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>GATE</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>PARTY</Text>
          </View>

          {stats.recentEntries.length === 0 ? (
            <View style={{ padding: 10 }}>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 7.5, color: '#8A847C', textAlign: 'center' }}>
                No arrivals recorded yet
              </Text>
            </View>
          ) : (
            stats.recentEntries.slice(0, 8).map((entry, index) => (
              <View
                key={index}
                style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
              >
                <Text style={[styles.tableCellBold, { width: '32%' }]}>{entry.guestName}</Text>
                <Text style={[styles.tableCellMuted, { width: '22%' }]}>
                  {entry.tierName || entry.seatInfo || 'Standard'}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {new Date(entry.scannedAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </Text>
                <Text style={[styles.tableCellMuted, { width: '16%' }]}>
                  {entry.scannerGate || 'Main Gate'}
                </Text>
                <Text style={[styles.tableCellEmerald, { width: '10%', textAlign: 'right' }]}>
                  {entry.partySize > 1 ? `+${entry.partySize}` : '1'}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Dynamic Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>CRENELLE INTELLIGENCE // EVENT PERFORMANCE REPORT</Text>
          <Text
            style={styles.footerPageNum}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ── PAGE 2: Program Lineup, Speakers & Custom Survey Insights (If data exists) ── */}
      {(hasAgenda || hasSpeakers || hasQuestions || stats.recentEntries.length > 8) && (
        <Page size="A4" style={styles.page}>
          {/* Header on Page 2 */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.brandTag}>CRENELLE // PRODUCTION DETAILS & INSIGHTS</Text>
              <Text style={styles.badgeText}>{event?.name || 'Untitled Event'}</Text>
            </View>
          </View>

          {/* Agenda Schedule */}
          {hasAgenda && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleWrap}>
                  <View style={styles.sectionAccentBar} />
                  <Text style={styles.sectionTitle}>Event Schedule & Agenda</Text>
                </View>
              </View>

              <View style={{ marginBottom: 12 }}>
                {event?.agenda?.map((item) => (
                  <View key={item.id} style={styles.agendaItem}>
                    <Text style={styles.agendaTimeBadge}>{item.time}</Text>
                    <View style={styles.agendaContent}>
                      <Text style={styles.agendaTitle}>{item.title}</Text>
                      {item.speaker ? (
                        <Text style={styles.agendaSpeaker}>Speaker: {item.speaker}</Text>
                      ) : null}
                      {item.description ? (
                        <Text style={styles.tableCellMuted}>{item.description}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Featured Speakers */}
          {hasSpeakers && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleWrap}>
                  <View style={styles.sectionAccentBar} />
                  <Text style={styles.sectionTitle}>Featured Speakers & Keynotes</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {event?.speakers?.map((s) => (
                  <View key={s.id} style={styles.speakerCard}>
                    <Text style={styles.speakerName}>{s.name}</Text>
                    <Text style={styles.speakerRole}>
                      {s.role} {s.company ? `• ${s.company}` : ''}
                    </Text>
                    {s.bio ? (
                      <Text style={[styles.tableCellMuted, { marginTop: 2 }]}>
                        {s.bio.slice(0, 120)}{s.bio.length > 120 ? '...' : ''}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Custom Questions / Form Responses Insights */}
          {hasQuestions && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleWrap}>
                  <View style={styles.sectionAccentBar} />
                  <Text style={styles.sectionTitle}>Custom Registration Question Responses</Text>
                </View>
              </View>

              <View style={{ marginBottom: 12 }}>
                {stats.customQuestions?.map((q) => {
                  const isChoice = q.type === 'radio' || q.type === 'checkbox'
                  const isText = q.type === 'text'
                  const topCount = q.topAnswers?.[0]?.count ?? 1

                  return (
                    <View key={q.id} style={styles.questionBox}>
                      {/* Question header */}
                      <Text style={styles.questionTitle}>
                        {q.label} ({q.responsesCount} responses)
                      </Text>
                      <Text style={styles.questionTypeBadge}>
                        {isChoice
                          ? (q.type === 'checkbox' ? 'MULTI-SELECT' : 'SINGLE CHOICE')
                          : 'SHORT ANSWER'}
                      </Text>

                      {/* Radio / Checkbox — bar chart */}
                      {isChoice && q.topAnswers && q.topAnswers.length > 0 && (
                        <View>
                          {q.topAnswers.map((ans, aIdx) => {
                            const pct = Math.round((ans.count / topCount) * 100)
                            const displayPct = q.responsesCount > 0
                              ? Math.round((ans.count / q.responsesCount) * 100)
                              : 0
                            return (
                              <View key={aIdx} style={styles.chartRow}>
                                <Text style={styles.chartBarLabel}>
                                  {ans.text.length > 30 ? `${ans.text.slice(0, 28)}…` : ans.text}
                                </Text>
                                <View style={styles.chartBarTrack}>
                                  <View
                                    style={[
                                      styles.chartBarFillCopper,
                                      { width: `${pct}%` },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.chartBarCount}>
                                  {ans.count} ({displayPct}%)
                                </Text>
                              </View>
                            )
                          })}
                        </View>
                      )}

                      {/* Text — AI prose summary */}
                      {isText && (
                        <View style={styles.aiSummaryBox}>
                          <Text style={styles.aiSummaryLabel}>AI INSIGHT</Text>
                          {q.aiSummary ? (
                            <Text style={styles.aiSummaryText}>{q.aiSummary}</Text>
                          ) : (
                            // Graceful fallback: top answers as plain list
                            (q.topAnswers ?? []).map((ans, aIdx) => (
                              <View key={aIdx} style={styles.answerRow}>
                                <Text style={styles.answerText}>• {ans.text}</Text>
                                <Text style={styles.answerCount}>{ans.count}</Text>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            </>
          )}

          {/* Additional Recent Arrivals (if more than 8) */}
          {stats.recentEntries.length > 8 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleWrap}>
                  <View style={styles.sectionAccentBar} />
                  <Text style={styles.sectionTitle}>Extended Arrivals Log</Text>
                </View>
              </View>

              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '32%' }]}>GUEST NAME</Text>
                  <Text style={[styles.tableHeaderCell, { width: '22%' }]}>TIER / SEAT</Text>
                  <Text style={[styles.tableHeaderCell, { width: '20%' }]}>TIME</Text>
                  <Text style={[styles.tableHeaderCell, { width: '16%' }]}>GATE</Text>
                  <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>PARTY</Text>
                </View>

                {stats.recentEntries.slice(8, 20).map((entry, index) => (
                  <View
                    key={index}
                    style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
                  >
                    <Text style={[styles.tableCellBold, { width: '32%' }]}>{entry.guestName}</Text>
                    <Text style={[styles.tableCellMuted, { width: '22%' }]}>
                      {entry.tierName || entry.seatInfo || 'Standard'}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {new Date(entry.scannedAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </Text>
                    <Text style={[styles.tableCellMuted, { width: '16%' }]}>
                      {entry.scannerGate || 'Main Gate'}
                    </Text>
                    <Text style={[styles.tableCellEmerald, { width: '10%', textAlign: 'right' }]}>
                      {entry.partySize > 1 ? `+${entry.partySize}` : '1'}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Dynamic Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>CRENELLE INTELLIGENCE // EVENT PERFORMANCE REPORT</Text>
            <Text
              style={styles.footerPageNum}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      )}
    </Document>
  )
}
