"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Plus, Users, MessageSquare, Settings, ArrowRight, MapPin } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import CreateCommunityDialog from "@/components/communities/create-community-dialog"

interface Community {
  id: string
  name: string
  description: string | null
  city: string | null
  country: string | null
  created_by: string
  created_at: string
  member_count: number
  is_admin: boolean
  role: string
}

interface Invitation {
  id: string
  community_id: string
  community: {
    id: string
    name: string
    created_by: string
    creator: {
      id: string
      username: string | null
      full_name: string | null
      avatar_url: string | null
    }
  }
  status: string
  created_at: string
}

export default function CommunitiesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  
  const [communities, setCommunities] = useState<Community[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      loadData()
    }
  }, [status, session, router])

  const loadData = async () => {
    if (!session?.user?.id) return

    try {
      // Carica community di cui l'utente è membro
      const { data: memberships, error: membersError } = await supabase
        .from("host_community_members")
        .select(`
          community_id,
          role,
          status,
          community:host_communities!inner(
            id,
            name,
            description,
            city,
            country,
            created_by,
            created_at
          )
        `)
        .eq("host_id", session.user.id)
        .eq("status", "accepted")

      if (membersError) throw membersError

      // Conta i membri per ogni community
      const communitiesWithCounts = await Promise.all(
        (memberships || []).map(async (membership: any) => {
          const { count } = await supabase
            .from("host_community_members")
            .select("*", { count: "exact", head: true })
            .eq("community_id", membership.community.id)
            .eq("status", "accepted")

          return {
            ...membership.community,
            member_count: count || 0,
            is_admin: membership.role === "admin",
            role: membership.role,
          }
        })
      )

      setCommunities(communitiesWithCounts)

      // Carica inviti pending
      const { data: invData, error: invError } = await supabase
        .from("host_community_invitations")
        .select(`
          id,
          community_id,
          status,
          created_at,
          community:host_communities!inner(
            id,
            name,
            created_by,
            creator:profiles!host_communities_created_by_fkey(
              id,
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .eq("invited_host_id", session.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (invError) throw invError
      
      // Map data to ensure community and creator are objects, not arrays
      const mappedInvitations: Invitation[] = (invData || []).map((inv: any) => {
        const community = Array.isArray(inv.community) ? inv.community[0] : inv.community
        const creator = Array.isArray(community?.creator) ? community?.creator[0] : community?.creator
        
        return {
          id: inv.id,
          community_id: inv.community_id,
          status: inv.status,
          created_at: inv.created_at,
          community: {
            id: community?.id,
            name: community?.name,
            created_by: community?.created_by,
            creator: creator || null,
          },
        }
      })
      
      setInvitations(mappedInvitations)
    } catch (error: any) {
      console.error("Error loading communities:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare le community. Riprova più tardi.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async (invitationId: string, communityId: string) => {
    try {
      const { error } = await supabase.rpc("accept_community_invitation", {
        invitation_id_param: invitationId,
      })

      if (error) throw error

      toast({
        title: "Successo",
        description: "Invito accettato! Sei ora membro della community.",
      })

      loadData()
    } catch (error: any) {
      console.error("Error accepting invitation:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile accettare l'invito.",
        variant: "destructive",
      })
    }
  }

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase.rpc("reject_community_invitation", {
        invitation_id_param: invitationId,
      })

      if (error) throw error

      toast({
        title: "Invito rifiutato",
        description: "L'invito è stato rifiutato.",
      })

      loadData()
    } catch (error: any) {
      console.error("Error rejecting invitation:", error)
      toast({
        title: "Errore",
        description: "Impossibile rifiutare l'invito.",
        variant: "destructive",
      })
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 p-4 md:p-8 pb-20">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Community Host</h1>
            <p className="text-muted-foreground">Connettiti con altri host nella tua zona</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crea Community
          </Button>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Inviti in sospeso</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invitations.map((invitation) => {
                const creator = invitation.community.creator
                return (
                  <Card key={invitation.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{invitation.community.name}</CardTitle>
                      <CardDescription>
                        Invito da{" "}
                        {creator.full_name || creator.username || "Un host"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => handleAcceptInvitation(invitation.id, invitation.community.id)}
                        >
                          Accetta
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleRejectInvitation(invitation.id)}
                        >
                          Rifiuta
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Communities List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Le tue community {communities.length > 0 && `(${communities.length})`}
          </h2>
          {communities.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Non fai ancora parte di nessuna community
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crea la prima community
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communities.map((community) => (
                <Card
                  key={community.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/communities/${community.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{community.name}</CardTitle>
                        {community.description && (
                          <CardDescription className="line-clamp-2">
                            {community.description}
                          </CardDescription>
                        )}
                      </div>
                      {community.is_admin && (
                        <div className="ml-2">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Admin
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{community.member_count} membri</span>
                        </div>
                        {(community.city || community.country) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>
                              {[community.city, community.country].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/communities/${community.id}`)
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Vai alla community
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateCommunityDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadData}
      />
    </div>
  )
}

