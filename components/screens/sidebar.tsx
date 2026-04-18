'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutGrid,
  History,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  isAdmin: boolean
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid, mono: '01' },
  { href: '/archive', label: 'Match Archive', icon: History, mono: '02' },
]

const adminItems = [
  { href: '/admin', label: 'Match Control', icon: ShieldCheck, mono: '03' },
]

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  async function handleSignOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Sign out error:', error.message)
    router.push('/login')
  }

  return (
    <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col py-5 shrink-0">
      {/* Brand */}
      <div className="px-5 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={14} className="text-sidebar-primary" />
          <span className="font-mono text-[10px] tracking-widest uppercase text-sidebar-foreground/50">
            System
          </span>
        </div>
        <h1 className="font-mono text-base font-bold tracking-widest text-sidebar-foreground">
          THROWDOWN
        </h1>
        <p className="label-mono text-sidebar-foreground/40 mt-0.5">Spring 2026</p>
      </div>

      {/* Live indicator */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 bg-live/10 border border-live/20 rounded-md px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
          <span className="font-mono text-[10px] text-live tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="label-mono px-2 mb-2 text-sidebar-foreground/30">Navigation</p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <span className="font-mono text-[9px] text-sidebar-foreground/30 w-5 shrink-0">
                {item.mono}
              </span>
              <item.icon size={14} className="shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {isAdmin && (
          <div className="pt-4">
            <p className="label-mono px-2 mb-2 text-sidebar-foreground/30">Admin</p>
            {adminItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <span className="font-mono text-[9px] text-sidebar-foreground/30 w-5 shrink-0">
                    {item.mono}
                  </span>
                  <item.icon size={14} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 space-y-1 pt-4 border-t border-sidebar-border mt-4">
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="px-5 mt-4">
        <p className="font-mono text-[9px] text-sidebar-foreground/20 tracking-wider">
          THROWDOWN-SYS-V1
        </p>
      </div>
    </aside>
  )
}
