'use client'

import { usePathname } from 'next/navigation'
import { useNavigation } from './navigation-progress'
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
  const Skeleton = pending ? skeletonFor(pending) : null

  return (
    <div className="flex-1 min-w-0 overflow-auto relative">
      <div key={pathname} className="page-enter">
        {children}
      </div>
      {Skeleton && (
        <div className="absolute inset-0 z-10 bg-background overflow-auto">
          <Skeleton />
        </div>
      )}
    </div>
  )
}
