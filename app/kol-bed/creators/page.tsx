"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupabaseClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { Search, Users, Instagram, Youtube, ArrowLeft, User } from "lucide-react"

interface CreatorProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string
  points: number
  creator_level?: string | null
  social_accounts?: Array<{
    platform: string
    username: string
    follower_count: number
    verified: boolean
  }>
  total_followers?: number
}

export default function CreatorsListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [creators, setCreators] = useState<CreatorProfile[]>([])
  const [jollies, setJollies] = useState<CreatorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      loadCreatorsAndJollies()
    }
  }, [status, session, router])

  const loadCreatorsAndJollies = async () => {
    try {
      // Load creators
      const { data: creatorsData, error: creatorsError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "creator")
        .order("created_at", { ascending: false })

      if (creatorsError) throw creatorsError

      // Load jollies
      const { data: jolliesData, error: jolliesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "jolly")
        .order("created_at", { ascending: false })

      if (jolliesError) throw jolliesError

      // Load social accounts for creators
      const creatorIds = (creatorsData || []).map((c) => c.id)
      let socialAccountsMap: { [key: string]: any[] } = {}

      if (creatorIds.length > 0) {
        const { data: socialData } = await supabase
          .from("social_accounts")
          .select("*")
          .in("user_id", creatorIds)

        socialAccountsMap = (socialData || []).reduce((acc, account) => {
          if (!acc[account.user_id]) {
            acc[account.user_id] = []
          }
          acc[account.user_id].push(account)
          return acc
        }, {} as { [key: string]: any[] })
      }

      // Enrich creators with social data
      const enrichedCreators = (creatorsData || []).map((creator) => {
        const socialAccounts = socialAccountsMap[creator.id] || []
        const totalFollowers = socialAccounts.reduce(
          (sum, acc) => sum + (acc.follower_count || 0),
          0
        )

        return {
          ...creator,
          social_accounts: socialAccounts,
          total_followers: totalFollowers,
        }
      })

      setCreators(enrichedCreators)
      setJollies(jolliesData || [])
    } catch (error) {
      console.error("Error loading creators and jollies:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCreators = creators.filter(
    (c) =>
      c.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredJollies = jollies.filter(
    (m) =>
      m.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
          <h1 className="text-3xl font-bold mb-2">Creator e Jolly</h1>
          <p className="text-muted-foreground">
            Esplora i creator e jolly disponibili per collaborazioni
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, username o bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Creators Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Creator ({filteredCreators.length})
          </h2>
          {filteredCreators.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nessun creator trovato
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCreators.map((creator) => (
                <Card
                  key={creator.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/profile/${creator.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
                        {creator.avatar_url ? (
                          <Image
                            src={creator.avatar_url}
                            alt={creator.username || creator.full_name || "Creator"}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <User className="w-8 h-8 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">
                            {creator.full_name || creator.username || "Creator"}
                          </h3>
                          {creator.creator_level && (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${
                              creator.creator_level === "Starter" ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200" :
                              creator.creator_level === "Rising" ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200" :
                              creator.creator_level === "Influencer" ? "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200" :
                              creator.creator_level === "Elite" ? "bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200" :
                              creator.creator_level === "Icon" ? "bg-gradient-to-r from-yellow-200 to-orange-200 dark:from-yellow-800 dark:to-orange-800 text-yellow-900 dark:text-yellow-100" :
                              "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                            }`}>
                              {creator.creator_level}
                            </span>
                          )}
                        </div>
                        {creator.username && (
                          <p className="text-sm text-muted-foreground truncate">
                            @{creator.username}
                          </p>
                        )}
                        {creator.bio && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {creator.bio}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {creator.total_followers !== undefined && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{creator.total_followers.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-primary">
                            <span>⭐</span>
                            <span>{creator.points || 0}</span>
                          </div>
                        </div>
                        {creator.social_accounts && creator.social_accounts.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {creator.social_accounts.slice(0, 2).map((account, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                {account.platform === "instagram" && (
                                  <Instagram className="w-3 h-3 text-pink-500" />
                                )}
                                {account.platform === "youtube" && (
                                  <Youtube className="w-3 h-3 text-red-500" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Jollies Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Jolly ({filteredJollies.length})
          </h2>
          {filteredJollies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nessun jolly trovato
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJollies.map((jolly) => (
                <Card
                  key={jolly.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/profile/${jolly.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
                        {jolly.avatar_url ? (
                          <Image
                            src={jolly.avatar_url}
                            alt={jolly.username || jolly.full_name || "Jolly"}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <User className="w-8 h-8 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {jolly.full_name || jolly.username || "Jolly"}
                        </h3>
                        {jolly.username && (
                          <p className="text-sm text-muted-foreground truncate">
                            @{jolly.username}
                          </p>
                        )}
                        {jolly.bio && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {jolly.bio}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                          <span>⭐</span>
                          <span>{jolly.points || 0} punti</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



