'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { RegistrantsView } from './registrants-view'
import { ThrowdownBracket } from './throwdown-bracket'
import type { Throwdown, Registration, Match } from '@/lib/supabase/types'

type Tab = 'registrants' | 'bracket'

interface ThrowdownDetailProps {
  throwdown: Throwdown
  initialRegistrations: Registration[]
  initialMatches: Match[]
  isAdmin: boolean
  currentUserId: string
}

export function ThrowdownDetail({
  throwdown,
  initialRegistrations,
  initialMatches,
  isAdmin,
  currentUserId,
}: ThrowdownDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('registrants')
  const [matches, setMatches] = useState<Match[]>(initialMatches)

  function handlePairingsGenerated(newMatches: Match[]) {
    setMatches(newMatches)
    setActiveTab('bracket')
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="bg-card border-b border-border px-8 flex items-end gap-1">
        {(['registrants', 'bracket'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-mono text-[10px] tracking-widest uppercase border-b-2 transition-colors -mb-px',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'registrants' && (
        <RegistrantsView
          throwdown={throwdown}
          initialRegistrations={initialRegistrations}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          hasExistingMatches={matches.length > 0}
          onPairingsGenerated={handlePairingsGenerated}
        />
      )}
      {activeTab === 'bracket' && (
        <ThrowdownBracket throwdown={throwdown} initialMatches={matches} />
      )}
    </div>
  )
}
