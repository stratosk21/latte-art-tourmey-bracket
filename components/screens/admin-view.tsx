'use client'

import { useState } from 'react'
import { Trash2, Zap, Clock, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WavePattern } from '@/components/wave-pattern'
import { createClient } from '@/lib/supabase/client'
import { CreateThrowdownDialog } from './create-throwdown-dialog'
import type { Throwdown, Match } from '@/lib/supabase/types'

interface AdminViewProps {
  throwdowns: Throwdown[]
  initialMatches: Match[]
  initialThrowdownId: string | null
}

export function AdminView({ throwdowns, initialMatches, initialThrowdownId }: AdminViewProps) {
  const [selectedThrowdownId, setSelectedThrowdownId] = useState<string | null>(initialThrowdownId)
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const liveCount = matches.filter(m => !m.winner_id).length
  const completedCount = matches.filter(m => m.winner_id !== null).length

  async function handleThrowdownChange(throwdownId: string) {
    setSelectedThrowdownId(throwdownId)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        submission_a:submission_a_id(*, profile:profile_id(*)),
        submission_b:submission_b_id(*, profile:profile_id(*)),
        winner:winner_id(*, profile:profile_id(*))
      `)
      .eq('throwdown_id', throwdownId)
      .order('round', { ascending: true })
      .order('position', { ascending: true })
    if (error) { setError(`Failed to load matches: ${error.message}`); return }
    setMatches(data ?? [])
  }

  async function handleDeleteMatch(matchId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (error) { setError(`Failed to delete match: ${error.message}`); return }
    setMatches(prev => prev.filter(m => m.id !== matchId))
  }

  async function handleSetWinner(matchId: string, winnerId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('matches')
      .update({ winner_id: winnerId })
      .eq('id', matchId)
      .select(`
        *,
        submission_a:submission_a_id(*, profile:profile_id(*)),
        submission_b:submission_b_id(*, profile:profile_id(*)),
        winner:winner_id(*, profile:profile_id(*))
      `)
      .single()
    if (error) { setError(`Failed to set winner: ${error.message}`); return }
    if (data) setMatches(prev => prev.map(m => m.id === matchId ? data : m))
  }

  return (
    <div className="min-h-screen">
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={40} animated />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-mono mb-1">Admin / Match Control</p>
              <h2 className="text-xl font-bold text-foreground">Match Management</h2>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              New Throwdown
            </button>
          </div>
          <p className="label-mono text-muted-foreground">Create and manage throwdown matchups</p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <label className="label-mono shrink-0">Throwdown</label>
          <select
            value={selectedThrowdownId ?? ''}
            onChange={e => handleThrowdownChange(e.target.value)}
            className="bg-card border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select throwdown...</option>
            {throwdowns.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {selectedThrowdownId && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2">
                <Zap size={12} className="text-live" />
                <span className="font-mono text-xs text-live">{liveCount} ACTIVE</span>
              </div>
              <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2">
                <Clock size={12} className="text-upcoming" />
                <span className="font-mono text-xs text-upcoming">{completedCount} COMPLETED</span>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
                  ALL MATCHES
                </h3>
                <span className="label-mono">{matches.length} records</span>
              </div>

              <div className="divide-y divide-border">
                {matches.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No matches yet. Go to the throwdown detail page to generate pairings.
                  </div>
                )}
                {matches.map(match => {
                  const nameA = match.submission_a?.profile?.username ?? 'TBD'
                  const nameB = match.submission_b?.profile?.username ?? 'TBD'
                  const hasWinner = match.winner_id !== null

                  return (
                    <div key={match.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 transition-colors">
                      <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">R{match.round}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {nameA} <span className="text-muted-foreground font-normal">vs</span> {nameB}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          Position {match.position}{hasWinner ? ` · Winner: ${match.winner?.profile?.username}` : ''}
                        </p>
                      </div>
                      {!hasWinner && match.submission_a_id && match.submission_b_id && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSetWinner(match.id, match.submission_a_id!)}
                            className="px-2 py-1 rounded text-[10px] font-mono bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            {nameA} wins
                          </button>
                          <button
                            onClick={() => handleSetWinner(match.id, match.submission_b_id!)}
                            className="px-2 py-1 rounded text-[10px] font-mono bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            {nameB} wins
                          </button>
                        </div>
                      )}
                      <StatusChip done={hasWinner} />
                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <CreateThrowdownDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}

function StatusChip({ done }: { done: boolean }) {
  return (
    <span className={cn(
      'font-mono text-[9px] tracking-widest px-2 py-1 rounded shrink-0',
      done ? 'bg-muted text-muted-foreground' : 'bg-live/15 text-live'
    )}>
      {done ? 'DONE' : 'ACTIVE'}
    </span>
  )
}
