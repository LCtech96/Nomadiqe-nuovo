"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Profile } from "@/types/user"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  if (!session) {
    return null
  }

  // Redirect based on role
  const getDashboardUrl = (role: string | null) => {
    switch (role) {
      case "host":
        return "/dashboard/host"
      case "creator":
        return "/dashboard/creator"
      case "manager":
        return "/dashboard/manager"
      case "traveler":
      default:
        return "/dashboard/traveler"
    }
  }

  // This will be replaced with actual profile fetch
  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Traveler</CardTitle>
              <CardDescription>Dashboard viaggiatore</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/traveler">Vai</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Host</CardTitle>
              <CardDescription>Dashboard host</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/host">Vai</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Creator</CardTitle>
              <CardDescription>Dashboard creator</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/creator">Vai</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Manager</CardTitle>
              <CardDescription>Dashboard manager</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/manager">Vai</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

