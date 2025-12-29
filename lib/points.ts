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

  if (!userId || !points) {
    console.error("Invalid userId or points value")
    return false
  }

  try {
    // Check daily limits and prevent duplicates
    if (actionType === "post") {
      const today = new Date().toISOString().split("T")[0]
      const { count, error: countError } = await supabase
        .from("points_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action_type", "post")
        .gte("created_at", today)

      if (countError) {
        console.error("Error checking daily limit:", countError)
        // Continue anyway - don't block if there's an error checking
      } else if (count && count >= DAILY_LIMITS.post) {
        return false
      }
    }

    // For booking, check if points were already awarded recently to avoid duplicates
    // Database triggers award points when booking status changes to 'completed' with action_type 'booking_completed'
    // We use 'booking' action_type, so they won't conflict, but we check anyway as a safeguard
    if (actionType === "booking") {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: recent, error: recentError } = await supabase
        .from("points_history")
        .select("id")
        .eq("user_id", userId)
        .eq("action_type", "booking")
        .gte("created_at", fiveMinutesAgo)
        .limit(1)

      if (!recentError && recent && recent.length > 0) {
        // Points were recently awarded for this action, skip to avoid duplicates
        return true
      }
    }

    if (actionType === "check_in") {
      const today = new Date().toISOString().split("T")[0]
      const { data: existing, error: checkError } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("user_id", userId)
        .eq("check_in_date", today)
        .maybeSingle()

      if (checkError) {
        console.error("Error checking check-in:", checkError)
        // Continue anyway
      } else if (existing) {
        return false
      }

      // Create check-in record
      const { error: insertError } = await supabase.from("daily_checkins").insert({
        user_id: userId,
        check_in_date: today,
        points_earned: points,
      })

      if (insertError) {
        console.error("Error creating check-in record:", insertError)
        // Continue to award points anyway
      }
    }

    // Add points history
    const { error: historyError } = await supabase.from("points_history").insert({
      user_id: userId,
      points: points,
      action_type: actionType,
      description: description || `${actionType} completed`,
    })

    if (historyError) {
      console.error("Error inserting points history:", historyError)
      return false
    }

    // Update user points - fetch current points and increment atomically
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single()

    if (fetchError) {
      console.error("Error fetching profile:", fetchError)
      // Points history was added, so return true
      return true
    }

    if (profile) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ points: (profile.points || 0) + points })
        .eq("id", userId)

      if (updateError) {
        console.error("Error updating user points:", updateError)
        // Points history was added, so we still return true
      }
    }

    // Invia messaggio AI per l'azione (non bloccare se fallisce)
    try {
      const { sendActionMessage } = await import("./ai-messages")
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()
      
      if (profile?.role) {
        const actionDescriptions: Record<keyof typeof POINTS_CONFIG, string> = {
          sign_up: "Registrazione completata",
          onboarding: "Onboarding completato",
          booking: "Prenotazione completata",
          post: "Post pubblicato",
          check_in: "Check-in giornaliero",
          review: "Recensione pubblicata",
        }
        
        const nextStepsMap: Record<keyof typeof POINTS_CONFIG, string[]> = {
          sign_up: ["Completa il tuo profilo", "Scegli il tuo ruolo", "Esplora la piattaforma"],
          onboarding: ["Pubblica il tuo primo post", "Connettiti con altri utenti", "Inizia a esplorare"],
          booking: ["Scrivi una recensione dopo il soggiorno", "Condividi la tua esperienza"],
          post: ["Continua a condividere contenuti", "Interagisci con altri post"],
          check_in: ["Torna domani per altri punti", "Continua a essere attivo"],
          review: ["Scrivi altre recensioni", "Condividi le tue esperienze"],
        }
        
        await sendActionMessage(
          userId,
          actionType,
          actionDescriptions[actionType],
          profile.role,
          points,
          nextStepsMap[actionType]
        )
      }
    } catch (aiError) {
      // Non bloccare se l'AI fallisce
      console.warn("Errore nell'invio del messaggio AI (non critico):", aiError)
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





