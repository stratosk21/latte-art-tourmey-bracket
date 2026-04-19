'use client'

import Link from 'next/link'
import { ArrowRight, Trophy, Calendar } from 'lucide-react'
import { WavePattern } from '@/components/wave-pattern'
import { cn } from '@/lib/utils'
import type { Throwdown } from '@/lib/supabase/types'

interface ThrowdownWithCount extends Throwdown {
  match_count: { count: number }[]
}

interface PastMatchesViewProps {
  throwdowns: ThrowdownWithCount[]
}

export function PastMatchesView({ throwdowns }: PastMatchesViewProps) {
  return (
    <div className="min-h-screen">
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={40} animated={false} />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div>
            <p className="label-mono mb-1">Match Archive</p>
            <h2 className="text-xl font-bold text-foreground">Past Throwdowns</h2>
          </div>
          <p className="label-mono">{throwdowns.length} completed event{throwdowns.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="p-8">
        {throwdowns.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No completed throwdowns yet.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30 grid grid-cols-[1fr_auto_auto_auto] gap-6 items-center">
              <span className="label-mono">Event</span>
              <span className="label-mono text-right">Matches</span>
              <span className="label-mono text-right">Date</span>
              <span className="label-mono text-right">Bracket</span>
            </div>

            {throwdowns.map((t, i) => {
              const matchCount = t.match_count?.[0]?.count ?? 0
              const date = new Date(t.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })

              return (
                <Link
                  key={t.id}
                  href={`/throwdown/${t.id}`}
                  className={cn(
                    'grid grid-cols-[1fr_auto_auto_auto] gap-6 items-center px-5 py-4',
                    'border-b border-border last:border-0',
                    'hover:bg-primary/5 transition-colors group',
                    i % 2 !== 0 && 'bg-muted/10'
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Trophy size={11} className="text-primary shrink-0" />
                      <span className="font-semibold text-sm text-foreground truncate">{t.title}</span>
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground truncate pl-[19px]">{t.description}</p>
                    )}
                  </div>

                  <span className="font-mono text-xs text-muted-foreground text-right tabular-nums">
                    {matchCount}
                  </span>

                  <div className="flex items-center gap-1.5 text-right justify-end">
                    <Calendar size={10} className="text-muted-foreground shrink-0" />
                    <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">{date}</span>
                  </div>

                  <ArrowRight
                    size={13}
                    className="text-muted-foreground group-hover:text-primary transition-colors justify-self-end"
                  />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
