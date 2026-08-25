'use client'

import { SectionShell, SectionHeader } from './ShowcaseSection'

function renderFormattedContent(content: string) {
  const paragraphs = content.split(/\n\s*\n/)
  let firstParaSeen = false

  return paragraphs.map((para, i) => {
    const trimmed = para.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('# ')) {
      return (
        <h2
          key={i}
          className="mb-3 mt-8 font-display text-2xl font-medium tracking-tight text-foreground first:mt-0"
        >
          {trimmed.replace('# ', '')}
        </h2>
      )
    }

    if (trimmed.startsWith('## ')) {
      return (
        <h3
          key={i}
          className="mb-2 mt-7 font-display text-xl font-medium tracking-tight text-foreground first:mt-0"
        >
          {trimmed.replace('## ', '')}
        </h3>
      )
    }

    if (trimmed.startsWith('### ')) {
      return (
        <h4
          key={i}
          className="mb-2 mt-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-copper first:mt-0"
        >
          {trimmed.replace('### ', '')}
        </h4>
      )
    }

    if (trimmed.startsWith('> ')) {
      return (
        <blockquote
          key={i}
          className="my-6 border-l-2 border-copper pl-5 font-display text-xl font-medium italic leading-relaxed text-foreground/90"
        >
          {trimmed.replace('> ', '')}
        </blockquote>
      )
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems = trimmed
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, ''))
      return (
        <ul key={i} className="my-5 space-y-2.5">
          {listItems.map((item, idx) => (
            <li
              key={idx}
              className="flex gap-3 text-[15px] leading-relaxed text-muted-foreground"
            >
              <span className="mt-2.5 h-1 w-1 shrink-0 bg-copper" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    }

    // Body paragraph — first one gets an editorial lead treatment
    const isLead = !firstParaSeen
    firstParaSeen = true
    return (
      <p
        key={i}
        className={
          isLead
            ? 'mb-5 text-lg leading-relaxed text-foreground/90'
            : 'mb-5 text-[15px] leading-relaxed text-muted-foreground'
        }
      >
        {trimmed}
      </p>
    )
  })
}

interface EventDescriptionProps {
  description?: string | null
  index: string
}

export function EventDescription({ description, index }: EventDescriptionProps) {
  if (!description) return null

  return (
    <SectionShell className="p-6 sm:p-9">
      <SectionHeader index={index} kicker="Overview" title="About this event" />
      <div className="max-w-2xl">{renderFormattedContent(description)}</div>
    </SectionShell>
  )
}
