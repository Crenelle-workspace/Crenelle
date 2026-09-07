import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { RevenueStats } from '@/lib/supabase/revenue-stats'

export interface AdminRevenuePDFProps {
  stats: RevenueStats
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    color: '#0C0B09',
  },
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
    color: '#BF8430', // Crenelle Copper
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
    gap: 16,
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
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
    fontSize: 13,
    color: '#0C0B09',
  },
  kpiValueEmerald: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: '#10B981', // Emerald
  },
  kpiValueCopper: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: '#BF8430', // Copper
  },
  kpiSub: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: '#6E6A62',
    marginTop: 3,
  },
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
  disclaimerBox: {
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    borderLeftWidth: 3,
    borderLeftColor: '#BF8430',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  disclaimerTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#BF8430',
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  disclaimerText: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#6E6A62',
    lineHeight: 1.3,
  },
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

function formatMoney(kobo: number, currency: string = 'NGN'): string {
  const major = Math.round(kobo / 100)
  return `${currency} ${major.toLocaleString('en-NG')}`
}

export function AdminRevenueReport({ stats }: AdminRevenuePDFProps) {
  const fromFormatted = new Date(stats.dateRange.from).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const toFormatted = new Date(stats.dateRange.to).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Document title="Crenelle Executive Revenue Report" author="Crenelle Admin">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTag}>CRENELLE // EXECUTIVE FINANCIAL REPORT</Text>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{stats.currency} CURRENCY</Text>
            </View>
          </View>
          <Text style={styles.title}>Platform Revenue & Income</Text>
          <View style={styles.metaBar}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>PERIOD:</Text>
              <Text style={styles.metaValue}>
                {fromFormatted} – {toFormatted}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>GENERATED:</Text>
              <Text style={styles.metaValue}>
                {new Date(stats.fetchedAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 1: Executive KPI Cards */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Financial Performance Overview</Text>
          </View>
          <Text style={styles.sectionSubtext}>Current Selected Period Summary</Text>
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>GROSS MERCHANDISE (GMV)</Text>
            <Text style={styles.kpiValueEmerald}>{formatMoney(stats.totals.gmvKobo, stats.currency)}</Text>
            <Text style={styles.kpiSub}>{stats.totals.transactionCount} successful payments</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>CRENELLE REVENUE</Text>
            <Text style={styles.kpiValueCopper}>
              {formatMoney(stats.totals.platformFeeKobo, stats.currency)}
            </Text>
            <Text style={styles.kpiSub}>Platform take fee</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ORGANIZER PAYOUTS</Text>
            <Text style={styles.kpiValue}>{formatMoney(stats.totals.organiserPayoutKobo, stats.currency)}</Text>
            <Text style={styles.kpiSub}>Disbursed to organizers</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ESTIMATED VAT (7.5%)</Text>
            <Text style={styles.kpiValue}>{formatMoney(stats.taxEstimate.vatEstimateKobo, stats.currency)}</Text>
            <Text style={styles.kpiSub}>On platform fee revenue</Text>
          </View>
        </View>

        {/* Section 2: 6-Month Monthly Trend */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>6-Month Revenue Trend</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>MONTH</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'center' }]}>TXNS</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>GMV</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>PLATFORM REVENUE</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>ORGANIZER PAYOUTS</Text>
          </View>

          {stats.monthlyTrend.map((row, idx) => (
            <View
              key={row.month}
              style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
            >
              <Text style={[styles.tableCellBold, { width: '22%' }]}>{row.label}</Text>
              <Text style={[styles.tableCell, { width: '18%', textAlign: 'center' }]}>
                {row.transactionCount}
              </Text>
              <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                {formatMoney(row.gmvKobo, stats.currency)}
              </Text>
              <Text style={[styles.tableCellCopper, { width: '20%', textAlign: 'right' }]}>
                {formatMoney(row.platformFeeKobo, stats.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                {formatMoney(row.organiserPayoutKobo, stats.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Section 3: Top Earning Events */}
        {stats.topEvents.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>Top Revenue Generating Events</Text>
              </View>
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '38%' }]}>EVENT</Text>
                <Text style={[styles.tableHeaderCell, { width: '16%', textAlign: 'center' }]}>TICKETS</Text>
                <Text style={[styles.tableHeaderCell, { width: '23%', textAlign: 'right' }]}>GROSS GMV</Text>
                <Text style={[styles.tableHeaderCell, { width: '23%', textAlign: 'right' }]}>CRENELLE FEE</Text>
              </View>

              {stats.topEvents.map((evt, idx) => (
                <View
                  key={evt.eventId}
                  style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
                >
                  <Text style={[styles.tableCellBold, { width: '38%' }]}>{evt.eventTitle}</Text>
                  <Text style={[styles.tableCell, { width: '16%', textAlign: 'center' }]}>
                    {evt.ticketsSold}
                  </Text>
                  <Text style={[styles.tableCell, { width: '23%', textAlign: 'right' }]}>
                    {formatMoney(evt.gmvKobo, evt.currency)}
                  </Text>
                  <Text style={[styles.tableCellCopper, { width: '23%', textAlign: 'right' }]}>
                    {formatMoney(evt.platformFeeKobo, evt.currency)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Tax Disclaimer Box */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>Tax & Statutory Disclaimer</Text>
          <Text style={styles.disclaimerText}>{stats.taxEstimate.disclaimer}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>CRENELLE INC • CONFIDENTIAL FINANCIAL STATEMENT</Text>
          <Text style={styles.footerPageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
