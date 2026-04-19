import { createClient } from '@/lib/supabase/server'
import { PastMatchesView } from '@/components/screens/past-matches-view'

export default async function ArchivePage() {
  const supabase = await createClient()

  const { data: throwdowns, error } = await supabase
    .from('throwdowns')
    .select(`
      *,
      match_count:matches(count)
    `)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (error) throw error

  return <PastMatchesView throwdowns={throwdowns ?? []} />
}
