import { describe, expect, it } from 'vitest'
import { validateRegistrationAnswers } from '@/lib/validations/registration'
import type { RegistrationQuestion } from '@/lib/types'

const questions: RegistrationQuestion[] = [
  { id: 'q-text', label: 'What do you do?', type: 'text', required: true, sort_order: 0 },
  {
    id: 'q-radio',
    label: 'Choose a track',
    type: 'radio',
    required: true,
    options: ['Engineering', 'Design'],
    sort_order: 1,
  },
  {
    id: 'q-checkbox',
    label: 'Select interests',
    type: 'checkbox',
    required: false,
    options: ['AI', 'Security'],
    sort_order: 2,
  },
]

describe('validateRegistrationAnswers', () => {
  it('accepts and normalises configured answers', () => {
    expect(validateRegistrationAnswers({
      'q-text': '  Software engineer  ',
      'q-radio': 'Engineering',
      'q-checkbox': ['AI', 'Security'],
    }, questions)).toEqual({
      answers: {
        'q-text': 'Software engineer',
        'q-radio': 'Engineering',
        'q-checkbox': ['AI', 'Security'],
      },
    })
  })

  it('parses the JSON string used by the free-registration action', () => {
    expect(validateRegistrationAnswers(JSON.stringify({
      'q-text': 'Founder',
      'q-radio': 'Design',
    }), questions)).toEqual({
      answers: { 'q-text': 'Founder', 'q-radio': 'Design' },
    })
  })

  it('rejects missing required answers', () => {
    expect(validateRegistrationAnswers({
      'q-text': '',
      'q-radio': 'Engineering',
    }, questions)).toEqual({
      error: 'Please answer the required question: What do you do?',
    })
  })

  it('rejects choices not configured on the event', () => {
    expect(validateRegistrationAnswers({
      'q-text': 'Engineer',
      'q-radio': 'Forged option',
    }, questions)).toEqual({ error: 'Invalid answer for: Choose a track' })

    expect(validateRegistrationAnswers({
      'q-text': 'Engineer',
      'q-radio': 'Engineering',
      'q-checkbox': ['Not configured'],
    }, questions)).toEqual({ error: 'Invalid answer for: Select interests' })
  })

  it('drops stale question ids instead of storing arbitrary data', () => {
    expect(validateRegistrationAnswers({
      'q-text': 'Engineer',
      'q-radio': 'Engineering',
      'deleted-question': 'stale answer',
    }, questions)).toEqual({
      answers: { 'q-text': 'Engineer', 'q-radio': 'Engineering' },
    })
  })
})
