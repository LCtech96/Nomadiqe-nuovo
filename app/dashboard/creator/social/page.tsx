"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Instagram, Youtube, TrendingUp, X } from "lucide-react"

interface SocialAccount {
  id: string
  platform: string
  username: string
  follower_count: number
  engagement_rate: number | null
  verified: boolean
}

export default function SocialAccountsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

  const [formData, setFormData] = useState({
    platform: "instagram" as "instagram" | "tiktok" | "youtube",
    username: "",
    follower_count: "",
    engagement_rate: "",
    verified: false,
  })

  useEffect(() => {
    if (session?.user?.id) {
      loadAccounts()
    }
  }, [session])

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setAccounts(data || [])
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile caricare gli account social",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    try {
      const { error } = await supabase.from("social_accounts").insert({
        user_id: session.user.id,
        platform: formData.platform,
        username: formData.username,
        follower_count: parseInt(formData.follower_count) || 0,
        engagement_rate: formData.engagement_rate
          ? parseFloat(formData.engagement_rate)
          : null,
        verified: formData.verified,
      })

      if (error) throw error

      toast({
        title: "Successo",
        description: "Account social aggiunto con successo!",
      })

      setFormData({
        platform: "instagram",
        username: "",
        follower_count: "",
        engagement_rate: "",
        verified: false,
      })
      setShowAddForm(false)
      loadAccounts()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (accountId: string) => {
    if (!confirm("Sei sicuro di voler rimuovere questo account?")) return

    try {
      const { error } = await supabase
        .from("social_accounts")
        .delete()
        .eq("id", accountId)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Account rimosso con successo",
      })

      loadAccounts()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="w-5 h-5" />
      case "youtube":
        return <Youtube className="w-5 h-5" />
      default:
        return <TrendingUp className="w-5 h-5" />
    }
  }

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case "instagram":
        return "Instagram"
      case "tiktok":
        return "TikTok"
      case "youtube":
        return "YouTube"
      default:
        return platform
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Account social</h1>
            <p className="text-muted-foreground">Collega i tuoi account social per mostrare le statistiche</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard/creator")}>
            Torna alla dashboard
          </Button>
        </div>

        {!showAddForm ? (
          <div className="mb-6">
            <Button onClick={() => setShowAddForm(true)}>Aggiungi account social</Button>
          </div>
        ) : (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Nuovo account social</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>Inserisci le informazioni del tuo account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Piattaforma *</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, platform: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    placeholder="@username"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="follower_count">Numero follower</Label>
                    <Input
                      id="follower_count"
                      type="number"
                      min="0"
                      value={formData.follower_count}
                      onChange={(e) =>
                        setFormData({ ...formData, follower_count: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="engagement_rate">Tasso di engagement (%)</Label>
                    <Input
                      id="engagement_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.engagement_rate}
                      onChange={(e) =>
                        setFormData({ ...formData, engagement_rate: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="verified"
                    checked={formData.verified}
                    onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="verified">Account verificato</Label>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Aggiungi account
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {accounts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  Nessun account social collegato. Aggiungi il primo account per iniziare!
                </p>
              </CardContent>
            </Card>
          ) : (
            accounts.map((account) => (
              <Card key={account.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {getPlatformIcon(account.platform)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {getPlatformLabel(account.platform)}
                          </h3>
                          {account.verified && (
                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                              Verificato
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground">@{account.username}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="font-semibold">
                            {account.follower_count.toLocaleString()} follower
                          </span>
                          {account.engagement_rate && (
                            <span className="text-muted-foreground">
                              {account.engagement_rate.toFixed(2)}% engagement
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                    >
                      Rimuovi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

