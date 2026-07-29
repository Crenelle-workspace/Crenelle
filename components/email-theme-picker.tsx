'use client'

import { useState, useTransition } from 'react'
import { Check, Eye, Sparkles, Plane, LayoutTemplate, Moon, Flame, Maximize2 } from 'lucide-react'
import { updateEventEmailTheme } from '@/app/actions/events'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { EmailTheme } from '@/lib/types'

interface ThemeOption {
  id: EmailTheme
  name: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
  accentColor: string
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'classic',
    name: 'Classic Ticket',
    subtitle: 'Default Entry Pass',
    description: 'Minimalist beige layout with warm copper accents, clean monospace headers, and structured entry details.',
    icon: LayoutTemplate,
    badge: 'DEFAULT',
    accentColor: '#BF8430',
  },
  {
    id: 'boarding_pass',
    name: 'Flight Boarding Pass',
    subtitle: 'Airline Ticket Style',
    description: 'Authentic flight boarding pass with perforated coupon stub, gate/zone label grid, barcode accent, and flight typography.',
    icon: Plane,
    badge: 'POPULAR',
    accentColor: '#0284C7',
  },
  {
    id: 'minimal_mono',
    name: 'Minimal Mono',
    subtitle: 'Architectural Gallery',
    description: 'High-contrast monochrome layout with thin 1px grid rules, clean spacing, and crisp gallery typography.',
    icon: Sparkles,
    badge: 'CLEAN',
    accentColor: '#18181B',
  },
  {
    id: 'luxe_dark',
    name: 'Luxe Dark Gala',
    subtitle: 'Obsidian & Champagne Gold',
    description: 'Deep obsidian black card framed in metallic champagne gold gradients, gold VIP crest, double foil borders, and elegant serif typography.',
    icon: Moon,
    badge: 'LUXURY VIP',
    accentColor: '#D4AF37',
  },
  {
    id: 'bold_poster',
    name: 'Bold Festival Poster',
    subtitle: 'Acid Neo-Brutalist',
    description: 'Electric indigo header band, 4px heavy black borders with offset drop shadows, neon yellow warning notice sticker, and industrial barcode stub.',
    icon: Flame,
    badge: 'HIGH ENERGY',
    accentColor: '#4F46E5',
  },
  {
    id: 'horizontal_pass',
    name: 'Horizon Panoramic Strip',
    subtitle: 'Panoramic Ticket Stub',
    description: 'Full-width event banner header on top with a sleek side-by-side horizontal ticket strip below and right-hand vertical QR stub.',
    icon: Maximize2,
    badge: 'PANORAMIC STRIP',
    accentColor: '#06B6D4',
  },
]

export function EmailThemePicker({
  eventId,
  currentTheme = 'classic',
}: {
  eventId: string
  currentTheme?: EmailTheme
}) {
  const [selectedTheme, setSelectedTheme] = useState<EmailTheme>(currentTheme)
  const [previewTheme, setPreviewTheme] = useState<EmailTheme | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSelectTheme = (themeId: EmailTheme) => {
    setSelectedTheme(themeId)
    startTransition(async () => {
      const res = await updateEventEmailTheme(eventId, themeId)
      if (res.error) {
        toast.error(`Failed to save theme: ${res.error}`)
      } else {
        toast.success(`Ticket email theme updated to ${THEME_OPTIONS.find(t => t.id === themeId)?.name}`)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            Ticket Email Theme
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose the visual style for attendee ticket confirmation and reminder emails.
          </p>
        </div>
      </div>

      {/* Theme Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = selectedTheme === option.id

          return (
            <div
              key={option.id}
              className={`relative flex flex-col justify-between p-5 rounded-lg border-2 transition-all cursor-pointer bg-card hover:border-foreground/40 ${
                isSelected
                  ? 'border-copper ring-2 ring-copper/20 shadow-md'
                  : 'border-border hover:shadow-sm'
              }`}
              onClick={() => handleSelectTheme(option.id)}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-md text-white"
                      style={{ backgroundColor: option.accentColor }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-border bg-muted/50 font-semibold">
                      {option.badge}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-copper font-mono">
                      <Check className="w-4 h-4" /> ACTIVE
                    </div>
                  )}
                </div>

                <h4 className="font-semibold text-sm text-foreground mb-0.5">
                  {option.name}
                </h4>
                <p className="text-xs text-muted-foreground font-mono mb-2">
                  {option.subtitle}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {option.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs font-mono h-8 px-2 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewTheme(option.id)
                  }}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Live Preview
                </Button>

                <Button
                  type="button"
                  variant={isSelected ? 'copper' : 'outline'}
                  size="sm"
                  disabled={isPending}
                  className="text-xs font-mono h-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectTheme(option.id)
                  }}
                >
                  {isSelected ? 'Selected' : 'Use Theme'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Live Preview Modal */}
      <Dialog open={!!previewTheme} onOpenChange={() => setPreviewTheme(null)}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b border-border bg-card flex-row items-center justify-between">
            <DialogTitle className="font-serif text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-copper" />
              Theme Preview — {THEME_OPTIONS.find(t => t.id === previewTheme)?.name}
            </DialogTitle>
            {previewTheme && previewTheme !== selectedTheme && (
              <Button
                size="sm"
                className="font-mono text-xs mr-6"
                onClick={() => {
                  if (previewTheme) handleSelectTheme(previewTheme)
                  setPreviewTheme(null)
                }}
              >
                Apply This Theme
              </Button>
            )}
          </DialogHeader>

          <div className="flex-1 bg-muted/40 p-2 sm:p-6 overflow-y-auto flex justify-center">
            {previewTheme && (
              <iframe
                src={`/api/events/${eventId}/email-preview?theme=${previewTheme}`}
                className="w-full max-w-155 h-full min-h-150 border border-border rounded-md shadow-lg bg-white"
                title="Email Theme Live Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
