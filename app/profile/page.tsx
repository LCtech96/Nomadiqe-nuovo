"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { UserRole } from "@/types/user"
import Image from "next/image"
import { Award, Calendar } from "lucide-react"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [pointsHistory, setPointsHistory] = useState<any[]>([])

  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (status === "authenticated" && session?.user?.id) {
      loadProfile()
    }
  }, [status, session, router])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session!.user.id)
        .single()

      if (error) throw error

      setProfile(data)
      setFullName(data.full_name || "")
      setUsername(data.username || "")
      setBio(data.bio || "")
      setAvatarUrl(data.avatar_url || "")

      // Load points history
      const { data: history } = await supabase
        .from("points_history")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(10)

      setPointsHistory(history || [])
    } catch (error: any) {
      console.error("Error loading profile:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare il profilo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username,
          bio: bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Profilo aggiornato con successo!",
      })

      loadProfile()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Profilo non trovato</div>
  }

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Il tuo profilo</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Punti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <p className="text-3xl font-bold">{profile.points || 0}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Punti totali</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ruolo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold capitalize">{profile.role || "Non specificato"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Membro dal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm">
                  {new Date(profile.created_at).toLocaleDateString("it-IT")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni personali</CardTitle>
              <CardDescription>Aggiorna le tue informazioni</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input
                    id="avatar"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {avatarUrl && (
                    <div className="mt-2">
                      <Image
                        src={avatarUrl}
                        alt="Avatar preview"
                        width={100}
                        height={100}
                        className="rounded-full"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Racconta qualcosa di te..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvataggio..." : "Salva modifiche"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storico punti</CardTitle>
              <CardDescription>Le tue attività recenti</CardDescription>
            </CardHeader>
            <CardContent>
              {pointsHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna attività ancora
                </p>
              ) : (
                <div className="space-y-3">
                  {pointsHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{entry.description || entry.action_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">+{entry.points}</p>
                      </div>
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

