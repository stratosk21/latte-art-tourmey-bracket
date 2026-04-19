'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { ThrowdownFormat } from '@/lib/supabase/types'

interface CreateThrowdownDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateThrowdownDialog({ open, onClose }: CreateThrowdownDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<ThrowdownFormat>('registration')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [registrationOpensAt, setRegistrationOpensAt] = useState('')
  const [registrationClosesAt, setRegistrationClosesAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function handleClose() {
    setTitle('')
    setDescription('')
    setFormat('registration')
    setMaxParticipants('')
    setRegistrationOpensAt('')
    setRegistrationClosesAt('')
    setError(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: insertError } = await supabase.from('throwdowns').insert({
      title: title.trim(),
      description: description.trim() || null,
      format,
      max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
      registration_opens_at: registrationOpensAt || null,
      registration_closes_at: registrationClosesAt || null,
      status: 'upcoming',
    })
    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }
    router.refresh()
    handleClose()
    setLoading(false)
  }

  const inputClass = 'w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-mono text-sm font-bold tracking-widest uppercase">New Throwdown</h2>
          <button onClick={handleClose} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-mono block mb-1.5">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Spring Throwdown 2026"
              className={inputClass}
            />
          </div>

          <div>
            <label className="label-mono block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional — shown on the registrants page"
              className={cn(inputClass, 'resize-none')}
            />
          </div>

          <div>
            <label className="label-mono block mb-1.5">Format</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat('registration')}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-xs font-mono border transition-colors',
                  format === 'registration'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                )}
              >
                Registration-based
              </button>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="flex-1 px-3 py-2 rounded-md text-xs font-mono border border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
              >
                Submission-based
              </button>
            </div>
          </div>

          <div>
            <label className="label-mono block mb-1.5">Max Participants</label>
            <input
              type="number"
              min="2"
              value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
              placeholder="Leave blank for unlimited"
              className={inputClass}
            />
          </div>

          <div>
            <label className="label-mono block mb-1.5">Registration Opens</label>
            <input
              type="datetime-local"
              value={registrationOpensAt}
              onChange={e => setRegistrationOpensAt(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Leave blank to open immediately</p>
          </div>

          <div>
            <label className="label-mono block mb-1.5">Registration Closes</label>
            <input
              type="datetime-local"
              value={registrationClosesAt}
              onChange={e => setRegistrationClosesAt(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Leave blank to never close automatically</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-md text-sm border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-md text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Throwdown'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
