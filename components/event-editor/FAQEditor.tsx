'use client'

import { useState } from 'react'
import { Plus, Trash2, HelpCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fieldCls, labelCls } from '@/lib/form-styles'
import type { FAQItem } from '@/lib/types'

interface FAQEditorProps {
  faqs: FAQItem[]
  onChange: (faqs: FAQItem[]) => void
}

export function FAQEditor({ faqs, onChange }: FAQEditorProps) {
  const [items, setItems] = useState<FAQItem[]>(faqs || [])

  const handleAdd = () => {
    const newItem: FAQItem = {
      id: crypto.randomUUID(),
      question: 'What is the dress code?',
      answer: 'Smart Casual.',
    }
    const updated = [...items, newItem]
    setItems(updated)
    onChange(updated)
  }

  const handleRemove = (id: string) => {
    const updated = items.filter((item) => item.id !== id)
    setItems(updated)
    onChange(updated)
  }

  const handleChange = (id: string, field: keyof FAQItem, value: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    )
    setItems(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Frequently Asked Questions (FAQ)
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Answer common attendee questions about parking, refunds, dress code, etc.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-8 gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Question
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
          No FAQs added yet. Click &quot;Add Question&quot; to help attendees.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="relative flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-zinc-400">
                  Question #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className={labelCls}>
                  <HelpCircle className="mr-1 inline-block h-3 w-3" /> Question
                </label>
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => handleChange(item.id, 'question', e.target.value)}
                  placeholder="e.g. Is parking available on site?"
                  className={fieldCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  <MessageSquare className="mr-1 inline-block h-3 w-3" /> Answer
                </label>
                <textarea
                  rows={2}
                  value={item.answer}
                  onChange={(e) => handleChange(item.id, 'answer', e.target.value)}
                  placeholder="Provide clear details..."
                  className={fieldCls}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
