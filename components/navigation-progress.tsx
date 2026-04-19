'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type NavCtx = {
  pending: string | null
  navigate: (href: string) => void
}

const NavigationContext = createContext<NavCtx>({ pending: null, navigate: () => {} })

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  // Without loading.tsx, pathname only updates when new content is committed —
  // no optimistic update — so this clears at exactly the right time.
  useEffect(() => {
    setPending(null)
  }, [pathname])

  const navigate = useCallback(
    (href: string) => {
      if (pending === href) return
      setPending(href)
      router.push(href)
    },
    [pending, router]
  )

  return (
    <NavigationContext.Provider value={{ pending, navigate }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}

export function ProgressBar() {
  const { pending } = useNavigation()
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (pending) setKey((k) => k + 1)
  }, [pending])

  if (!pending) return null

  return <div key={key} className="nav-progress-bar" />
}
