'use client'

import { WavePattern } from '@/components/wave-pattern'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'

export function LoginPage() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  async function handleDiscordLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
            SYSTEM /
          </span>
          <span className="font-mono text-sm font-bold tracking-widest text-foreground">
            THROWDOWN
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="label-mono hidden md:block">Latte Art Tournament</span>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-md border border-border hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={14} className="text-muted-foreground" /> : <Moon size={14} className="text-muted-foreground" />}
          </button>
        </div>
      </header>

      <main className="flex-1 grid md:grid-cols-2">
        <div className="flex flex-col justify-between p-10 md:p-16 border-r border-border">
          <div className="space-y-8">
            <div>
              <p className="label-mono mb-2">Series</p>
              <p className="text-sm text-foreground">Spring Throwdown 2026</p>
              <p className="text-sm text-muted-foreground">Regional Open</p>
            </div>
            <div>
              <p className="label-mono mb-3">Format</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-primary font-bold">01</span>
                  <span className="text-sm font-semibold text-foreground">Qualifying Round (Active)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">02</span>
                  <span className="text-sm text-muted-foreground">Top 16 Bracket</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">03</span>
                  <span className="text-sm text-muted-foreground">Semifinals</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">04</span>
                  <span className="text-sm text-muted-foreground">Grand Final</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="label-mono mb-3">Access</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sign in with your Discord account to view live brackets, track past throwdowns, and follow your favourite baristas.
              </p>
            </div>

            <button
              onClick={handleDiscordLogin}
              className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 px-6 rounded-md font-medium transition-colors"
            >
              <DiscordIcon />
              <span>Continue with Discord</span>
            </button>

            <p className="font-mono text-[10px] text-muted-foreground/50 tracking-wider">
              THROWDOWN-2026 / AUTH-V1 / DISCORD-OAUTH2
            </p>
          </div>
        </div>

        <div className="relative hidden md:flex items-center justify-center overflow-hidden bg-primary/5">
          <div className="absolute inset-0">
            <WavePattern opacity={0.55} density={72} animated />
          </div>
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <span className="label-mono">Wave Field / Tournament Topology</span>
            <span className="label-mono">2026</span>
          </div>
          <div className="absolute top-6 left-6">
            <div className="flex flex-col gap-1">
              <span className="label-mono">THROWDOWN-REF: 2026</span>
              <span className="label-mono">SEASON / SPRING</span>
            </div>
          </div>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 origin-center">
            <span className="label-mono whitespace-nowrap">
              Bracket / Match History / Live Scores
            </span>
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-between px-8 py-3 border-t border-border">
        <div className="flex items-center gap-4">
          <div className="flex gap-0.5 items-end">
            {[1,0,1,1,0,1,0,0,1,1,0,1,1,0,0,1,0,1,1,0,1,0,1,1,0,1,0,0].map((tall, i) => (
              <div
                key={i}
                className="w-1.5 bg-foreground/40"
                style={{ height: tall ? '16px' : '8px' }}
              />
            ))}
          </div>
          <span className="label-mono">THROWDOWN-SYS-V1</span>
        </div>
        <span className="label-mono hidden sm:block">PRINTED IN COMPETITIVE</span>
      </footer>
    </div>
  )
}

function DiscordIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C7.41566 50.7087 14.2186 53.9874 20.8989 56.1652C20.9913 56.1934 21.0892 56.1596 21.1481 56.0846C22.7656 53.8928 24.2098 51.5845 25.4513 49.1564C25.5129 49.0361 25.4541 48.8934 25.3251 48.8454C23.0888 47.9908 20.9576 46.9471 18.9046 45.7751C18.7615 45.6941 18.7503 45.4893 18.8825 45.3914C19.3168 45.0717 19.7511 44.7381 20.1659 44.4017C20.2303 44.3492 20.3199 44.3379 20.3955 44.3718C32.0584 49.7282 44.7196 49.7282 56.2359 44.3718C56.3115 44.3351 56.4011 44.3464 56.4683 44.3989C56.8831 44.7353 57.3174 45.0717 57.7545 45.3914C57.8867 45.4893 57.8783 45.6941 57.7352 45.7751C55.6822 46.9697 53.5510 47.9908 51.3119 48.8426C51.1829 48.8906 51.1269 49.0361 51.1885 49.1564C52.4523 51.5817 53.8964 53.89 55.4916 56.0818C55.5477 56.1596 55.6484 56.1934 55.7408 56.1652C62.4519 53.9874 69.2548 50.7087 76.2847 45.5576C76.3379 45.5182 76.3715 45.459 76.3771 45.3942C77.8883 30.0791 73.7668 16.7757 65.1526 4.9823C65.1330 4.9429 65.0994 4.9147 65.0602 4.8978H60.1045Z"
        fill="currentColor"
      />
    </svg>
  )
}
