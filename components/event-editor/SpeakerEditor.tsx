'use client'

import { useState } from 'react'
import { Plus, Trash2, User, Building, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fieldCls, labelCls } from '@/lib/form-styles'
import type { SpeakerInfo } from '@/lib/types'

interface SpeakerEditorProps {
  speakers: SpeakerInfo[]
  onChange: (speakers: SpeakerInfo[]) => void
}

export function SpeakerEditor({ speakers, onChange }: SpeakerEditorProps) {
  const [items, setItems] = useState<SpeakerInfo[]>(speakers || [])

  const handleAdd = () => {
    const newItem: SpeakerInfo = {
      id: crypto.randomUUID(),
      name: 'Speaker Name',
      role: 'Keynote Speaker',
      company: '',
      avatar_url: '',
      bio: '',
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

  const handleChange = (id: string, field: keyof SpeakerInfo, value: string) => {
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
            Featured Speakers & Hosts
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Showcase keynotes, panelists, and hosts on the event page.
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
          Add Speaker
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
          No speakers added yet. Click &quot;Add Speaker&quot; to showcase your lineup.
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
                  Speaker #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>
                    <User className="mr-1 inline-block h-3 w-3" /> Full Name
                  </label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <Building className="mr-1 inline-block h-3 w-3" /> Title / Role & Company
                  </label>
                  <input
                    type="text"
                    value={item.role}
                    onChange={(e) => handleChange(item.id, 'role', e.target.value)}
                    placeholder="e.g. CEO at TechCorp"
                    className={fieldCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>
                    <ImageIcon className="mr-1 inline-block h-3 w-3" /> Photo URL
                  </label>
                  <input
                    type="text"
                    value={item.avatar_url || ''}
                    onChange={(e) => handleChange(item.id, 'avatar_url', e.target.value)}
                    placeholder="https://..."
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Brief Bio</label>
                  <input
                    type="text"
                    value={item.bio || ''}
                    onChange={(e) => handleChange(item.id, 'bio', e.target.value)}
                    placeholder="Short bio or background"
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
