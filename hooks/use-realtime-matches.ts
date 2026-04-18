'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/lib/supabase/types'

export function useRealtimeMatches(throwdownId: string, initialMatches: Match[]) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`throwdown-${throwdownId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `throwdown_id=eq.${throwdownId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMatches(prev => [...prev, payload.new as Match])
          } else if (payload.eventType === 'UPDATE') {
            setMatches(prev =>
              prev.map(m => m.id === (payload.new as Match).id ? payload.new as Match : m)
            )
          } else if (payload.eventType === 'DELETE') {
            setMatches(prev => prev.filter(m => m.id !== (payload.old as Match).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [throwdownId])

  return matches
}
