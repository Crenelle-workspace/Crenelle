'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import {
  Bold,
  Italic,
  Link,
  List,
  Heading2,
  Quote,
  Minus,
  Check,
  X,
} from 'lucide-react'

interface DescriptionEditorProps {
  /** The textarea's form field name — defaults to "description" */
  name?: string
  /** Pre-populated value (for edit forms) */
  defaultValue?: string
  /** Placeholder text */
  placeholder?: string
}

type SimpleAction =
  | { type: 'wrap'; before: string; after: string; placeholder: string }
  | { type: 'line-prefix'; prefix: string }
  | { type: 'insert'; text: string }

const TOOLBAR_BUTTONS: {
  title: string
  icon: React.ReactNode
  action: SimpleAction
}[] = [
  {
    title: 'Bold',
    icon: <Bold className="h-3.5 w-3.5" />,
    action: { type: 'wrap', before: '**', after: '**', placeholder: 'bold text' },
  },
  {
    title: 'Italic',
    icon: <Italic className="h-3.5 w-3.5" />,
    action: { type: 'wrap', before: '_', after: '_', placeholder: 'italic text' },
  },
  {
    title: 'Heading',
    icon: <Heading2 className="h-3.5 w-3.5" />,
    action: { type: 'line-prefix', prefix: '## ' },
  },
  {
    title: 'Bullet list',
    icon: <List className="h-3.5 w-3.5" />,
    action: { type: 'line-prefix', prefix: '- ' },
  },
  {
    title: 'Blockquote',
    icon: <Quote className="h-3.5 w-3.5" />,
    action: { type: 'line-prefix', prefix: '> ' },
  },
  {
    title: 'Horizontal rule',
    icon: <Minus className="h-3.5 w-3.5" />,
    action: { type: 'insert', text: '\n---\n' },
  },
]

