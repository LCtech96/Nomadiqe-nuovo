export type UserRole = "traveler" | "host" | "creator" | "manager"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  role: UserRole | null
  bio: string | null
  onboarding_completed: boolean
  onboarding_step: number
  points: number
  created_at: string
  updated_at: string
}






