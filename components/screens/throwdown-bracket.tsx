'use client'

import { useMemo } from 'react'
import { BracketView, type Round } from '@/components/screens/bracket-view'
import { useRealtimeMatches } from '@/hooks/use-realtime-matches'
import type { Throwdown, Match } from '@/lib/supabase/types'

type MatchStatus = 'live' | 'upcoming' | 'done' | 'bye'

interface ThrowdownBracketProps {
  throwdown: Throwdown
  initialMatches: Match[]
}

function matchesToRounds(matches: Match[]): Round[] {
  const byRound = matches.reduce((acc, match) => {
    const r = match.round
    if (!acc[r]) acc[r] = []
    acc[r].push(match)
    return acc
  }, {} as Record<number, Match[]>)

  return Object.entries(byRound)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([round, roundMatches]) => ({
      label: `Round ${round}`,
      matches: roundMatches
        .sort((a, b) => a.position - b.position)
        .map(m => ({
          id: `R${round}-${m.position}`,
          a: { name: m.submission_a?.profile?.username ?? 'TBD' },
          b: { name: m.submission_b?.profile?.username ?? 'TBD' },
          winner: m.winner_id
            ? (m.winner_id === m.submission_a_id ? 'a' as const : 'b' as const)
            : undefined,
          status: (m.winner_id ? 'done' : 'upcoming') as MatchStatus,
        })),
    }))
}

export function ThrowdownBracket({ throwdown, initialMatches }: ThrowdownBracketProps) {
  const matches = useRealtimeMatches(throwdown.id, initialMatches)
  const rounds = useMemo(() => matchesToRounds(matches), [matches])

  if (rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-mono text-sm text-muted-foreground mb-1">No bracket yet</p>
        <p className="text-xs text-muted-foreground">Generate pairings from the Registrants tab to create the bracket.</p>
      </div>
    )
  }

  return (
    <BracketView
      rounds={rounds}
      throwdownTitle={throwdown.title}
    />
  )
}
