"use client"

import { useState, useEffect, useRef } from "react"
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
  sender_id: string | null // NULL per messaggi AI
  receiver_id: string
  content: string
  read: boolean
  created_at: string
  is_ai_message?: boolean // Flag per identificare messaggi AI
  booking_request_data?: {
    property_id: string
    property_name: string
    check_in: string
    check_out: string
    guests: number
    total_price: number
    nights: number
  } | null
  booking_request_status?: "pending" | "accepted" | "rejected" | null
  sender?: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated" && session?.user?.id) {
      loadConversations()
    }
  }, [status, session, router])

  // Setup Realtime listener per nuovi messaggi
  useEffect(() => {
    if (!session?.user?.id || status !== "authenticated") return

    console.log("🔔 Messages: Setup Realtime listener per messaggi in tempo reale")

    // Listener per nuovi messaggi ricevuti
    const messagesChannel = supabase
      .channel(`messages-realtime:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${session.user.id}`,
        },
        async (payload) => {
          console.log("📨 Messages: Nuovo messaggio ricevuto in tempo reale!", payload.new)
          
          // Carica i dati del sender
          const { data: sender } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .eq("id", payload.new.sender_id)
            .single()

          const newMessage: Message = {
            id: payload.new.id,
            sender_id: payload.new.sender_id,
            receiver_id: payload.new.receiver_id,
            content: payload.new.content,
            read: payload.new.read ?? false,
            created_at: payload.new.created_at,
            sender: sender || undefined,
          }

          // Se abbiamo una conversazione aperta con questo mittente, aggiungi il messaggio
          if (selectedConversation === payload.new.sender_id) {
            setMessages((prev) => [...prev, newMessage])
            
            // Scroll to bottom
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
            }, 100)
            
            // Marca come letto
            await supabase
              .from("messages")
              .update({ read: true })
              .eq("id", payload.new.id)
          }

          // Aggiorna la lista conversazioni in tempo reale
          setConversations((prev) => {
            const existingConv = prev.find((c) => c.otherUserId === payload.new.sender_id)
            
            if (existingConv) {
              // Aggiorna la conversazione esistente
              return prev.map((conv) => {
                if (conv.otherUserId === payload.new.sender_id) {
                  return {
                    ...conv,
                    lastMessage: newMessage,
                    unreadCount: selectedConversation === payload.new.sender_id 
                      ? 0 
                      : conv.unreadCount + 1,
                  }
                }
                return conv
              })
            } else {
              // Se è un messaggio AI, usa ID speciale
              if (payload.new.is_ai_message || payload.new.sender_id === null) {
                const aiConvId = "ai-assistant"
                return [
                  {
                    otherUserId: aiConvId,
                    otherUser: {
                      id: aiConvId,
                      username: "Nomadiqe Assistant",
                      full_name: "Nomadiqe Assistant",
                      avatar_url: null,
                    },
                    lastMessage: newMessage,
                    unreadCount: selectedConversation === aiConvId ? 0 : 1,
                  },
                  ...prev,
                ]
              }
              
              // Aggiungi nuova conversazione
              return [
                {
                  otherUserId: payload.new.sender_id,
                  otherUser: sender || { id: payload.new.sender_id, username: null, full_name: null, avatar_url: null },
                  lastMessage: newMessage,
                  unreadCount: selectedConversation === payload.new.sender_id ? 0 : 1,
                },
                ...prev,
              ]
            }
          })

          // Mostra notifica toast
          toast({
            title: "💬 Nuovo messaggio",
            description: `Hai ricevuto un nuovo messaggio`,
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${session.user.id}`,
        },
        async (payload) => {
          console.log("📤 Messages: Messaggio inviato in tempo reale!", payload.new)
          
          // Carica i dati del receiver
          const { data: receiver } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .eq("id", payload.new.receiver_id)
            .single()

          const newMessage: Message = {
            id: payload.new.id,
            sender_id: payload.new.sender_id,
            receiver_id: payload.new.receiver_id,
            content: payload.new.content,
            read: payload.new.read ?? false,
            created_at: payload.new.created_at,
            receiver: receiver || undefined,
            sender: session.user ? {
              id: session.user.id,
              username: null,
              full_name: null,
              avatar_url: null,
            } : undefined,
          }

          // Se abbiamo una conversazione aperta, aggiungi il messaggio alla lista
          if (selectedConversation === payload.new.receiver_id) {
            setMessages((prev) => [...prev, newMessage])
            
            // Scroll to bottom
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
            }, 100)
          }

          // Aggiorna la lista conversazioni in tempo reale
          setConversations((prev) => {
            const existingConv = prev.find((c) => c.otherUserId === payload.new.receiver_id)
            
            if (existingConv) {
              // Aggiorna la conversazione esistente
              return prev.map((conv) => {
                if (conv.otherUserId === payload.new.receiver_id) {
                  return {
                    ...conv,
                    lastMessage: newMessage,
                  }
                }
                return conv
              })
            } else {
              // Aggiungi nuova conversazione
              return [
                {
                  otherUserId: payload.new.receiver_id,
                  otherUser: receiver || { id: payload.new.receiver_id, username: null, full_name: null, avatar_url: null },
                  lastMessage: newMessage,
                  unreadCount: 0,
                },
                ...prev,
              ]
            }
          })
        }
      )
      .subscribe((status) => {
        console.log("📡 Messages: Realtime subscription status:", status)
      })

    return () => {
      console.log("🔌 Messages: Disconnesso Realtime listener")
      supabase.removeChannel(messagesChannel)
    }
  }, [session?.user?.id, status, selectedConversation, supabase, toast])

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

      for (const msg of messagesData || []) {
        // Skip AI messages in conversation grouping (they appear in their own conversation)
        if (msg.is_ai_message || msg.sender_id === null) {
          // AI messages: use a special ID for the AI assistant conversation
          const aiConversationId = "ai-assistant"
          if (!conversationsMap.has(aiConversationId)) {
            conversationsMap.set(aiConversationId, {
              otherUserId: aiConversationId,
              otherUser: {
                id: aiConversationId,
                username: "Nomadiqe Assistant",
                full_name: "Nomadiqe Assistant",
                avatar_url: null,
              },
              lastMessage: msg,
              unreadCount: msg.read === false && msg.receiver_id === session.user.id ? 1 : 0,
            })
          } else {
            const existing = conversationsMap.get(aiConversationId)!
            if (new Date(msg.created_at) > new Date(existing.lastMessage.created_at)) {
              existing.lastMessage = msg
              if (msg.read === false && msg.receiver_id === session.user.id) {
                existing.unreadCount++
              }
            }
          }
          continue
        }
        
        const otherUserId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id
        const otherUser = msg.sender_id === session.user.id ? msg.receiver : msg.sender

        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            otherUserId,
            otherUser: otherUser || { id: otherUserId, username: null, full_name: null, avatar_url: null },
            lastMessage: msg,
            unreadCount: 0,
          })
        }

        // Count unread messages
        if (msg.receiver_id === session.user.id && !msg.read) {
          const conv = conversationsMap.get(otherUserId)!
          conv.unreadCount++
        }
      }

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

      // Scroll to bottom after messages load
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    }
  }, [messages.length])

  const handleSendMessage = async () => {
    if (!session?.user?.id || !selectedConversation || !newMessage.trim()) return

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage("") // Pulisci subito il campo per UX migliore
    
    try {

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: session.user.id,
          receiver_id: selectedConversation,
          content: messageContent,
          read: false,
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, username, full_name, avatar_url)
        `)
        .single()

      if (error) {
        console.error("❌ Errore nell'invio del messaggio:", error)
        throw error
      }

      console.log("✅ Messaggio inviato con successo:", data)

      // Il messaggio verrà aggiunto automaticamente dal listener Realtime
      // Ma ricarichiamo comunque per sicurezza
      if (data) {
        setMessages((prev) => [...prev, data as Message])
      }

      // Invia notifica push immediatamente (non aspettare il cron job)
      // Fallback silenzioso: se fallisce, il cron job lo gestirà
      fetch("/api/notifications/send-fcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedConversation,
          type: "message",
          data: {
            sender_id: session.user.id,
            content: messageContent,
            message_id: data.id,
          },
        }),
      }).catch((error) => {
        console.error("Errore nell'invio notifica (non critico):", error)
      })

      // Scroll automatico al nuovo messaggio (verrà gestito dal render)
    } catch (error: any) {
      console.error("❌ Errore completo:", error)
      // Ripristina il messaggio in caso di errore
      setNewMessage(messageContent)
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare il messaggio. Verifica la connessione.",
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
                      {selectedConv.otherUserId === "ai-assistant" ? (
                        <div className="w-full h-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-xl">🤖</span>
                        </div>
                      ) : selectedConv.otherUser.avatar_url ? (
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
                      <CardTitle className="text-lg flex items-center gap-2">
                        {selectedConv.otherUserId === "ai-assistant" && <span>🤖</span>}
                        {selectedConv.otherUser.username || selectedConv.otherUser.full_name || "Utente"}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Messages */}
                  <div className="h-[400px] overflow-y-auto p-2 sm:p-4 space-y-4">
                    {messages.map((msg) => {
                      const isOwn = msg.sender_id === session.user.id
                      const isAIMessage = msg.is_ai_message || msg.sender_id === null
                      return (
                        <div
                          key={msg.id}
                          className={`flex w-full ${isOwn ? "justify-end" : "justify-start"} px-1`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] min-w-0 rounded-lg p-3 ${
                              isAIMessage
                                ? "bg-blue-500/10 border border-blue-500/20 text-foreground"
                                : isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {isAIMessage && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">🤖 Nomadiqe Assistant</span>
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            {/* Mostra bottoni accetta/rifiuta per richieste di prenotazione in attesa ricevute dall'host */}
                            {!isOwn && msg.booking_request_data && msg.booking_request_status === "pending" && (
                              <BookingRequestActions
                                messageId={msg.id}
                                bookingData={msg.booking_request_data}
                                onAccepted={() => {
                                  loadMessages(selectedConversation!)
                                }}
                                onRejected={() => {
                                  loadMessages(selectedConversation!)
                                }}
                              />
                            )}
                            {/* Mostra status per richieste di prenotazione */}
                            {msg.booking_request_data && msg.booking_request_status && msg.booking_request_status !== "pending" && (
                              <div className={`mt-2 text-xs px-2 py-1 rounded ${
                                msg.booking_request_status === "accepted" 
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" 
                                  : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                              }`}>
                                {msg.booking_request_status === "accepted" ? "✅ Prenotazione accettata" : "❌ Prenotazione rifiutata"}
                              </div>
                            )}
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
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Send Message - Disabilitato per conversazioni AI */}
                  {selectedConv.otherUserId === "ai-assistant" ? (
                    <div className="border-t p-4 bg-muted/50 text-center text-sm text-muted-foreground">
                      Non puoi rispondere all'assistente AI. Usa questo spazio per ricevere suggerimenti e aggiornamenti.
                    </div>
                  ) : (
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
                  )}
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

