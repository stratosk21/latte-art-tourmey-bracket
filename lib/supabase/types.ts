export type ThrowdownStatus = 'upcoming' | 'live' | 'completed'

export interface Throwdown {
  id: string
  title: string
  description: string | null
  status: ThrowdownStatus
  ends_at: string | null
  winner_id: string | null
  created_at: string
}

export interface Profile {
  id: string
  discord_id: string
  username: string
  avatar_url: string | null
  created_at: string
  is_admin: boolean
}

export interface Submission {
  id: string
  throwdown_id: string
  profile_id: string
  image_url: string
  created_at: string
  profile?: Profile
}

export interface Match {
  id: string
  throwdown_id: string
  round: number
  position: number
  submission_a_id: string | null
  submission_b_id: string | null
  winner_id: string | null
  created_at: string
  submission_a?: Submission & { profile: Profile }
  submission_b?: Submission & { profile: Profile }
  winner?: Submission & { profile: Profile }
}
