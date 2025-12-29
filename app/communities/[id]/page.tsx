"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Send,
  Settings,
  Users,
  MoreVertical,
  Volume2,
  VolumeX,
  Ban,
  UserMinus,
  MessageSquare,
  MapPin,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  sender: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

interface Member {
  id: string
  host_id: string
  role: string
  can_write: boolean
  is_muted: boolean
  status: string
  host: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

interface Community {
  id: string
  name: string
  description: string | null
  city: string | null
  country: string | null
  created_by: string
}

export default function CommunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  
  const [community, setCommunity] = useState<Community | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [canWrite, setCanWrite] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const communityId = params.id as string

  useEffect(() => {
    if (session?.user?.id && communityId) {
      loadCommunity()
      loadMessages()
      loadMembers()
      subscribeToMessages()
    }
  }, [session, communityId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadCommunity = async () => {
    try {
      const { data, error } = await supabase
        .from("host_communities")
        .select("*")
        .eq("id", communityId)
        .single()

      if (error) throw error
      setCommunity(data)
    } catch (error: any) {
      console.error("Error loading community:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare la community.",
        variant: "destructive",
      })
      router.push("/communities")
    }
  }

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("host_community_messages")
        .select(`
          id,
          content,
          sender_id,
          created_at,
          sender:profiles!host_community_messages_sender_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("community_id", communityId)
        .order("created_at", { ascending: true })

      if (error) throw error
      
      // Map data to ensure sender is always an object, not an array
      const mappedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        created_at: msg.created_at,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
      }))
      
      setMessages(mappedMessages)
    } catch (error: any) {
      console.error("Error loading messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from("host_community_members")
        .select(`
          id,
          host_id,
          role,
          can_write,
          is_muted,
          status,
          host:profiles!host_community_members_host_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("community_id", communityId)
        .eq("status", "accepted")

      if (error) throw error

      // Map data to ensure host is always an object, not an array
      const membersData: Member[] = (data || []).map((member: any) => ({
        id: member.id,
        host_id: member.host_id,
        role: member.role,
        can_write: member.can_write,
        is_muted: member.is_muted,
        status: member.status,
        host: Array.isArray(member.host) ? member.host[0] : member.host,
      }))
      
      setMembers(membersData)

      // Check if current user is admin and can write
      const currentMember = membersData.find((m: Member) => m.host_id === session.user.id)
      setIsAdmin(currentMember?.role === "admin" || false)
      setCanWrite(currentMember?.can_write !== false && currentMember?.is_muted !== true)
    } catch (error: any) {
      console.error("Error loading members:", error)
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`community:${communityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "host_community_messages",
          filter: `community_id=eq.${communityId}`,
        },
        (payload) => {
          // Reload messages to get sender info
          loadMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id || !newMessage.trim() || !canWrite) return

    setSending(true)
    try {
      const { error } = await supabase
        .from("host_community_messages")
        .insert({
          community_id: communityId,
          sender_id: session.user.id,
          content: newMessage.trim(),
        })

      if (error) throw error

      setNewMessage("")
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast({
        title: "Errore",
        description: "Impossibile inviare il messaggio.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleMuteMember = async (memberId: string, hostId: string) => {
    try {
      const { error } = await supabase
        .from("host_community_members")
        .update({ is_muted: true, updated_at: new Date().toISOString() })
        .eq("id", memberId)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Utente silenziato",
      })

      loadMembers()
    } catch (error: any) {
      console.error("Error muting member:", error)
      toast({
        title: "Errore",
        description: "Impossibile silenziare l'utente.",
        variant: "destructive",
      })
    }
  }

  const handleUnmuteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("host_community_members")
        .update({ is_muted: false, updated_at: new Date().toISOString() })
        .eq("id", memberId)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Utente riattivato",
      })

      loadMembers()
    } catch (error: any) {
      console.error("Error unmuting member:", error)
      toast({
        title: "Errore",
        description: "Impossibile riattivare l'utente.",
        variant: "destructive",
      })
    }
  }

  const handleBlockMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("host_community_members")
        .update({ status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", memberId)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Utente bloccato",
      })

      loadMembers()
    } catch (error: any) {
      console.error("Error blocking member:", error)
      toast({
        title: "Errore",
        description: "Impossibile bloccare l'utente.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("host_community_members")
        .delete()
        .eq("id", memberId)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Utente rimosso dalla community",
      })

      loadMembers()
    } catch (error: any) {
      console.error("Error removing member:", error)
      toast({
        title: "Errore",
        description: "Impossibile rimuovere l'utente.",
        variant: "destructive",
      })
    }
  }

  const handleToggleWritePermission = async (memberId: string, currentCanWrite: boolean) => {
    try {
      const { error } = await supabase
        .from("host_community_members")
        .update({ can_write: !currentCanWrite, updated_at: new Date().toISOString() })
        .eq("id", memberId)

      if (error) throw error

      toast({
        title: "Successo",
        description: `Permesso di scrittura ${!currentCanWrite ? "attivato" : "disattivato"}`,
      })

      loadMembers()
    } catch (error: any) {
      console.error("Error toggling write permission:", error)
      toast({
        title: "Errore",
        description: "Impossibile modificare il permesso.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!community) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto p-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/communities")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{community.name}</h1>
              {community.description && (
                <p className="text-sm text-muted-foreground">{community.description}</p>
              )}
              {(community.city || community.country) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{[community.city, community.country].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{members.length} membri</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{messages.length} messaggi</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex container mx-auto">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun messaggio ancora</p>
                  <p className="text-sm mt-2">Inizia la conversazione!</p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === session?.user?.id
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 sm:gap-3 w-full ${isOwn ? "flex-row-reverse" : ""} px-1`}
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
                      {message.sender.avatar_url ? (
                        <Image
                          src={message.sender.avatar_url}
                          alt={message.sender.full_name || message.sender.username || "User"}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs text-primary">
                            {(message.sender.full_name || message.sender.username || "U")[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 max-w-[85%] sm:max-w-[70%] ${isOwn ? "items-end flex flex-col" : "flex flex-col"}`}>
                      <div className={`flex items-center gap-2 mb-1 ${isOwn ? "justify-end" : ""}`}>
                        <span className="text-xs font-semibold">
                          {message.sender.full_name || message.sender.username || "Utente"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg p-3 min-w-0 ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {canWrite ? (
            <form onSubmit={handleSendMessage} className="border-t p-4 bg-background">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Scrivi un messaggio..."
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="border-t p-4 bg-muted text-center text-sm text-muted-foreground">
              Non puoi scrivere in questa community
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestisci Membri</DialogTitle>
            <DialogDescription>
              Gestisci i membri della community. Puoi silenziare, bloccare o rimuovere utenti.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.host_id === session?.user?.id
              return (
                <Card key={member.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                          {member.host.avatar_url ? (
                            <Image
                              src={member.host.avatar_url}
                              alt={member.host.full_name || member.host.username || "Host"}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm text-primary">
                                {(member.host.full_name || member.host.username || "H")[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {member.host.full_name || member.host.username || "Host"}
                            {isCurrentUser && " (Tu)"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {member.role === "admin" && (
                              <Badge variant="default" className="text-xs">Admin</Badge>
                            )}
                            {member.is_muted && (
                              <Badge variant="secondary" className="text-xs">Silenziato</Badge>
                            )}
                            {!member.can_write && (
                              <Badge variant="outline" className="text-xs">Solo lettura</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {isAdmin && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleToggleWritePermission(member.id, member.can_write)}
                            >
                              {member.can_write ? (
                                <>
                                  <VolumeX className="w-4 h-4 mr-2" />
                                  Disabilita scrittura
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-4 h-4 mr-2" />
                                  Abilita scrittura
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                member.is_muted
                                  ? handleUnmuteMember(member.id)
                                  : handleMuteMember(member.id, member.host_id)
                              }
                            >
                              {member.is_muted ? (
                                <>
                                  <Volume2 className="w-4 h-4 mr-2" />
                                  Riattiva utente
                                </>
                              ) : (
                                <>
                                  <VolumeX className="w-4 h-4 mr-2" />
                                  Silenzia utente
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleBlockMember(member.id)}
                              className="text-destructive"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Blocca utente
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-destructive"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Rimuovi utente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

