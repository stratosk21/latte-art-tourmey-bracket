'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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
import { useNavigation } from '@/components/navigation-progress'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  isAdmin: boolean
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/archive', label: 'Match Archive', icon: History },
]

const adminItems = [
  { href: '/match-control', label: 'Match Control', icon: ShieldCheck },
]

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { pending, navigate } = useNavigation()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = theme === 'dark'

  async function handleSignOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Sign out error:', error.message)
    router.push('/login')
  }

  function NavButton({
    href,
    label,
    icon: Icon,
  }: {
    href: string
    label: string
    icon: React.ElementType
  }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    const isPend = pending === href && !active

    return (
      <button
        onClick={() => navigate(href)}
        className={cn(
          'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors overflow-hidden',
          active
            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
            : isPend
            ? 'bg-sidebar-accent/50 text-sidebar-foreground/80'
            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        )}
      >
        {isPend && <div className="nav-pending-shimmer absolute inset-0" />}
        <Icon size={14} className={cn('shrink-0 relative', !active && !isPend && 'opacity-60')} />
        <span className="relative">{label}</span>
        {isPend && (
          <span className="nav-pending-dot relative ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </button>
    )
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

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="label-mono px-2 mb-2 text-sidebar-foreground/30">Navigation</p>
        {navItems.map((item) => (
          <NavButton key={item.href} {...item} />
        ))}

        {isAdmin && (
          <div className="pt-4">
            <p className="label-mono px-2 mb-2 text-sidebar-foreground/30">Admin</p>
            {adminItems.map((item) => (
              <NavButton key={item.href} {...item} />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 space-y-1 pt-4 border-t border-sidebar-border mt-4">
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {mounted ? (isDark ? <Sun size={14} /> : <Moon size={14} />) : <Moon size={14} />}
          <span>{mounted ? (isDark ? 'Light Mode' : 'Dark Mode') : 'Light Mode'}</span>
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
