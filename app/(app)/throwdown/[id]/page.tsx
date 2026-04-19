import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThrowdownDetail } from '@/components/screens/throwdown-detail'

export default async function ThrowdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: throwdown } = await supabase
    .from('throwdowns')
    .select('*')
    .eq('id', id)
    .single()

  if (!throwdown) notFound()

  const [matchesResult, registrationsResult, profileResult] = await Promise.all([
    supabase
      .from('matches')
      .select(`
        *,
        submission_a:submission_a_id(*, profile:profile_id(*)),
        submission_b:submission_b_id(*, profile:profile_id(*)),
        winner:winner_id(*, profile:profile_id(*))
      `)
      .eq('throwdown_id', id)
      .order('round', { ascending: true })
      .order('position', { ascending: true }),
    supabase
      .from('registrations')
      .select('*, profile:profile_id(*)')
      .eq('throwdown_id', id)
      .order('seed', { ascending: true, nullsFirst: false }),
    user
      ? supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <ThrowdownDetail
      throwdown={throwdown}
      initialMatches={matchesResult.data ?? []}
      initialRegistrations={registrationsResult.data ?? []}
      isAdmin={profileResult.data?.is_admin ?? false}
      currentUserId={user?.id ?? ''}
    />
  )
}
