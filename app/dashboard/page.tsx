"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Profile } from "@/types/user"

const getDashboardUrl = (role: string | null): string => {
  switch (role) {
    case "host":
      return "/dashboard/host"
    case "creator":
      return "/dashboard/creator"
    case "jolly":
      return "/dashboard/jolly"
    case "traveler":
    default:
      return "/dashboard/traveler"
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "loading" || !session?.user?.id) {
      return
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (error) throw error

        if (data) {
          setProfile(data)
          
          // Redirect to role-specific dashboard if user has a role
          if (data.role) {
            router.push(getDashboardUrl(data.role))
            return
          }

          // If no role, redirect to onboarding
          router.push("/onboarding")
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [status, session, router, supabase])

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  if (!session) {
    return null
  }

  // This should not be reached as we redirect above, but just in case
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Reindirizzamento...</div>
    </div>
  )
}

