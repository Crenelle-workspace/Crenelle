import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

interface AiSummaryRequestBody {
  questionId: string
  questionLabel: string
  answers: Array<{ text: string; count: number }>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

    // ── Auth: only the event organiser can call this ────────────────────────
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the authenticated user owns this event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, organizer_id, status')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Parse request body ──────────────────────────────────────────────────
    const body = (await request.json()) as AiSummaryRequestBody
    const { questionLabel, answers } = body

    if (!questionLabel || !answers || answers.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const totalResponses = answers.reduce((sum, a) => sum + a.count, 0)

    // ── Build a tight prompt with the aggregated digest ─────────────────────
    const answersDigest = answers
      .slice(0, 20) // cap at 20 unique answers to keep prompt tiny
      .map((a) => `- "${a.text}" (${a.count} respondent${a.count !== 1 ? 's' : ''})`)
      .join('\n')

    const prompt = `You are an event intelligence analyst writing for a post-event executive report.

Question asked to registrants: "${questionLabel}"
Total responses: ${totalResponses}

Top answers received:
${answersDigest}

Write a concise, insightful 2–3 sentence summary of what these responses reveal about the registrant audience. Use a professional, editorial tone. Do not use bullet points. Do not repeat the question. Focus on patterns, sentiment, or actionable insight.`

    // ── Call Gemini ─────────────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI features are not configured on this server.' },
        { status: 503 }
      )
    }

    const ai = new GoogleGenAI({ apiKey })
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    })

    const summary = result.text?.trim() ?? ''

    if (!summary) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 })
    }

    return NextResponse.json({ summary })
  } catch (err) {
    console.error('[ai-summary] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
