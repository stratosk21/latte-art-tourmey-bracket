'use client'

import Link from 'next/link'
import { WavePattern } from '@/components/wave-pattern'
import { ArrowRight, Clock, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Throwdown } from '@/lib/supabase/types'

interface DashboardHomeProps {
  throwdowns: Throwdown[]
}

export function DashboardHome({ throwdowns }: DashboardHomeProps) {
  const liveCount = throwdowns.filter(t => t.status === 'live').length

  return (
    <div className="min-h-screen">
      <div className="relative h-44 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.4} density={48} animated />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-mono mb-1">Active Throwdowns</p>
              <h2 className="text-2xl font-bold text-foreground text-balance">
                Tournament Overview
              </h2>
            </div>
            <div className="text-right">
              <p className="label-mono">BRACKET-REF</p>
              <p className="font-mono text-xs text-muted-foreground">SEASON</p>
            </div>
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
              <span className="font-mono text-xs text-live tracking-widest">{liveCount} THROWDOWN{liveCount > 1 ? 'S' : ''} LIVE</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 space-y-6">
        <h3 className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
          ALL THROWDOWNS
        </h3>

        {throwdowns.length === 0 && (
          <p className="text-sm text-muted-foreground">No throwdowns found.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {throwdowns.map((t) => (
            <Link
              key={t.id}
              href={`/throwdown/${t.id}`}
              className="group bg-card border border-border rounded-lg p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <StatusChip status={t.status} />
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1 leading-snug">{t.title}</p>
              {t.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
              )}
              {t.ends_at && (
                <div className="flex items-center gap-1.5 mt-3">
                  <Clock size={10} className="text-muted-foreground" />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Ends {new Date(t.ends_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {t.status === 'completed' && t.winner_id && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Trophy size={10} className="text-primary" />
                  <span className="font-mono text-[10px] text-primary">Completed</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn(
      'font-mono text-[9px] tracking-widest px-2 py-1 rounded',
      status === 'live' ? 'bg-live/15 text-live' :
      status === 'completed' ? 'bg-muted text-muted-foreground' :
      'bg-upcoming/15 text-upcoming'
    )}>
      {status.toUpperCase()}
    </span>
  )
}
