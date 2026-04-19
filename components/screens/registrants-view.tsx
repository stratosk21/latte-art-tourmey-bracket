'use client'

import { useState, useMemo } from 'react'
import { Search, Trash2, Shuffle, UserPlus, UserMinus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WavePattern } from '@/components/wave-pattern'
import { createClient } from '@/lib/supabase/client'
import type { Throwdown, Registration, Match } from '@/lib/supabase/types'

interface RegistrantsViewProps {
  throwdown: Throwdown
  initialRegistrations: Registration[]
  isAdmin: boolean
  currentUserId: string
  hasExistingMatches: boolean
  onPairingsGenerated: (matches: Match[]) => void
}

type FilterTab = 'all' | 'confirmed' | 'pending' | 'waitlist'

function cryptoShuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function isRegistrationOpen(throwdown: Throwdown): boolean {
  const now = new Date()
  if (throwdown.registration_opens_at && new Date(throwdown.registration_opens_at) > now) return false
  if (throwdown.registration_closes_at && new Date(throwdown.registration_closes_at) < now) return false
  return true
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function RegistrantsView({
  throwdown,
  initialRegistrations,
  isAdmin,
  currentUserId,
  hasExistingMatches,
  onPairingsGenerated,
}: RegistrantsViewProps) {
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [joinLoading, setJoinLoading] = useState(false)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmedCount = registrations.filter(r => r.status === 'confirmed').length
  const pendingCount = registrations.filter(r => r.status === 'pending').length
  const waitlistCount = registrations.filter(r => r.status === 'waitlist').length
  const totalCount = registrations.length

  const myRegistration = registrations.find(r => r.profile_id === currentUserId)
  const registrationOpen = isRegistrationOpen(throwdown)
  const atCapacity = throwdown.max_participants !== null && confirmedCount >= throwdown.max_participants

  const filtered = useMemo(() => {
    let list = registrations
    if (filter !== 'all') list = list.filter(r => r.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.profile?.username?.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      if (a.seed !== null && b.seed !== null) return a.seed - b.seed
      if (a.seed !== null) return -1
      if (b.seed !== null) return 1
      return new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
    })
  }, [registrations, filter, search])

  async function handleJoin() {
    setError(null)
    setJoinLoading(true)
    const supabase = createClient()
    const { data: rawReg, error: rpcError } = await supabase.rpc('register_for_throwdown', {
      p_throwdown_id: throwdown.id,
    })
    if (rpcError) { setError(rpcError.message); setJoinLoading(false); return }
    const { data: reg } = await supabase
      .from('registrations')
      .select('*, profile:profile_id(*)')
      .eq('id', rawReg as string)
      .single()
    if (reg) setRegistrations(prev => [...prev, reg as Registration])
    setJoinLoading(false)
  }

  async function handleLeave() {
    if (!myRegistration) return
    setError(null)
    setJoinLoading(true)
    const supabase = createClient()
    const { error: delError } = await supabase.from('registrations').delete().eq('id', myRegistration.id)
    if (delError) { setError(delError.message); setJoinLoading(false); return }
    setRegistrations(prev => prev.filter(r => r.id !== myRegistration.id))
    setJoinLoading(false)
  }

  async function handleRemove(regId: string) {
    setError(null)
    const supabase = createClient()
    const { error: delError } = await supabase.from('registrations').delete().eq('id', regId)
    if (delError) { setError(delError.message); return }
    setRegistrations(prev => prev.filter(r => r.id !== regId))
  }

  async function handleGeneratePairings() {
    setError(null)
    setPairingLoading(true)
    const supabase = createClient()

    const confirmed = registrations.filter(r => r.status === 'confirmed')
    if (confirmed.length < 2) {
      setError('Need at least 2 confirmed registrants.')
      setPairingLoading(false)
      return
    }

    const submissionInserts = confirmed.map(r => ({
      throwdown_id: throwdown.id,
      profile_id: r.profile_id,
      image_url: null,
    }))

    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .upsert(submissionInserts, { onConflict: 'throwdown_id,profile_id' })
      .select('id, profile_id')

    if (subError || !submissions) {
      setError(`Failed to create participant records: ${subError?.message}`)
      setPairingLoading(false)
      return
    }

    const submissionMap = new Map(submissions.map(s => [s.profile_id, s.id]))
    const submissionIds = confirmed
      .map(r => submissionMap.get(r.profile_id))
      .filter((id): id is string => !!id)

    const shuffled = cryptoShuffle(submissionIds)
    const pairs = []
    for (let i = 0; i < shuffled.length; i += 2) {
      pairs.push({
        throwdown_id: throwdown.id,
        round: 1,
        position: i / 2 + 1,
        submission_a_id: shuffled[i],
        submission_b_id: shuffled[i + 1] ?? null,
      })
    }

    const { data: newMatches, error: matchError } = await supabase
      .from('matches')
      .insert(pairs)
      .select(`
        *,
        submission_a:submission_a_id(*, profile:profile_id(*)),
        submission_b:submission_b_id(*, profile:profile_id(*)),
        winner:winner_id(*, profile:profile_id(*))
      `)

    if (matchError) {
      setError(`Failed to create matches: ${matchError.message}`)
      setPairingLoading(false)
      return
    }

    onPairingsGenerated(newMatches ?? [])
    setPairingLoading(false)
  }

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'ALL', count: totalCount },
    { key: 'confirmed', label: 'CONFIRMED', count: confirmedCount },
    { key: 'pending', label: 'PENDING', count: pendingCount },
    { key: 'waitlist', label: 'WAITLIST', count: waitlistCount },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={40} animated />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div>
            <p className="label-mono mb-1">
              {throwdown.title.toUpperCase()} · {totalCount} REGISTERED
            </p>
            <h2 className="text-xl font-bold text-foreground">Registrants</h2>
          </div>
          <div className="flex items-center justify-between">
            <p className="label-mono text-muted-foreground">
              {registrationOpen
                ? atCapacity
                  ? 'Registration closed — bracket is full'
                  : throwdown.registration_closes_at
                  ? `Closes ${formatDate(throwdown.registration_closes_at)}`
                  : 'Registration open'
                : throwdown.registration_opens_at && new Date(throwdown.registration_opens_at) > new Date()
                  ? `Opens ${formatDate(throwdown.registration_opens_at)}`
                  : 'Registration closed'}
            </p>
            {!myRegistration && registrationOpen && (
              <button
                onClick={handleJoin}
                disabled={joinLoading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <UserPlus size={14} />
                {joinLoading ? 'Joining...' : atCapacity ? 'Join Waitlist' : 'Join'}
              </button>
            )}
            {myRegistration && registrationOpen && (
              <button
                onClick={handleLeave}
                disabled={joinLoading}
                className="flex items-center gap-2 border border-border px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                <UserMinus size={14} />
                {joinLoading ? 'Leaving...' : 'Leave'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL SIGNED UP', value: totalCount },
            { label: 'CONFIRMED', value: confirmedCount },
            { label: 'PENDING', value: pendingCount },
            { label: 'WAITLIST', value: waitlistCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-4">
              <p className="label-mono mb-2">{label}</p>
              <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Capacity bar */}
        {throwdown.max_participants !== null && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="label-mono">BRACKET CAPACITY</p>
              <p className="label-mono">{confirmedCount} / {throwdown.max_participants}</p>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  atCapacity ? 'bg-destructive' : 'bg-primary'
                )}
                style={{ width: `${Math.min(100, (confirmedCount / throwdown.max_participants) * 100)}%` }}
              />
            </div>
            {atCapacity && (
              <p className="text-xs text-muted-foreground">Bracket is full — accepting waitlist only</p>
            )}
          </div>
        )}

        {/* Admin: Generate Pairings */}
        {isAdmin && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {hasExistingMatches
                ? 'Pairings already generated for this throwdown.'
                : `${confirmedCount} confirmed registrant${confirmedCount !== 1 ? 's' : ''} ready for pairing.`}
            </p>
            <button
              onClick={handleGeneratePairings}
              disabled={pairingLoading || confirmedCount < 2 || hasExistingMatches}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Shuffle size={14} />
              {pairingLoading ? 'Generating...' : 'Generate Pairings'}
            </button>
          </div>
        )}

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="relative w-full sm:w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search handle or name…"
              className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-md font-mono text-[10px] tracking-widest transition-colors',
                  filter === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Registrant table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[44px_1fr_140px_80px] sm:grid-cols-[44px_1fr_1fr_140px_100px] gap-4 px-5 py-3 border-b border-border bg-muted/20">
            <span className="label-mono">Seed</span>
            <span className="label-mono">Handle</span>
            <span className="label-mono hidden sm:block">Name</span>
            <span className="label-mono">Registered</span>
            <span className="label-mono">Status</span>
          </div>

          <div className="divide-y divide-border">
            {filtered.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                {search ? 'No registrants match your search.' : 'No registrants yet.'}
              </div>
            )}
            {filtered.map(reg => (
              <div
                key={reg.id}
                className="grid grid-cols-[44px_1fr_140px_80px] sm:grid-cols-[44px_1fr_1fr_140px_100px] gap-4 items-center px-5 py-3.5 hover:bg-muted/10 transition-colors"
              >
                {/* Seed */}
                <div className="flex items-center gap-1.5">
                  {reg.seed !== null && (
                    <span className="w-1.5 h-4 rounded-sm bg-primary/80 shrink-0" />
                  )}
                  <span className="font-mono text-xs text-foreground">
                    {reg.seed !== null ? reg.seed : '—'}
                  </span>
                </div>

                {/* Handle */}
                <span className="text-sm font-medium text-foreground truncate">
                  {reg.profile?.username ?? '—'}
                </span>

                {/* Name (same as handle until we have a display_name field) */}
                <span className="text-sm text-muted-foreground truncate hidden sm:block">
                  {reg.profile?.username ?? '—'}
                </span>

                {/* Registered date */}
                <span className="text-xs text-muted-foreground">
                  {formatDate(reg.registered_at)}
                </span>

                {/* Status + admin remove */}
                <div className="flex items-center gap-2">
                  <StatusBadge status={reg.status} />
                  {isAdmin && (
                    <button
                      onClick={() => handleRemove(reg.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'font-mono text-[9px] tracking-widest px-2 py-1 rounded shrink-0 flex items-center gap-1',
      status === 'confirmed' && 'bg-primary/15 text-primary',
      status === 'waitlist' && 'bg-muted text-muted-foreground',
      status === 'pending' && 'bg-upcoming/15 text-upcoming',
    )}>
      {status.toUpperCase()}
    </span>
  )
}
