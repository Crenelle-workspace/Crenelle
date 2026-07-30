'use client'

import { useState } from 'react'
import { Plus, Trash2, Clock, User, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fieldCls, labelCls } from '@/lib/form-styles'
import type { AgendaItem } from '@/lib/types'

interface AgendaEditorProps {
  agenda: AgendaItem[]
  onChange: (agenda: AgendaItem[]) => void
}

export function AgendaEditor({ agenda, onChange }: AgendaEditorProps) {
  const [items, setItems] = useState<AgendaItem[]>(agenda || [])
  const [prevAgenda, setPrevAgenda] = useState(agenda)

  if (agenda !== prevAgenda) {
    setPrevAgenda(agenda)
    setItems(agenda || [])
  }

  const handleAdd = () => {
    const newItem: AgendaItem = {
      id: crypto.randomUUID(),
      time: '',
      title: '',
      description: '',
      speaker: '',
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

  const handleChange = (id: string, field: keyof AgendaItem, value: string) => {
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
            Event Schedule & Agenda
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Add sessions, timestamps, speakers, and topics for attendees.
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
          Add Session
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
          No schedule items added yet. Click &quot;Add Session&quot; to build your timeline.
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
                  Session #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>
                    <Clock className="mr-1 inline-block h-3 w-3" /> Time
                  </label>
                  <input
                    type="text"
                    value={item.time}
                    onChange={(e) => handleChange(item.id, 'time', e.target.value)}
                    placeholder="e.g. 10:00 AM - 11:30 AM"
                    className={fieldCls}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>Session Title</label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleChange(item.id, 'title', e.target.value)}
                    placeholder="Session or Topic Name"
                    className={fieldCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>
                    <User className="mr-1 inline-block h-3 w-3" /> Speaker / Host
                  </label>
                  <input
                    type="text"
                    value={item.speaker || ''}
                    onChange={(e) => handleChange(item.id, 'speaker', e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <FileText className="mr-1 inline-block h-3 w-3" /> Description
                  </label>
                  <input
                    type="text"
                    value={item.description || ''}
                    onChange={(e) => handleChange(item.id, 'description', e.target.value)}
                    placeholder="Brief overview of session"
                    className={fieldCls}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
