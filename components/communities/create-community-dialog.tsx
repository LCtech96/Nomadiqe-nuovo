"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Check, X, MapPin, User } from "lucide-react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

interface Host {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  country: string | null
}

interface CreateCommunityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function CreateCommunityDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCommunityDialogProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  
  const [loading, setLoading] = useState(false)
  const [loadingHosts, setLoadingHosts] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedHosts, setSelectedHosts] = useState<string[]>([])
  const [hosts, setHosts] = useState<Host[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [userLocation, setUserLocation] = useState<{ city: string | null; country: string | null }>({
    city: null,
    country: null,
  })

  useEffect(() => {
    if (open && session?.user?.id) {
      loadUserLocation()
    }
  }, [open, session])

  useEffect(() => {
    if (open && session?.user?.id && (userLocation.city || userLocation.country)) {
      loadHosts()
    } else if (open && session?.user?.id && !userLocation.city && !userLocation.country) {
      // Se non abbiamo location, carica comunque tutti gli host dopo un breve delay
      const timer = setTimeout(() => {
        loadHosts()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [open, session, userLocation])

  const loadUserLocation = async () => {
    try {
      // Ottieni la location dell'host corrente dalle sue proprietà
      const { data: properties } = await supabase
        .from("properties")
        .select("city, country")
        .eq("owner_id", session!.user.id)
        .eq("is_active", true)
        .limit(1)
        .single()

      if (properties) {
        setUserLocation({
          city: properties.city || null,
          country: properties.country || null,
        })
      }
    } catch (error) {
      console.error("Error loading user location:", error)
    }
  }

  const loadHosts = async () => {
    if (!session?.user?.id) return

    setLoadingHosts(true)
    try {
      // Se abbiamo una location, usa la funzione RPC per ottenere host nella stessa area
      // Altrimenti carica tutti gli host
      if (userLocation.country) {
        const { data, error } = await supabase.rpc("get_hosts_in_area", {
          city_param: userLocation.city,
          country_param: userLocation.country,
        })

        if (error) throw error

        // Filtra l'utente corrente
        const filteredHosts = (data || []).filter((h: Host) => h.id !== session.user.id)
        setHosts(filteredHosts)
      } else {
        // Se non abbiamo una location, carica tutti gli host attivi
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            username,
            full_name,
            avatar_url,
            bio,
            properties:properties!inner(city, country)
          `)
          .eq("role", "host")
          .neq("id", session.user.id)
          .limit(100)

        if (error) throw error

        // Mappa i risultati per avere la stessa struttura
        const mappedHosts: Host[] = (data || [])
          .filter((p: any) => p.properties && p.properties.length > 0)
          .map((p: any) => {
            const property = Array.isArray(p.properties) ? p.properties[0] : p.properties
            return {
              id: p.id,
              username: p.username,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              bio: p.bio,
              city: property?.city || null,
              country: property?.country || null,
            }
          })

        setHosts(mappedHosts)
      }
    } catch (error: any) {
      console.error("Error loading hosts:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare gli host. Riprova più tardi.",
        variant: "destructive",
      })
    } finally {
      setLoadingHosts(false)
    }
  }

  const filteredHosts = hosts.filter((host) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      host.full_name?.toLowerCase().includes(query) ||
      host.username?.toLowerCase().includes(query) ||
      host.bio?.toLowerCase().includes(query) ||
      host.city?.toLowerCase().includes(query) ||
      host.country?.toLowerCase().includes(query)
    )
  })

  const toggleHostSelection = (hostId: string) => {
    setSelectedHosts((prev) =>
      prev.includes(hostId) ? prev.filter((id) => id !== hostId) : [...prev, hostId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id || !name.trim()) return

    setLoading(true)
    try {
      // Usa direttamente l'API route server-side per creare la community
      // L'API route gestisce l'autenticazione con NextAuth e bypassa i problemi RLS
      const response = await fetch("/api/communities/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          city: userLocation.city,
          country: userLocation.country,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Errore nella creazione della community")
      }

      const { community } = await response.json()

      // Invia gli inviti agli host selezionati
      if (selectedHosts.length > 0) {
        const invitations = selectedHosts.map((hostId) => ({
          community_id: community.id,
          invited_host_id: hostId,
          invited_by: session.user.id,
          status: "pending",
        }))

        const { error: inviteError } = await supabase
          .from("host_community_invitations")
          .insert(invitations)

        if (inviteError) {
          console.error("Error creating invitations:", inviteError)
          // Non bloccare la creazione se gli inviti falliscono
        }
      }

      toast({
        title: "Successo",
        description: "Community creata con successo!",
      })

      // Reset form
      setName("")
      setDescription("")
      setSelectedHosts([])
      onOpenChange(false)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error creating community:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare la community. Riprova più tardi.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Community</DialogTitle>
          <DialogDescription>
            Crea una community per connetterti con altri host nella tua zona
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Community Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Community *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Host Milano Centro"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrivi lo scopo della community..."
                rows={3}
                className="mt-1"
              />
            </div>

            {userLocation.city && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>
                  Area: {userLocation.city}
                  {userLocation.country && `, ${userLocation.country}`}
                </span>
              </div>
            )}
          </div>

          {/* Host Selection */}
          <div className="space-y-4">
            <div>
              <Label>Invita Host (opzionale)</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cerca host per nome, città..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loadingHosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredHosts.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  {searchQuery ? "Nessun host trovato" : "Nessun host disponibile nella tua area"}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {filteredHosts.map((host) => {
                  const isSelected = selectedHosts.includes(host.id)
                  return (
                    <Card
                      key={host.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => toggleHostSelection(host.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                            {host.avatar_url ? (
                              <Image
                                src={host.avatar_url}
                                alt={host.full_name || host.username || "Host"}
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
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {host.full_name || host.username || "Host"}
                            </p>
                            {(host.city || host.country) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {[host.city, host.country].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {selectedHosts.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedHosts.length} host selezionati
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crea Community
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

