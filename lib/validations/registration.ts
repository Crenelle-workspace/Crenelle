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
