import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * GET: Lista utenti approvati dalla waitlist che non hanno ancora completato l'onboarding.
 * Include: mai registrati + registrati ma onboarding_completed = false
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: approvedWaitlist, error: waitlistError } = await supabase
      .from("waitlist_requests")
      .select("id, full_name, email, username, phone_number, role, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })

    if (waitlistError) {
      console.error("Error loading approved waitlist:", waitlistError)
      return NextResponse.json(
        { error: "Errore nel caricamento" },
        { status: 500 }
      )
    }

    if (!approvedWaitlist?.length) {
      return NextResponse.json({ users: [] })
    }

    const waitlistEmailsLower = new Set(
      approvedWaitlist.map((w) => w.email.toLowerCase())
    )

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, onboarding_completed")
      .or("onboarding_completed.is.null,onboarding_completed.eq.false")

    if (profilesError) {
      console.error("Error loading profiles:", profilesError)
    }

    const profileByEmail = new Map<string, { onboarding_completed: boolean | null }>()
    for (const p of profiles || []) {
      const key = p.email?.toLowerCase()
      if (key && waitlistEmailsLower.has(key)) {
        profileByEmail.set(key, { onboarding_completed: p.onboarding_completed })
      }
    }

    const users = approvedWaitlist
      .filter((w) => {
        const profile = profileByEmail.get(w.email.toLowerCase())
        return !(profile && profile.onboarding_completed === true)
      })
      .map((w) => {
        const profile = profileByEmail.get(w.email.toLowerCase())
        return {
          ...w,
          status: (profile ? "onboarding_incomplete" : "not_registered") as
            | "onboarding_incomplete"
            | "not_registered",
        }
      })

    return NextResponse.json({ users })
  } catch (error: unknown) {
    console.error("Error in approved-not-completed:", error)
    return NextResponse.json(
      { error: (error as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}
