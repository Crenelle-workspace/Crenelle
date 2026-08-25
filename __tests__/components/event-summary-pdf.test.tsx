import { describe, it, expect } from 'vitest'
import React from 'react'
import { EventSummaryReport } from '@/components/event-summary-pdf'

describe('EventSummaryReport Component', () => {
  it('renders a full report structure with all rich platform features', () => {
    const mockEvent = {
      name: 'Tech Leadership Summit 2026',
      date: '2026-09-15',
      time: '09:00',
      timezone: 'Africa/Lagos',
      venue: 'Landmark Convention Centre, Lagos',
      description: 'Annual gathering for high-growth tech executives.',
      capacity: 500,
      event_type: 'open' as const,
      registration_slug: 'tech-summit-2026',
      auto_approve_registrations: true,
      agenda: [
        {
          id: 'agenda-1',
          time: '09:00 - 10:00',
          title: 'Opening Keynote: The Future of African AI',
          description: 'Overview of agentic intelligence and market opportunities.',
          speaker: 'Dr. Jane Doe',
        },
      ],
      speakers: [
        {
          id: 'spk-1',
          name: 'Dr. Jane Doe',
          role: 'Chief AI Architect',
          company: 'Vertex AI Labs',
          bio: 'Pioneering researcher in LLM efficiency.',
        },
      ],
      registration_questions: [
        {
          id: 'q-1',
          label: 'Dietary Preference',
          type: 'radio',
          options: ['Standard', 'Vegetarian', 'Halal'],
          required: true,
        },
        {
          id: 'q-2',
          label: 'Which sessions interest you?',
          type: 'checkbox',
          options: ['AI Track', 'Product Track', 'Leadership Track'],
          required: false,
        },
        {
          id: 'q-3',
          label: 'What do you hope to gain from this summit?',
          type: 'text',
          required: false,
        },
      ],
    }

    const mockStats = {
      totalSeats: 450,
      totalInvited: 380,
      arrived: 360,
      arrivedSeats: 350,
      pendingSeats: 90,
      arrivalRate: 80,
      peakCheckInTime: '09:30 - 10:00 (142 scans)',
      entranceStats: [
        { label: 'VIP North Entrance', count: 180 },
        { label: 'Main East Gate', count: 180 },
      ],
      recentEntries: [
        {
          guestName: 'Alex Morgan',
          seatInfo: 'VIP Table 4',
          tierName: 'VIP Pass',
          scannedAt: '2026-09-15T09:12:00Z',
          partySize: 2,
          scannerGate: 'VIP North Entrance',
        },
        {
          guestName: 'Sarah Connor',
          seatInfo: 'Row B-12',
          tierName: 'General Admission',
          scannedAt: '2026-09-15T09:14:00Z',
          partySize: 1,
          scannerGate: 'Main East Gate',
        },
      ],
      financials: {
        grossRevenueKobo: 750000000, // NGN 7.5M
        platformFeeKobo: 37500000,
        organiserPayoutKobo: 712500000,
        currency: 'NGN',
        paidTicketsCount: 300,
        freeTicketsCount: 50,
      },
      tierBreakdown: [
        {
          id: 'tier-vip',
          name: 'VIP Pass',
          priceKobo: 5000000, // NGN 50,000
          currency: 'NGN',
          capacity: 100,
          allocatedCount: 95,
          arrivedCount: 90,
          revenueKobo: 475000000,
        },
        {
          id: 'tier-gen',
          name: 'General Admission',
          priceKobo: 1500000, // NGN 15,000
          currency: 'NGN',
          capacity: 350,
          allocatedCount: 255,
          arrivedCount: 260,
          revenueKobo: 275000000,
        },
      ],
      registrationFunnel: {
        totalApplications: 420,
        accepted: 350,
        pending: 30,
        waitlist: 25,
        rejected: 15,
        sources: {
          publicRegistration: 320,
          csvImport: 80,
          manual: 20,
        },
      },
      customQuestions: [
        // radio — rendered as horizontal bar chart (single choice)
        {
          id: 'q-1',
          label: 'Dietary Preference',
          type: 'radio',
          responsesCount: 320,
          topAnswers: [
            { text: 'Standard', count: 210 },
            { text: 'Halal', count: 70 },
            { text: 'Vegetarian', count: 40 },
          ],
        },
        // checkbox — rendered as horizontal bar chart (multi-select)
        {
          id: 'q-2',
          label: 'Which sessions interest you?',
          type: 'checkbox',
          responsesCount: 295,
          topAnswers: [
            { text: 'AI Track', count: 230 },
            { text: 'Leadership Track', count: 180 },
            { text: 'Product Track', count: 120 },
          ],
        },
        // text — rendered with Gemini AI prose summary
        {
          id: 'q-3',
          label: 'What do you hope to gain from this summit?',
          type: 'text',
          responsesCount: 280,
          topAnswers: [],
          aiSummary:
            'Respondents overwhelmingly seek peer networking opportunities and exposure to cutting-edge AI tooling. A strong secondary theme around leadership development and building Africa-focused venture connections emerged across responses.',
        },
      ],
    }

    const reportElement = <EventSummaryReport event={mockEvent} stats={mockStats} />
    expect(reportElement).toBeDefined()
    expect(reportElement.props.document).toBeUndefined() // React PDF Document root element
    expect(reportElement.type).toBe(EventSummaryReport)
  })

  it('renders text question gracefully with fallback list when no aiSummary is available', () => {
    const minimalEvent = {
      name: 'Private Board Dinner',
      date: '2026-10-01',
      time: '19:30',
      venue: 'Private Dining Room 3',
    }

    const statsWithTextNoSummary = {
      totalSeats: 20,
      totalInvited: 20,
      arrived: 18,
      arrivedSeats: 18,
      pendingSeats: 2,
      arrivalRate: 90,
      peakCheckInTime: '19:30 - 20:00 (15 scans)',
      entranceStats: [],
      recentEntries: [],
      customQuestions: [
        {
          id: 'q-fallback',
          label: 'Any special requests?',
          type: 'text',
          responsesCount: 5,
          topAnswers: [
            { text: 'Vegetarian menu please', count: 2 },
            { text: 'Gluten free', count: 1 },
          ],
          // aiSummary intentionally omitted — exercises the fallback plain list path
        },
      ],
    }

    const reportElement = <EventSummaryReport event={minimalEvent} stats={statsWithTextNoSummary} />
    expect(reportElement).toBeDefined()
    expect(reportElement.type).toBe(EventSummaryReport)
  })

  it('renders gracefully for free or private invitation-only events without financial or registration data', () => {
    const minimalEvent = {
      name: 'Private Board Dinner',
      date: '2026-10-01',
      time: '19:30',
      venue: 'Private Dining Room 3',
    }

    const minimalStats = {
      totalSeats: 20,
      totalInvited: 20,
      arrived: 18,
      arrivedSeats: 18,
      pendingSeats: 2,
      arrivalRate: 90,
      peakCheckInTime: '19:30 - 20:00 (15 scans)',
      entranceStats: [],
      recentEntries: [],
    }

    const reportElement = <EventSummaryReport event={minimalEvent} stats={minimalStats} />
    expect(reportElement).toBeDefined()
    expect(reportElement.type).toBe(EventSummaryReport)
  })

  it('handles null event and empty stats safely without throwing', () => {
    const emptyStats = {
      totalSeats: 0,
      totalInvited: 0,
      arrived: 0,
      arrivedSeats: 0,
      pendingSeats: 0,
      arrivalRate: 0,
      peakCheckInTime: 'N/A',
      entranceStats: [],
      recentEntries: [],
    }

    const reportElement = <EventSummaryReport event={null} stats={emptyStats} />
    expect(reportElement).toBeDefined()
  })
})
