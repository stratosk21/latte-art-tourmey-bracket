import { cn } from '@/lib/utils'

// ─── Shimmer primitive ────────────────────────────────────────────────────────

function Shimmer({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn('skel-shimmer rounded', className)}
      style={style}
    />
  )
}

// ─── Dashboard card skeleton ──────────────────────────────────────────────────

function DashboardCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 h-[148px] flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <Shimmer className="h-5 w-14 rounded-sm" style={{ animationDelay: `${delay}ms` }} />
        <Shimmer className="h-3.5 w-3.5 rounded-full" style={{ animationDelay: `${delay + 100}ms` }} />
      </div>
      <Shimmer className="h-3.5 w-4/5 rounded-sm mb-2" style={{ animationDelay: `${delay + 50}ms` }} />
      <Shimmer className="h-2.5 w-11/12 rounded-sm mb-1.5" style={{ animationDelay: `${delay + 150}ms` }} />
      <Shimmer className="h-2.5 w-3/4 rounded-sm" style={{ animationDelay: `${delay + 200}ms` }} />
      <div className="flex-1" />
      <div className="flex items-center gap-1.5">
        <Shimmer className="h-2.5 w-2.5 rounded-full" style={{ animationDelay: `${delay + 250}ms` }} />
        <Shimmer className="h-2 w-28 rounded-sm" style={{ animationDelay: `${delay + 300}ms` }} />
      </div>
    </div>
  )
}

// ─── Dashboard page skeleton ──────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header strip skeleton */}
      <div className="h-44 border-b border-border bg-primary/5 flex flex-col justify-between p-8">
        <div className="flex items-start justify-between">
          <div>
            <Shimmer className="h-3 w-36 mb-2" />
            <Shimmer className="h-7 w-52" />
          </div>
          <Shimmer className="h-3 w-24" />
        </div>
        <Shimmer className="h-3 w-40" />
      </div>

      <div className="p-8 space-y-6">
        <Shimmer className="h-4 w-28" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <DashboardCardSkeleton key={i} delay={i * 80} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Bracket match card skeleton ──────────────────────────────────────────────

function MiniMatchSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className="w-[300px] h-[100px] rounded-md border border-border bg-card overflow-hidden">
      {/* Hairline header — matches real h-[26px] */}
      <div className="px-2.5 border-b border-border/60 flex justify-between items-center h-[26px]">
        <Shimmer className="h-2 w-10 rounded-sm" style={{ animationDelay: `${delay}ms` }} />
        <Shimmer className="h-2 w-7 rounded-sm" style={{ animationDelay: `${delay + 50}ms` }} />
      </div>
      {/* Row A — matches real py-2.5 gap-3 */}
      <div className="px-3.5 py-2.5 flex items-center gap-3 border-b border-border/50">
        <Shimmer className="w-[3px] h-5 rounded-sm" style={{ animationDelay: `${delay + 100}ms` }} />
        <Shimmer className="w-4 h-2.5 rounded-sm" style={{ animationDelay: `${delay + 150}ms` }} />
        <Shimmer className="h-3.5 flex-1" style={{ animationDelay: `${delay + 200}ms` }} />
      </div>
      {/* Row B */}
      <div className="px-3.5 py-2.5 flex items-center gap-3">
        <Shimmer className="w-[3px] h-5 rounded-sm" style={{ animationDelay: `${delay + 150}ms` }} />
        <Shimmer className="w-4 h-2.5 rounded-sm" style={{ animationDelay: `${delay + 200}ms` }} />
        <Shimmer className="h-3.5 w-28" style={{ animationDelay: `${delay + 250}ms` }} />
      </div>
    </div>
  )
}

// ─── Bracket page skeleton ────────────────────────────────────────────────────

