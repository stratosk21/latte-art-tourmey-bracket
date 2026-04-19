import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/screens/sidebar'
import { NavigationProvider, ProgressBar } from '@/components/navigation-progress'
import { PageTransition } from '@/components/page-transition'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return (
    <NavigationProvider>
      <div className="h-screen bg-background text-foreground flex overflow-hidden">
        <ProgressBar />
        <Sidebar isAdmin={profile?.is_admin ?? false} />
        <PageTransition>
          {children}
        </PageTransition>
      </div>
    </NavigationProvider>
  )
}
