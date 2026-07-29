export type EventStatus = 'draft' | 'published' | 'live' | 'ended'
export type EventType = 'closed' | 'open'
export type EmailTheme = 'classic' | 'boarding_pass' | 'minimal_mono' | 'luxe_dark' | 'bold_poster' | 'horizontal_pass'
export type InvitationStatus = 'pending' | 'active' | 'cancelled' | 'checked_in' | 'expired'
export type RegistrationStatus = 'pending' | 'accepted' | 'rejected' | 'waitlist'
export type AttendeeSource = 'imported' | 'public_registration' | 'manual'

export interface AgendaItem {
  id: string
  time: string
  title: string
  description?: string
  speaker?: string
}

export interface SpeakerInfo {
  id: string
  name: string
  role: string
  company?: string
  avatar_url?: string
  bio?: string
}

export interface FAQItem {
  id: string
  question: string
  answer: string
}

export interface Event {
  id: string
  organizer_id: string
  name: string
  date: string
  time: string | null
  venue: string
  description: string | null
  capacity: number | null
  status: EventStatus
  event_type: EventType
  registration_slug: string | null
  max_registrations: number | null
  banner_url?: string | null
  sender_profile_id?: string | null
  email_theme?: EmailTheme
  timezone: string // default 'Africa/Lagos'
  agenda?: AgendaItem[] | null
  speakers?: SpeakerInfo[] | null
  faqs?: FAQItem[] | null
  location_url?: string | null
  created_at: string
  updated_at: string
}

export interface Attendee {
  id: string
  event_id: string
  name: string
  email: string | null
  phone: string | null
  source: AttendeeSource
  registration_status: RegistrationStatus | null
  ticket_tier_id: string | null
  created_at: string
}

export interface Invitation {
  id: string
  event_id: string
  attendee_id: string
  party_size: number
  seat_info: string | null
  status: InvitationStatus
  ticket_tier_id: string | null
  payment_reference: string | null
  qr_token: string
  checked_in_at: string | null
  checked_in_by: string | null
  created_at: string
  attendee?: Attendee
}

export interface TicketTier {
  id: string
  event_id: string
  name: string
  price: number // stored in kobo (NGN)
  capacity: number | null
  is_public: boolean
  currency: string
  deleted_at: string | null
  created_at: string
}

export interface TierPerk {
  id: string
  tier_id: string
  label: string
  icon: string | null
  sort_order: number | null
  created_at: string
}

export interface InvitationAuditLog {
  id: string
  invitation_id: string
  changed_by: string | null
  old_status: InvitationStatus | null
  new_status: InvitationStatus | null
  old_tier_id: string | null
  new_tier_id: string | null
  reason: string | null
  created_at: string
}

export interface ScannerLink {
  id: string
  event_id: string
  token: string
  label: string
  is_active: boolean
  created_at: string
}

export interface EntryLog {
  id: string
  invitation_id: string
  scanner_link_id: string | null
  scanned_at: string
  notes: string | null
  invitation?: Invitation & { attendee?: Attendee }
}

export interface EmailLog {
  id: string
  event_id: string
  recipient_email: string
  email_type: 'invitation' | 'reminder'
  subject: string | null
  sent_at: string
  // Tracking (populated by Resend webhooks)
  resend_email_id: string | null
  opened_count: number
  clicked_count: number
  first_opened_at: string | null
  first_clicked_at: string | null
  delivered_at: string | null
  bounced_at: string | null
  complained_at: string | null
}

export interface EmailEvent {
  id: string
  email_log_id: string | null
  resend_email_id: string
  event_type: 'email.opened' | 'email.clicked' | 'email.delivered' | 'email.bounced' | 'email.complained'
  click_url: string | null
  created_at: string
}

export interface SenderProfile {
  id: string
  organizer_id: string
  display_name: string   // shown in From: header
  reply_to: string       // organizer's contact email for this brand
  is_default: boolean
  created_at: string
  updated_at: string
}

export type TeamRole = 'owner' | 'viewer' | 'scanner_manager' | 'co_organiser'
export type MemberRole = 'viewer' | 'scanner_manager' | 'co_organiser'

export interface EventMember {
  id: string
  event_id: string
  organizer_id: string
  member_id: string
  role: MemberRole
  invited_by: string
  created_at: string
  // Joined via admin client — populated by getTeamMembers()
  member_email?: string
  member_name?: string
}

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type ClockFormat = '12h' | '24h'

export interface OrganizerSettings {
  id: string
  organizer_id: string
  org_name: string | null
  default_timezone: string
  default_currency: string
  date_format: DateFormat
  clock_format: ClockFormat
  email_footer: string | null
  created_at: string
  updated_at: string
}

// ── Payment types ──────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'abandoned' | 'disputed'
export type PaymentChannel = 'card' | 'bank' | 'ussd' | 'bank_transfer' | 'qr'
export type InvitationPaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed' | 'disputed'

export interface Payment {
  id: string
  event_id: string
  attendee_id: string | null
  ticket_tier_id: string | null
  paystack_reference: string
  paystack_transaction_id: number | null
  amount_kobo: number
  platform_fee_kobo: number | null
  organiser_amount_kobo: number | null
  currency: string
  status: PaymentStatus
  payer_email: string
  payer_name: string | null
  paystack_channel: PaymentChannel | null
  metadata: Record<string, unknown> | null
  webhook_received_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface OrganizerPaymentSettings {
  id: string
  organizer_id: string
  paystack_subaccount_code: string | null
  bank_name: string | null
  bank_code: string | null
  account_number: string | null
  account_name: string | null
  is_verified: boolean
  platform_fee_percent: number
  connected_at: string | null
  created_at: string
  updated_at: string
}

// Paystack webhook payload shapes
export interface PaystackWebhookEvent {
  event:
    | 'charge.success'
    | 'charge.failed'
    | 'refund.processed'
    | 'charge.dispute.create'
    | 'charge.dispute.resolve'
    | 'transfer.reversed'
    | string
  data: {
    id: number
    domain: 'live' | 'test'
    status: 'success' | 'failed' | 'abandoned'
    reference: string
    amount: number        // in kobo
    message: string | null
    gateway_response: string
    paid_at: string | null
    created_at: string
    channel: PaymentChannel
    currency: string
    fees: number          // Paystack's fee in kobo
    customer: {
      id: number
      first_name: string | null
      last_name: string | null
      email: string
      phone: string | null
    }
    metadata?: Record<string, unknown>
    subaccount?: {
      id: number
          amount: number
      account_code: string
    }
  }
}

