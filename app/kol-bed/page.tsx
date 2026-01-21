"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Profile } from "@/types/user"
import Image from "next/image"
import Link from "next/link"
import { Building2, ArrowRight, Search, Users, Eye, Instagram, Youtube, User } from "lucide-react"

interface CreatorProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string
  points: number
  social_accounts?: Array<{
    platform: string
    username: string
    follower_count: number
    verified: boolean
  }>
  total_followers?: number
  profile_views?: number
}

export default function KOLBedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [creators, setCreators] = useState<CreatorProfile[]>([])
  const [loadingCreators, setLoadingCreators] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated" && session?.user?.id) {
      loadProfile()
      loadCreators()
    }
  }, [status, session, router])

  const loadCreators = async () => {
    try {
      setLoadingCreators(true)
      
      // Carica tutti i creators
      const { data: creatorsData, error: creatorsError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "creator")
        .order("created_at", { ascending: false })

      if (creatorsError) throw creatorsError

      // Carica social accounts per tutti i creators
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

      // Carica views del profilo per tutti i creators
      const viewsMap: { [key: string]: number } = {}
      if (creatorIds.length > 0) {
        // Prova prima da creator_manual_analytics
        const { data: analyticsData } = await supabase
          .from("creator_manual_analytics")
          .select("creator_id, profile_views")
          .in("creator_id", creatorIds)

        analyticsData?.forEach((analytics) => {
          if (analytics.profile_views) {
            viewsMap[analytics.creator_id] = analytics.profile_views
          }
        })

        // Se non ci sono analytics manuali, conta da profile_views
        for (const creatorId of creatorIds) {
          if (!viewsMap[creatorId]) {
            const { count } = await supabase
              .from("profile_views")
              .select("*", { count: "exact", head: true })
              .eq("profile_id", creatorId)

            if (count !== null) {
              viewsMap[creatorId] = count
            }
          }
        }
      }

      // Arricchisci creators con social data e views
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
          profile_views: viewsMap[creator.id] || 0,
        }
      })

      setCreators(enrichedCreators)
    } catch (error) {
      console.error("Error loading creators:", error)
    } finally {
      setLoadingCreators(false)
    }
  }

  const loadProfile = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (error) throw error
      setProfile(data as Profile)
    } catch (error) {
      console.error("Error loading profile:", error)
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

  if (loading || status === "loading" || loadingCreators) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Mostra sempre tutti i creators con follower e views
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="mb-8 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">KOL&BED</h1>
          <p className="text-muted-foreground text-lg">
            La piattaforma che connette Key Opinion Leaders e strutture ricettive
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca creator per nome, username o bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-2xl"
            />
          </div>
        </div>

        {/* Creators List */}
        {filteredCreators.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">
              {searchQuery ? "Nessun creator trovato" : "Nessun creator registrato"}
            </p>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              {filteredCreators.length} {filteredCreators.length === 1 ? "creator trovato" : "creators trovati"}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCreators.map((creator) => (
                <Card
                  key={creator.id}
                  className="overflow-hidden border border-gray-200/60 shadow-xl shadow-gray-200/50 bg-white/98 backdrop-blur-sm rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-200/40 hover:scale-[1.02] hover:-translate-y-1 cursor-pointer"
                  onClick={() => router.push(`/profile/${creator.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-200/60 hover:ring-4 hover:ring-purple-200/50 transition-all duration-200">
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
                        <h3 className="font-semibold text-lg truncate text-foreground">
                          {creator.full_name || creator.username || "Creator"}
                        </h3>
                        {creator.username && (
                          <p className="text-sm text-muted-foreground truncate">
                            @{creator.username}
                          </p>
                        )}
                      </div>
                    </div>

                    {creator.bio && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {creator.bio}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl p-3 border border-blue-100/50 dark:border-blue-800/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Follower</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {(creator.total_followers || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-3 border border-purple-100/50 dark:border-purple-800/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Views</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {(creator.profile_views || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Social Accounts */}
                    {creator.social_accounts && creator.social_accounts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {creator.social_accounts.slice(0, 3).map((account, idx) => {
                          const Icon = account.platform === "instagram" ? Instagram :
                                     account.platform === "youtube" ? Youtube : null
                          return Icon ? (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs border border-gray-200/50 dark:border-gray-700/50"
                            >
                              <Icon className="h-3 w-3 text-foreground" />
                              <span className="font-medium text-foreground">{account.follower_count.toLocaleString()}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}

                    <Button asChild className="w-full rounded-2xl" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/profile/${creator.id}`}>
                        Vedi Profilo
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
