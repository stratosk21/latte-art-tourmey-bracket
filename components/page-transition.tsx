'use client'

import { usePathname } from 'next/navigation'
import { useNavigation } from './navigation-progress'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  DashboardSkeleton,
  ThrowdownDetailSkeleton,
  ArchiveSkeleton,
  AdminSkeleton,
} from './ui/skeletons'
import type { ComponentType } from 'react'

function skeletonFor(path: string): ComponentType | null {
  if (path === '/dashboard') return DashboardSkeleton
  if (path === '/archive') return ArchiveSkeleton
  if (path === '/match-control') return AdminSkeleton
  if (path.startsWith('/throwdown/')) return ThrowdownDetailSkeleton
  return null
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { pending } = useNavigation()
  const [visibleSkeleton, setVisibleSkeleton] = useState<ComponentType | null>(null)
  const [exiting, setExiting] = useState(false)
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>()
  const lastSkeletonRef = useRef<ComponentType | null>(null)

  useEffect(() => {
    if (pending) {
      clearTimeout(fadeTimer.current)
      setExiting(false)
      const Skel = skeletonFor(pending)
      lastSkeletonRef.current = Skel
      setVisibleSkeleton(() => Skel)
    } else if (lastSkeletonRef.current) {
      // Fade out instead of instant removal
      setExiting(true)
      fadeTimer.current = setTimeout(() => {
        setVisibleSkeleton(null)
        setExiting(false)
        lastSkeletonRef.current = null
      }, 220)
    }
    return () => clearTimeout(fadeTimer.current)
  }, [pending])

  const Skeleton = visibleSkeleton

  return (
    <div className="flex-1 min-w-0 overflow-auto relative">
      <div key={pathname} className="page-enter">
        {children}
      </div>
      {Skeleton && (
        <div
          className={cn(
            'absolute inset-0 z-10 bg-background overflow-auto transition-opacity duration-200',
            exiting ? 'opacity-0' : 'opacity-100',
          )}
        >
          <Skeleton />
        </div>
      )}
    </div>
  )
}
