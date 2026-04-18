'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, ArrowUpDown, Filter, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WavePattern } from '@/components/wave-pattern'
import type { Match } from '@/lib/supabase/types'

type SortKey = 'date' | 'stage' | 'participantA' | 'winner'
type SortDir = 'asc' | 'desc'

interface HistoricalMatch {
  id: string
  participantA: string
  participantB: string
  winner: string
  round: number
  date: string
}

interface PastMatchesViewProps {
  matches: Match[]
}

function mapToHistorical(matches: Match[]): HistoricalMatch[] {
  return matches
    .filter(m => m.winner_id !== null)
    .map(m => ({
      id: m.id,
      participantA: m.submission_a?.profile?.username ?? 'Unknown',
      participantB: m.submission_b?.profile?.username ?? 'Unknown',
      winner: m.winner?.profile?.username ?? 'Unknown',
      round: m.round,
      date: new Date(m.created_at).toISOString().split('T')[0],
    }))
}

export function PastMatchesView({ matches }: PastMatchesViewProps) {
  const allMatches = useMemo(() => mapToHistorical(matches), [matches])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [roundFilter, setRoundFilter] = useState('All Rounds')

  const rounds = useMemo(() => {
    const unique = [...new Set(allMatches.map(m => `Round ${m.round}`))].sort()
    return ['All Rounds', ...unique]
  }, [allMatches])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    let list = [...allMatches]
    if (roundFilter !== 'All Rounds') {
      const round = parseInt(roundFilter.replace('Round ', ''))
      list = list.filter(m => m.round === round)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.participantA.toLowerCase().includes(q) ||
        m.participantB.toLowerCase().includes(q) ||
        m.winner.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const valA = sortKey === 'participantA' ? a.participantA :
                   sortKey === 'winner' ? a.winner :
                   sortKey === 'stage' ? String(a.round) : a.date
      const valB = sortKey === 'participantA' ? b.participantA :
                   sortKey === 'winner' ? b.winner :
                   sortKey === 'stage' ? String(b.round) : b.date
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })
    return list
  }, [search, sortKey, sortDir, roundFilter, allMatches])

  return (
    <div className="min-h-screen">
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={40} animated={false} />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div>
            <p className="label-mono mb-1">Match Archive</p>
            <h2 className="text-xl font-bold text-foreground">Match Archive</h2>
          </div>
          <p className="label-mono">{allMatches.length} records / {filtered.length} shown</p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search participants, match ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-muted-foreground shrink-0" />
            <select
              value={roundFilter}
              onChange={e => setRoundFilter(e.target.value)}
              className="bg-card border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans"
            >
              {rounds.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3"><span className="label-mono">ID</span></th>
                <SortHeader label="Participant A" sortKey="participantA" active={sortKey === 'participantA'} dir={sortDir} onClick={() => handleSort('participantA')} />
                <th className="text-center px-4 py-3"><span className="label-mono">vs</span></th>
                <th className="text-left px-4 py-3"><span className="label-mono">Participant B</span></th>
                <SortHeader label="Winner" sortKey="winner" active={sortKey === 'winner'} dir={sortDir} onClick={() => handleSort('winner')} />
                <SortHeader label="Round" sortKey="stage" active={sortKey === 'stage'} dir={sortDir} onClick={() => handleSort('stage')} />
                <SortHeader label="Date" sortKey="date" active={sortKey === 'date'} dir={sortDir} onClick={() => handleSort('date')} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    No matches found
                  </td>
                </tr>
              ) : (
                filtered.map((match, i) => (
                  <tr
                    key={match.id}
                    className={cn(
                      'border-b border-border last:border-0 hover:bg-muted/20 transition-colors',
                      i % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{match.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm', match.winner === match.participantA ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {match.participantA}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm', match.winner === match.participantB ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {match.participantB}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Trophy size={10} className="text-primary shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{match.winner}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        Round {match.round}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{match.date}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="label-mono">Showing {filtered.length} of {allMatches.length} records</p>
        </div>
      </div>
    </div>
  )
}

function SortHeader({ label, sortKey, active, dir, onClick }: {
  label: string; sortKey: SortKey; active: boolean; dir: SortDir; onClick: () => void
}) {
  return (
    <th className="text-left px-4 py-3">
      <button onClick={onClick} className="flex items-center gap-1 group">
        <span className={cn('font-mono text-[10px] tracking-widest uppercase transition-colors', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}>
          {label}
        </span>
        <span className="text-muted-foreground">
          {active ? (dir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ArrowUpDown size={10} />}
        </span>
      </button>
    </th>
  )
}