export function DescriptionEditor({
  name = 'description',
  defaultValue = '',
  placeholder = 'Tell attendees what to expect…',
}: DescriptionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const linkPopoverRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Stash selection indices so we can apply the link after the popover closes
  const savedSelectionRef = useRef<{ start: number; end: number; text: string } | null>(null)

  const [linkOpen, setLinkOpen] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('https://')
  const [urlError, setUrlError] = useState('')

  const closeLinkPopover = useCallback(() => {
    setLinkOpen(false)
    setUrlError('')
    // Restore focus to textarea
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [])

  // Close popover on Escape or outside click
  useEffect(() => {
    if (!linkOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLinkPopover()
    }
    function onPointerDown(e: MouseEvent) {
      if (linkPopoverRef.current && !linkPopoverRef.current.contains(e.target as Node)) {
        closeLinkPopover()
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [linkOpen, closeLinkPopover])

  // Focus URL input when popover opens
  useEffect(() => {
    if (linkOpen) {
      setTimeout(() => urlInputRef.current?.focus(), 50)
    }
  }, [linkOpen])

  function openLinkPopover() {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = ta.value.slice(start, end)
    savedSelectionRef.current = { start, end, text: selected }
    setLinkLabel(selected)
    setLinkUrl('https://')
    setUrlError('')
    setLinkOpen(true)
  }

  function commitLink() {
    const saved = savedSelectionRef.current
    const ta = textareaRef.current
    if (!ta || !saved) return

    // Validate URL
    let url = linkUrl.trim()
    if (!url || url === 'https://') {
      setUrlError('Please enter a valid URL.')
      urlInputRef.current?.focus()
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url
    }

    const label = linkLabel.trim() || url
    const mdLink = `[${label}](${url})`

    const val = ta.value
    const newVal = val.slice(0, saved.start) + mdLink + val.slice(saved.end)

    // Update uncontrolled textarea
    ta.value = newVal

    // Fire React synthetic event so any controlled wrappers stay in sync
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set
    nativeSetter?.call(ta, newVal)
    ta.dispatchEvent(new Event('input', { bubbles: true }))

    closeLinkPopover()

    requestAnimationFrame(() => {
      ta.focus()
      const cursor = saved.start + mdLink.length
      ta.setSelectionRange(cursor, cursor)
    })
  }

  const applySimpleAction = useCallback((action: SimpleAction) => {
    const ta = textareaRef.current
    if (!ta) return

    const start = ta.selectionStart
    const end = ta.selectionEnd
    const val = ta.value
    const selected = val.slice(start, end)

    let newVal: string
    let newStart: number
    let newEnd: number

    if (action.type === 'wrap') {
      const text = selected || action.placeholder
      newVal = val.slice(0, start) + action.before + text + action.after + val.slice(end)
      newStart = start + action.before.length
      newEnd = newStart + text.length
    } else if (action.type === 'line-prefix') {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1
      const alreadyHasPrefix = val.slice(lineStart).startsWith(action.prefix)
      if (alreadyHasPrefix) {
        newVal = val.slice(0, lineStart) + val.slice(lineStart + action.prefix.length)
        newStart = Math.max(lineStart, start - action.prefix.length)
        newEnd = Math.max(lineStart, end - action.prefix.length)
      } else {
        newVal = val.slice(0, lineStart) + action.prefix + val.slice(lineStart)
        newStart = start + action.prefix.length
        newEnd = end + action.prefix.length
      }
    } else {
      newVal = val.slice(0, start) + action.text + val.slice(end)
      newStart = newEnd = start + action.text.length
    }

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set
    nativeSetter?.call(ta, newVal)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.value = newVal

    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(newStart, newEnd)
    })
  }, [])

  return (
    <div className="relative flex flex-col gap-0 rounded-xl border border-border/50 overflow-visible focus-within:border-copper/60 transition-colors">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0.5 border-b border-border/40 bg-secondary/30 px-2 py-1.5 rounded-t-xl">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.title}
            type="button"
            title={btn.title}
            onClick={() => applySimpleAction(btn.action)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground active:bg-foreground/12 select-none"
            aria-label={btn.title}
          >
            {btn.icon}
          </button>
        ))}

        {/* ── Link button (separate, opens popover) ── */}
        <div className="relative">
          <button
            type="button"
            title="Add link"
            onClick={openLinkPopover}
            aria-label="Add link"
            aria-expanded={linkOpen}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 transition-colors select-none ${
              linkOpen
                ? 'bg-copper/10 text-copper'
                : 'text-muted-foreground hover:bg-foreground/8 hover:text-foreground'
            }`}
          >
            <Link className="h-3.5 w-3.5" />
          </button>

          {/* ── Link Popover ── */}
          {linkOpen && (
            <div
              ref={linkPopoverRef}
              role="dialog"
              aria-label="Insert link"
              className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card shadow-xl shadow-black/10 p-4 flex flex-col gap-3"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-copper">
                Insert link
              </p>

              {/* Label */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Label
                </label>
                <input
                  type="text"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="e.g. Visit our website"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-copper focus:outline-none transition-colors"
                />
              </div>

              {/* URL */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  URL
                </label>
                <input
                  ref={urlInputRef}
                  type="url"
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value)
                    setUrlError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitLink()
                    }
                  }}
                  placeholder="https://example.com"
                  className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-colors ${
                    urlError ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-copper'
                  }`}
                />
                {urlError && (
                  <p className="text-[11px] text-red-500">{urlError}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={commitLink}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-copper py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-85"
                >
                  <Check className="h-3.5 w-3.5" />
                  Insert
                </button>
                <button
                  type="button"
                  onClick={closeLinkPopover}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto font-mono text-[9px] uppercase tracking-widest text-foreground/30 pr-1 select-none hidden sm:block">
          Markdown
        </div>
      </div>

      {/* ── Textarea ── */}
      <textarea
        ref={textareaRef}
        id="ev-desc"
        name={name}
        defaultValue={defaultValue}
        rows={7}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent px-4 py-3.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none rounded-b-xl"
        spellCheck
      />
    </div>
  )
}
