import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThrowdownBracket } from '@/components/screens/throwdown-bracket'

export default async function ThrowdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: throwdown } = await supabase
    .from('throwdowns')
    .select('*')
    .eq('id', id)
    .single()

  if (!throwdown) notFound()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      submission_a:submission_a_id(*, profile:profile_id(*)),
      submission_b:submission_b_id(*, profile:profile_id(*)),
      winner:winner_id(*, profile:profile_id(*))
    `)
    .eq('throwdown_id', id)
    .order('round', { ascending: true })
    .order('position', { ascending: true })

  return (
    <ThrowdownBracket
      throwdown={throwdown}
      initialMatches={matches ?? []}
    />
  )
}
