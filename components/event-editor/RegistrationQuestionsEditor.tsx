'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fieldCls, labelCls } from '@/lib/form-styles'
import type { RegistrationQuestion, RegistrationQuestionType } from '@/lib/types'

interface RegistrationQuestionsEditorProps {
  questions: RegistrationQuestion[]
  onChange: (questions: RegistrationQuestion[]) => void
}

const TYPE_LABELS: Record<RegistrationQuestionType, string> = {
  text: 'Short answer',
  radio: 'Single choice',
  checkbox: 'Multiple choice',
}

export function RegistrationQuestionsEditor({ questions, onChange }: RegistrationQuestionsEditorProps) {
  const [items, setItems] = useState<RegistrationQuestion[]>(questions || [])
  const [prevQuestions, setPrevQuestions] = useState(questions)

  // Sync when parent resets (e.g. on cancel)
  if (questions !== prevQuestions) {
    setPrevQuestions(questions)
    setItems(questions || [])
  }

  function push(updated: RegistrationQuestion[]) {
    setItems(updated)
    onChange(updated)
  }

  function handleAdd() {
    const newItem: RegistrationQuestion = {
      id: crypto.randomUUID(),
      label: '',
      type: 'text',
      required: false,
      sort_order: items.length,
    }
    push([...items, newItem])
  }

  function handleRemove(id: string) {
    push(items.filter((q) => q.id !== id))
  }

  function handleChange<K extends keyof RegistrationQuestion>(id: string, field: K, value: RegistrationQuestion[K]) {
    push(items.map((q) => (q.id === id ? { ...q, [field]: value } : q)))
  }

  function handleTypeChange(id: string, type: RegistrationQuestionType) {
    push(
      items.map((q) => {
        if (q.id !== id) return q
        // Preserve options when switching between radio ↔ checkbox, clear when switching to text
        const options = type === 'text' ? undefined : (q.options ?? [''])
        return { ...q, type, options }
      })
    )
  }

  function handleAddOption(id: string) {
    push(
      items.map((q) =>
        q.id === id ? { ...q, options: [...(q.options ?? []), ''] } : q
      )
    )
  }

  function handleRemoveOption(id: string, idx: number) {
    push(
      items.map((q) =>
        q.id === id
          ? { ...q, options: (q.options ?? []).filter((_, i) => i !== idx) }
          : q
      )
    )
  }

  function handleOptionChange(id: string, idx: number, value: string) {
    push(
      items.map((q) => {
        if (q.id !== id) return q
        const options = [...(q.options ?? [])]
        options[idx] = value
        return { ...q, options }
      })
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Custom Registration Questions
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Collect extra info from registrants — text answers, single-choice, or multi-select.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-8 gap-1.5 text-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Question
        </Button>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
          No custom questions yet. Registrants will only see Name, Email, and Phone.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((q, index) => (
            <div
              key={q.id}
              className="relative flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40"
            >
              {/* Row header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical className="h-4 w-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                  <span className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Q{index + 1}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Required toggle */}
                  <button
                    type="button"
                    onClick={() => handleChange(q.id, 'required', !q.required)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      q.required ? 'text-copper' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title={q.required ? 'Required — click to make optional' : 'Optional — click to make required'}
                  >
                    {q.required ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                    {q.required ? 'Required' : 'Optional'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(q.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Type selector */}
              <div>
                <label className={`${labelCls} mb-1.5 block`}>
                  Question Type
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-zinc-200 bg-zinc-100/70 p-1 dark:border-zinc-700/80 dark:bg-zinc-800/60">
                  {(Object.keys(TYPE_LABELS) as RegistrationQuestionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeChange(q.id, t)}
                      className={`rounded-md py-1.5 px-2 text-center text-xs font-medium transition-all ${
                        q.type === t
                          ? 'bg-white text-zinc-900 shadow-sm font-semibold dark:bg-zinc-700 dark:text-zinc-100'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question label */}
              <div>
                <label className={labelCls}>
                  Question label{q.required && <span className="ml-1 text-copper">*</span>}
                </label>
                <input
                  type="text"
                  value={q.label}
                  onChange={(e) => handleChange(q.id, 'label', e.target.value)}
                  placeholder={
                    q.type === 'text'
                      ? 'e.g. What are your dietary restrictions?'
                      : q.type === 'radio'
                      ? 'e.g. Which session will you attend?'
                      : 'e.g. Which topics interest you?'
                  }
                  className={fieldCls}
                />
              </div>

              {/* Options (radio / checkbox only) */}
              {(q.type === 'radio' || q.type === 'checkbox') && (
                <div className="space-y-2">
                  <label className={labelCls}>
                    Options <span className="text-muted-foreground/60 normal-case font-normal">(one per option)</span>
                  </label>
                  {(q.options ?? []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 shrink-0 border-2 border-zinc-300 dark:border-zinc-600 ${
                          q.type === 'radio' ? 'rounded-full' : 'rounded'
                        }`}
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(q.id, i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className={`${fieldCls} flex-1 text-xs`}
                      />
                      {(q.options?.length ?? 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(q.id, i)}
                          className="p-1 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                          aria-label="Remove option"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddOption(q.id)}
                    className="flex items-center gap-1 text-[11px] font-medium text-copper hover:text-copper/80 transition-colors mt-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
