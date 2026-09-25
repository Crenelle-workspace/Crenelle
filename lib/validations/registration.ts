/**
 * lib/validations/registration.ts
 *
 * Zod schema for the PUBLIC registration form (app/actions/registrations.ts).
 *
 * These fields arrive from an unauthenticated visitor, so they must be
 * format-checked and length-capped server-side before they reach the DB or are
 * used to build rate-limit keys. Caps mirror the guest-import conventions in
 * lib/validations/guest-import.ts (name 120, email 254, phone 30).
 */
import { z } from 'zod'
import type { RegistrationQuestion } from '@/lib/types'

export const RegistrationInputSchema = z.object({
  /** Required — minimum 2 chars to avoid single-letter "names" */
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name is too long (max 120 characters)')
    .transform((v) => v.trim()),

  /** Required — must be a syntactically valid address, capped at 254 chars */
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(254, 'Email is too long')
    .transform((v) => v.trim().toLowerCase()),

  /** Optional */
  phone: z
    .string()
    .max(30, 'Phone number is too long')
    .optional()
    .nullable()
    .transform((v) => v?.trim() || null),
})

export type RegistrationInput = z.infer<typeof RegistrationInputSchema>

export type RegistrationAnswers = Record<string, string | string[]>

const MAX_ANSWERS_PAYLOAD_BYTES = 32_000
const MAX_TEXT_ANSWER_LENGTH = 2_000

/**
 * Parses and validates custom registration answers against the event's current
 * question definitions. The browser is not trusted: unknown question ids are
 * discarded and choice values must exist in the configured options.
 */
export function validateRegistrationAnswers(
  raw: unknown,
  questions: RegistrationQuestion[],
): { answers: RegistrationAnswers; error?: undefined } | { answers?: undefined; error: string } {
  if (questions.length === 0) return { answers: {} }

  let candidate: unknown = raw
  if (typeof raw === 'string') {
    if (new TextEncoder().encode(raw).length > MAX_ANSWERS_PAYLOAD_BYTES) {
      return { error: 'Registration answers are too large. Please shorten your responses.' }
    }
    try {
      candidate = JSON.parse(raw)
    } catch {
      return { error: 'Invalid form submission. Please refresh and try again.' }
    }
  }

  if (candidate === undefined || candidate === null) candidate = {}
  if (typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { error: 'Invalid form submission. Please refresh and try again.' }
  }

  let serialized: string
  try {
    serialized = JSON.stringify(candidate)
  } catch {
    return { error: 'Invalid form submission. Please refresh and try again.' }
  }
  if (new TextEncoder().encode(serialized).length > MAX_ANSWERS_PAYLOAD_BYTES) {
    return { error: 'Registration answers are too large. Please shorten your responses.' }
  }

  const supplied = candidate as Record<string, unknown>
  const answers: RegistrationAnswers = {}

  for (const question of questions) {
    const value = supplied[question.id]

    if (question.type === 'checkbox') {
      if (value !== undefined && !Array.isArray(value)) {
        return { error: `Invalid answer for: ${question.label}` }
      }

      const selected = (Array.isArray(value) ? value : []).filter(
        (item): item is string => typeof item === 'string',
      )
      if ((Array.isArray(value) ? value.length : 0) !== selected.length) {
        return { error: `Invalid answer for: ${question.label}` }
      }

      const allowed = new Set(question.options ?? [])
      if (selected.some((item) => !allowed.has(item))) {
        return { error: `Invalid answer for: ${question.label}` }
      }
      if (question.required && selected.length === 0) {
        return { error: `Please answer the required question: ${question.label}` }
      }
      if (selected.length > 0) answers[question.id] = selected
      continue
    }

    if (value !== undefined && typeof value !== 'string') {
      return { error: `Invalid answer for: ${question.label}` }
    }

    const answer = typeof value === 'string' ? value.trim() : ''
    if (question.required && answer.length === 0) {
      return { error: `Please answer the required question: ${question.label}` }
    }
    if (answer.length > MAX_TEXT_ANSWER_LENGTH) {
      return { error: `Answer for ${question.label} is too long.` }
    }
    if (question.type === 'radio' && answer.length > 0 && !(question.options ?? []).includes(answer)) {
      return { error: `Invalid answer for: ${question.label}` }
    }
    if (answer.length > 0) answers[question.id] = answer
  }

  return { answers }
}
