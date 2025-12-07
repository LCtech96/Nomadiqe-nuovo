"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { MessageCircle, Send, User, ArrowLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read: boolean
  created_at: string
  sender?: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
  receiver?: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

interface Conversation {
  otherUserId: string
  otherUser: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
  lastMessage: Message
  unreadCount: number
}

export default function MessagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated" && session?.user?.id) {
      loadConversations()
    }
  }, [status, session, router])

  const loadConversations = async () => {
    if (!session?.user?.id) return

    try {
      // Load all messages where user is sender or receiver
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, username, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Group messages by conversation
      const conversationsMap = new Map<string, Conversation>()

      messagesData?.forEach((msg: any) => {
        const otherUserId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id
        const otherUser = msg.sender_id === session.user.id ? msg.receiver : msg.sender

        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            otherUserId,
            otherUser,
            lastMessage: msg,
            unreadCount: 0,
          })
        }

        // Count unread messages
        if (msg.receiver_id === session.user.id && !msg.read) {
          const conv = conversationsMap.get(otherUserId)!
          conv.unreadCount++
        }
      })

      setConversations(Array.from(conversationsMap.values()))
    } catch (error) {
      console.error("Error loading conversations:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare le conversazioni",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (otherUserId: string) => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, username, full_name, avatar_url)
        `)
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${session.user.id})`)
        .order("created_at", { ascending: true })

      if (error) throw error

      setMessages(data || [])

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("receiver_id", session.user.id)
        .eq("sender_id", otherUserId)
        .eq("read", false)

      // Reload conversations to update unread count
      loadConversations()
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!session?.user?.id || !selectedConversation || !newMessage.trim()) return

    setSending(true)
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: session.user.id,
          receiver_id: selectedConversation,
          content: newMessage.trim(),
          read: false,
        })

      if (error) throw error

      setNewMessage("")
      loadMessages(selectedConversation)
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare il messaggio",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const selectedConv = conversations.find((c) => c.otherUserId === selectedConversation)

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Messaggi</h1>
          <p className="text-muted-foreground">Le tue conversazioni</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Conversations List */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Conversazioni</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nessuna conversazione</p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <button
                      key={conv.otherUserId}
                      onClick={() => {
                        setSelectedConversation(conv.otherUserId)
                        loadMessages(conv.otherUserId)
                      }}
                      className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                        selectedConversation === conv.otherUserId ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
                          {conv.otherUser.avatar_url ? (
                            <Image
                              src={conv.otherUser.avatar_url}
                              alt={conv.otherUser.username || "User"}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold truncate">
                              {conv.otherUser.username || conv.otherUser.full_name || "Utente"}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                              addSuffix: true,
                              locale: it,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages View */}
          <Card className="md:col-span-2">
            {selectedConv ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                      {selectedConv.otherUser.avatar_url ? (
                        <Image
                          src={selectedConv.otherUser.avatar_url}
                          alt={selectedConv.otherUser.username || "User"}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedConv.otherUser.username || selectedConv.otherUser.full_name || "Utente"}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Messages */}
                  <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => {
                      const isOwn = msg.sender_id === session.user.id
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {formatDistanceToNow(new Date(msg.created_at), {
                                addSuffix: true,
                                locale: it,
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Send Message */}
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Scrivi un messaggio..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={2}
                        className="resize-none"
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sending || !newMessage.trim()}
                        size="icon"
                        className="shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-12 text-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Seleziona una conversazione per iniziare</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

