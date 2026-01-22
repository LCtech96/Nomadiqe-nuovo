"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Instagram, Youtube, TrendingUp } from "lucide-react"

interface Collaboration {
  id: string
  host_id: string
  property_id: string
  collaboration_type: string
  status: string
  property: {
    name: string
    city: string
    country: string
  }
  host: {
    username: string
    full_name: string
  }
}

export default function CreatorDashboard() {
  const { data: session } = useSession()
  const supabase = createSupabaseClient()
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [socialAccounts, setSocialAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      loadData()
    }
  }, [session])

  const loadData = async () => {
    try {
      // Load collaborations
      const { data: collabsData, error: collabsError } = await supabase
        .from("collaborations")
        .select(`
          *,
          property:properties(id, name, city, country),
          host:profiles!collaborations_host_id_fkey(username, full_name)
        `)
        .eq("creator_id", session!.user.id)
        .order("created_at", { ascending: false })

      if (collabsError) throw collabsError
      setCollaborations(collabsData || [])

      // Load social accounts
      const { data: socialData, error: socialError } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", session!.user.id)

      if (socialError) throw socialError
      setSocialAccounts(socialData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 p-8">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Creator</h1>
          <p className="text-muted-foreground">Gestisci le tue collaborazioni e contenuti</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Account social</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{socialAccounts.length}</p>
              <p className="text-sm text-muted-foreground">Account collegati</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collaborazioni attive</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {collaborations.filter((c) => c.status === "accepted").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totale collaborazioni</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{collaborations.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Account social collegati</CardTitle>
              <CardDescription>Collega i tuoi account per mostrare le statistiche</CardDescription>
            </CardHeader>
            <CardContent>
              {socialAccounts.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Nessun account social collegato
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/creator/social">
                      <Instagram className="w-4 h-4 mr-2" />
                      Collega account
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {socialAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {account.platform === "instagram" && (
                          <Instagram className="w-5 h-5" />
                        )}
                        {account.platform === "youtube" && (
                          <Youtube className="w-5 h-5" />
                        )}
                        <div>
                          <p className="font-semibold">@{account.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {account.follower_count.toLocaleString()} follower
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Le tue collaborazioni</CardTitle>
              <CardDescription>Gestisci le partnership con gli host</CardDescription>
            </CardHeader>
            <CardContent>
              {collaborations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna collaborazione ancora
                </p>
              ) : (
                <div className="space-y-3">
                  {collaborations.map((collab) => (
                    <div key={collab.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{collab.property.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {collab.property.city}, {collab.property.country}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            collab.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : collab.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {collab.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tipo: {collab.collaboration_type.replace("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

