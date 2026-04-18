import { createClient } from '@/lib/supabase/server'
import { DashboardHome } from '@/components/screens/dashboard-home'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: throwdowns } = await supabase
    .from('throwdowns')
    .select('*')
    .order('created_at', { ascending: false })

  return <DashboardHome throwdowns={throwdowns ?? []} />
}
