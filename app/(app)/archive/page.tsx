import { createClient } from '@/lib/supabase/server'
import { PastMatchesView } from '@/components/screens/past-matches-view'

export default async function ArchivePage() {
  const supabase = await createClient()

  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      *,
      submission_a:submission_a_id(*, profile:profile_id(*)),
      submission_b:submission_b_id(*, profile:profile_id(*)),
      winner:winner_id(*, profile:profile_id(*))
    `)
    .not('winner_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return <PastMatchesView matches={matches ?? []} />
}
