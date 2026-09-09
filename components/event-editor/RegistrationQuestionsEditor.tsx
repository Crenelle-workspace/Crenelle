'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, X, Link, Check } from 'lucide-react'
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
              <QuestionLabelInput
                value={q.label}
                onChange={(val) => handleChange(q.id, 'label', val)}
                placeholder={
                  q.type === 'text'
                    ? 'e.g. What are your dietary restrictions?'
                    : q.type === 'radio'
                    ? 'e.g. Which session will you attend?'
                    : 'e.g. Which topics interest you?'
                }
                required={q.required}
              />

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

// ── QuestionLabelInput ─────────────────────────────────────────────────────
// A label text input with an inline link-insert popover, so organizers can
// embed clickable links (e.g. "Join the group [here](https://...)") directly
// in the question text shown to registrants.

interface QuestionLabelInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  required?: boolean
}

function QuestionLabelInput({ value, onChange, placeholder, required }: QuestionLabelInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const savedCursorRef = useRef<{ start: number; end: number } | null>(null)

  const [open, setOpen] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('https://')
  const [urlError, setUrlError] = useState('')
  const urlInputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setUrlError('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  // Escape / outside-click to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    function onPointer(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, close])

  // Focus URL input on open
  useEffect(() => {
    if (open) setTimeout(() => urlInputRef.current?.focus(), 50)
  }, [open])

  function openPopover() {
    const el = inputRef.current
    if (!el) return
    savedCursorRef.current = { start: el.selectionStart ?? value.length, end: el.selectionEnd ?? value.length }
    setLinkLabel(value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0))
    setLinkUrl('https://')
    setUrlError('')
    setOpen(true)
  }

  function commit() {
    const saved = savedCursorRef.current ?? { start: value.length, end: value.length }
    let url = linkUrl.trim()
    if (!url || url === 'https://') { setUrlError('Please enter a URL.'); urlInputRef.current?.focus(); return }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    const label = linkLabel.trim() || url
    const md = `[${label}](${url})`
    const newVal = value.slice(0, saved.start) + md + value.slice(saved.end)
    onChange(newVal)
    close()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelCls}>
        Question label{required && <span className="ml-1 text-copper">*</span>}
      </label>
      <div className="relative flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${fieldCls} flex-1`}
        />
        {/* Link button */}
        <div className="relative shrink-0">
          <button
            type="button"
            title="Insert link"
            onClick={openPopover}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
              open
                ? 'border-copper bg-copper/10 text-copper'
                : 'border-border text-muted-foreground hover:border-copper/50 hover:text-copper'
            }`}
          >
            <Link className="h-3.5 w-3.5" />
          </button>

          {/* Inline popover */}
          {open && (
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Insert link"
              className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-xl shadow-black/10 flex flex-col gap-3"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-copper">Insert link</p>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Label</label>
                <input
                  type="text"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="e.g. Join the WhatsApp group"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-copper focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">URL</label>
                <input
                  ref={urlInputRef}
                  type="url"
                  value={linkUrl}
                  onChange={(e) => { setLinkUrl(e.target.value); setUrlError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
                  placeholder="https://example.com"
                  className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-colors ${
                    urlError ? 'border-red-500' : 'border-border focus:border-copper'
                  }`}
                />
                {urlError && <p className="text-[11px] text-red-500">{urlError}</p>}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={commit}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-copper py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-85"
                >
                  <Check className="h-3.5 w-3.5" /> Insert
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live preview — shows what registrants will see */}
      {value.includes('](') && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Preview: <span className="text-foreground">{value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}</span>{' '}
          <span className="text-copper underline underline-offset-1 text-[10px]">(link)</span>
        </p>
      )}
    </div>
  )
}
