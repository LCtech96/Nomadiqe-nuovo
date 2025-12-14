"use client"

import { Suspense, useEffect } from "react"
import InteractiveGuide from "@/components/onboarding/interactive-guide"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { createSupabaseClient } from "@/lib/supabase/client"

function GuideContent() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const supabase = createSupabaseClient()

  useEffect(() => {
    const checkRole = async () => {
      if (status === "unauthenticated") {
        router.push("/auth/signin")
        return
      }

      if (status !== "authenticated" || !session?.user?.id) {
        return
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()

        // Se l'utente non ha ancora scelto un ruolo, reindirizza all'onboarding
        if (!profile?.role) {
          router.push("/onboarding")
        }
      } catch (error) {
        console.error("Error checking role:", error)
      }
    }

    checkRole()
  }, [status, session, router, supabase])

  return (
    <InteractiveGuide
      onComplete={() => {
        router.push("/home")
      }}
    />
  )
}

export default function GuidePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Caricamento guida...</p>
        </div>
      </div>
    }>
      <GuideContent />
    </Suspense>
  )
}
