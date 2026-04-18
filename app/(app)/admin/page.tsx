import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminView } from '@/components/screens/admin-view'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  const { data: throwdowns } = await supabase
    .from('throwdowns')
    .select('*')
    .order('created_at', { ascending: false })

  const firstId = throwdowns?.[0]?.id ?? null

  const { data: initialMatches } = firstId ? await supabase
    .from('matches')
    .select(`
      *,
      submission_a:submission_a_id(*, profile:profile_id(*)),
      submission_b:submission_b_id(*, profile:profile_id(*)),
      winner:winner_id(*, profile:profile_id(*))
    `)
    .eq('throwdown_id', firstId)
    .order('round', { ascending: true })
    .order('position', { ascending: true }) : { data: [] }

  return (
    <AdminView
      throwdowns={throwdowns ?? []}
      initialMatches={initialMatches ?? []}
      initialThrowdownId={firstId}
    />
  )
}
