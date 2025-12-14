import { createSupabaseClient } from "./supabase/client"

export const POINTS_CONFIG = {
  sign_up: 100,
  onboarding: 75,
  booking: 50,
  post: 15,
  check_in: 10,
  review: 25,
} as const

export const DAILY_LIMITS = {
  post: 5,
  check_in: 1,
} as const

export async function awardPoints(
  userId: string,
  actionType: keyof typeof POINTS_CONFIG,
  description?: string
): Promise<boolean> {
  const supabase = createSupabaseClient()
  const points = POINTS_CONFIG[actionType]

  try {
    // Check daily limits
    if (actionType === "post") {
      const today = new Date().toISOString().split("T")[0]
      const { count } = await supabase
        .from("points_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action_type", "post")
        .gte("created_at", today)

      if (count && count >= DAILY_LIMITS.post) {
        return false
      }
    }

    if (actionType === "check_in") {
      const today = new Date().toISOString().split("T")[0]
      const { data: existing } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("user_id", userId)
        .eq("check_in_date", today)
        .single()

      if (existing) {
        return false
      }

      // Create check-in record
      await supabase.from("daily_checkins").insert({
        user_id: userId,
        check_in_date: today,
        points_earned: points,
      })
    }

    // Add points history
    await supabase.from("points_history").insert({
      user_id: userId,
      points: points,
      action_type: actionType,
      description: description || `${actionType} completed`,
    })

    // Update user points
    const { data: profile } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single()

    if (profile) {
      await supabase
        .from("profiles")
        .update({ points: profile.points + points })
        .eq("id", userId)
    }

    return true
  } catch (error) {
    console.error("Error awarding points:", error)
    return false
  }
}

export async function getPointsHistory(userId: string, limit = 20) {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from("points_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching points history:", error)
    return []
  }

  return data || []
}