export function BracketSkeleton() {
  const CARD_H = 100
  const GAP = 18
  const HEADER_H = 60

  return (
    <div className="min-h-screen bg-background">
      {/* Header — matches real bracket header: bg-card px-8 py-5, text-sm + text-2xl */}
      <div className="border-b border-border bg-card px-8 py-5 shrink-0">
        <div className="flex items-end justify-between">
          <div>
            {/* text-sm label: h-5 = 20px line-height */}
            <Shimmer className="h-5 w-56 mb-1" />
            {/* text-2xl heading: h-7 = ~28px */}
            <Shimmer className="h-7 w-28" style={{ animationDelay: '80ms' }} />
          </div>
          {/* Format button group placeholder */}
          <Shimmer className="h-8 w-32 rounded-md" style={{ animationDelay: '160ms' }} />
        </div>
      </div>

      <div className="p-8 overflow-x-auto">
        <div className="flex items-start gap-0 min-w-max">
          {([4, 2, 1] as const).map((count, ri) => {
            const topPad = ((Math.pow(2, ri) - 1) * (CARD_H + GAP)) / 2
            const cardGap = Math.pow(2, ri) * (CARD_H + GAP) - CARD_H
            return (
              <div key={ri} className="flex items-start">
                <div style={{ width: 300 }}>
                  {/* Round label area — matches real px-1 py-3 h-[60px] */}
                  <div className="px-1 py-3" style={{ height: HEADER_H }}>
                    <Shimmer
                      className="h-3.5 w-24 mb-1"
                      style={{ animationDelay: `${ri * 80}ms` }}
                    />
                    <Shimmer
                      className="h-2.5 w-16"
                      style={{ animationDelay: `${ri * 80 + 100}ms` }}
                    />
                  </div>
                  <div
                    className="flex flex-col"
                    style={{ paddingTop: topPad, gap: cardGap }}
                  >
                    {Array.from({ length: count }).map((_, ci) => (
                      <MiniMatchSkeleton key={ci} delay={(ri * 4 + ci) * 60} />
                    ))}
                  </div>
                </div>
                {ri < 2 && <div style={{ width: 48 }} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Archive page skeleton ────────────────────────────────────────────────────

export function ArchiveSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header strip — matches real h-36 border-b bg-primary/5 p-8 */}
      <div className="h-36 border-b border-border bg-primary/5 flex flex-col justify-between p-8">
        <div>
          <Shimmer className="h-3 w-28 mb-2" />
          <Shimmer className="h-6 w-40" style={{ animationDelay: '50ms' }} />
        </div>
        <Shimmer className="h-3 w-36" style={{ animationDelay: '100ms' }} />
      </div>

      <div className="p-8">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-6 px-5 py-3 border-b border-border bg-muted/30">
            {[80, 36, 64, 40].map((w, i) => (
              <Shimmer key={i} className="h-2.5 rounded-sm justify-self-end first:justify-self-start" style={{ width: w, animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-6 items-center px-5 py-4 border-b border-border last:border-0"
            >
              <div className="flex flex-col gap-1.5">
                <Shimmer className="h-3.5 w-48 rounded-sm" style={{ animationDelay: `${i * 60}ms` }} />
                <Shimmer className="h-2.5 w-64 rounded-sm" style={{ animationDelay: `${i * 60 + 50}ms` }} />
              </div>
              <Shimmer className="h-2.5 w-6 rounded-sm justify-self-end" style={{ animationDelay: `${i * 60 + 80}ms` }} />
              <Shimmer className="h-2.5 w-20 rounded-sm justify-self-end" style={{ animationDelay: `${i * 60 + 100}ms` }} />
              <Shimmer className="h-3 w-3 rounded-sm justify-self-end" style={{ animationDelay: `${i * 60 + 120}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Single match card skeleton ───────────────────────────────────────────────

export function MatchCardSkeleton() {
  return (
    <div className="w-80 rounded border border-border bg-card overflow-hidden">
      {/* header strip */}
      <div className="px-3.5 py-2 border-b border-border/60 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shimmer className="h-2.5 w-9 rounded-sm" />
          <Shimmer className="h-0.5 w-0.5 rounded-full" />
          <Shimmer className="h-2.5 w-14 rounded-sm" style={{ animationDelay: '100ms' }} />
        </div>
        <Shimmer className="h-2.5 w-10 rounded-sm" style={{ animationDelay: '150ms' }} />
      </div>
      {/* two photo placeholders */}
      <div className="grid grid-cols-2 relative">
        <div className="border-r border-border/60">
          <Shimmer className="w-full h-36 rounded-none" style={{ animationDelay: '50ms' }} />
          <div className="px-3 py-2">
            <Shimmer className="h-3.5 w-3/4 rounded-sm" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
        <div>
          <Shimmer className="w-full h-36 rounded-none" style={{ animationDelay: '150ms' }} />
          <div className="px-3 py-2">
            <Shimmer className="h-3.5 w-2/3 rounded-sm" style={{ animationDelay: '250ms' }} />
          </div>
        </div>
        {/* VS chip */}
        <div className="absolute left-1/2 top-[72px] -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center z-10">
          <span className="font-mono text-[11px] font-bold text-muted-foreground/40">VS</span>
        </div>
      </div>
    </div>
  )
}

// ─── Wave loader (initial app boot) ──────────────────────────────────────────

export function WaveLoader() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center overflow-hidden z-50">
      {/* Animated SVG waves */}
      <svg
        className="absolute inset-0 opacity-40 pointer-events-none"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGradLoader" x1="0" x2="1">
            <stop offset="0" stopColor="var(--wave)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--wave)" stopOpacity="0.8" />
            <stop offset="1" stopColor="var(--wave)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 28 }).map((_, i) => (
          <path
            key={i}
            d={`M 0 ${30 + i * 20} Q 25% ${30 + i * 20 - 8}, 50% ${30 + i * 20} T 100% ${30 + i * 20}`}
            stroke="url(#waveGradLoader)"
            strokeWidth="1"
            fill="none"
            style={{
              animation: 'waveFlow 3s ease-in-out infinite',
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </svg>

      <div className="relative z-10 text-center">
        <div
          className="w-14 h-14 rounded-full border-2 border-primary mx-auto mb-5"
          style={{
            borderRightColor: 'transparent',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p className="font-mono text-[11px] tracking-[0.25em] text-primary font-bold mb-1.5">
          BREWING
        </p>
        <p className="text-sm text-muted-foreground">Loading bracket…</p>
      </div>
    </div>
  )
}

// ─── Inline progress bar (fast route switches) ────────────────────────────────

export function InlineProgressBar() {
  return (
    <div className="h-0.5 w-full bg-border relative overflow-hidden">
      <div
        className="absolute h-full w-[30%] bg-primary"
        style={{ animation: 'inline-bar 1.2s ease-in-out infinite' }}
      />
    </div>
  )
}

// ─── Match Control (admin) page skeleton ─────────────────────────────────────

export function AdminSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header strip — matches real h-36 bg-primary/5 */}
      <div className="relative h-36 border-b border-border bg-primary/5 flex flex-col justify-between p-8">
        <div className="flex items-start justify-between">
          <div>
            <Shimmer className="h-2.5 w-36 mb-2" />
            <Shimmer className="h-6 w-44" style={{ animationDelay: '50ms' }} />
          </div>
          <Shimmer className="h-8 w-32 rounded-md" style={{ animationDelay: '100ms' }} />
        </div>
        <Shimmer className="h-2.5 w-52" style={{ animationDelay: '150ms' }} />
      </div>

      <div className="p-8 space-y-6">
        {/* Throwdown selector */}
        <div className="flex items-center gap-4">
          <Shimmer className="h-2.5 w-20 rounded-sm" />
          <Shimmer className="h-9 w-48 rounded-md" style={{ animationDelay: '60ms' }} />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shimmer className="h-8 w-24 rounded-md" style={{ animationDelay: '80ms' }} />
            <Shimmer className="h-8 w-28 rounded-md" style={{ animationDelay: '120ms' }} />
          </div>
        </div>

        {/* Match list */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20">
            <Shimmer className="h-2.5 w-24" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
              <Shimmer className="h-3 w-6 rounded-sm" style={{ animationDelay: `${i * 50}ms` }} />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-3.5 w-48" style={{ animationDelay: `${i * 50 + 30}ms` }} />
                <Shimmer className="h-2.5 w-32" style={{ animationDelay: `${i * 50 + 60}ms` }} />
              </div>
              <Shimmer className="h-5 w-16 rounded-sm" style={{ animationDelay: `${i * 50 + 80}ms` }} />
              <Shimmer className="h-5 w-5 rounded-sm" style={{ animationDelay: `${i * 50 + 100}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Throwdown detail (tabbed) page skeleton ──────────────────────────────────

export function ThrowdownDetailSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Tab bar */}
      <div className="border-b border-border bg-card px-8 flex items-center gap-6 h-11">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-3 w-20" style={{ animationDelay: '80ms' }} />
      </div>

      {/* Registrants tab (default shown in skeleton) */}
      {/* Header strip */}
      <div className="h-36 border-b border-border bg-primary/5 flex flex-col justify-between p-8">
        <div>
          <Shimmer className="h-2.5 w-44 mb-2" />
          <Shimmer className="h-6 w-32" style={{ animationDelay: '50ms' }} />
        </div>
        <Shimmer className="h-2.5 w-28" style={{ animationDelay: '100ms' }} />
      </div>

      <div className="p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <Shimmer className="h-2.5 w-20" style={{ animationDelay: `${i * 60}ms` }} />
              <Shimmer className="h-7 w-12" style={{ animationDelay: `${i * 60 + 50}ms` }} />
            </div>
          ))}
        </div>

        {/* Capacity bar */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <Shimmer className="h-2.5 w-32" />
            <Shimmer className="h-2.5 w-12" style={{ animationDelay: '50ms' }} />
          </div>
          <Shimmer className="h-2 w-full rounded-full" style={{ animationDelay: '80ms' }} />
          <Shimmer className="h-2.5 w-52" style={{ animationDelay: '120ms' }} />
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center justify-between gap-4">
          <Shimmer className="h-9 w-64 rounded-md" />
          <div className="flex items-center gap-2">
            {[40, 60, 48, 48].map((w, i) => (
              <Shimmer key={i} className="h-7 rounded-md" style={{ width: w, animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_1fr_120px_100px] gap-4 px-5 py-3 border-b border-border bg-muted/20">
            {[24, 80, 80, 60, 60].map((w, i) => (
              <Shimmer key={i} className="h-2.5 rounded-sm" style={{ width: w, animationDelay: `${i * 30}ms` }} />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[40px_1fr_1fr_120px_100px] gap-4 items-center px-5 py-3.5 border-b border-border last:border-0">
              <Shimmer className="h-5 w-6 rounded-sm" style={{ animationDelay: `${i * 40}ms` }} />
              <Shimmer className="h-3.5 w-28 rounded-sm" style={{ animationDelay: `${i * 40 + 30}ms` }} />
              <Shimmer className="h-3.5 w-24 rounded-sm" style={{ animationDelay: `${i * 40 + 50}ms` }} />
              <Shimmer className="h-3 w-20 rounded-sm" style={{ animationDelay: `${i * 40 + 70}ms` }} />
              <Shimmer className="h-5 w-20 rounded-sm" style={{ animationDelay: `${i * 40 + 90}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
