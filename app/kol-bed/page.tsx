"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Profile } from "@/types/user"
import Image from "next/image"
import Link from "next/link"
import { Building2, ArrowRight } from "lucide-react"

export default function KOLBedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated" && session?.user?.id) {
      loadProfile()
    }
  }, [status, session, router])

  const loadProfile = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
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

  // Se l'utente è host, mostra solo la sezione "Per Host"
  if (profile?.role === "host") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="mb-8 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold mb-2">KOL&BED</h1>
            <p className="text-muted-foreground text-lg">
              La piattaforma che connette Key Opinion Leaders e strutture ricettive
            </p>
          </div>

          <Card className="hover:shadow-lg transition-shadow mb-8 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Per Host</CardTitle>
              <CardDescription>
                Collabora con creator per promuovere la tua struttura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li>• Aumenta la visibilità</li>
                <li>• Contenuti autentici</li>
                <li>• Raggiungi nuovi target</li>
                <li>• Marketing efficace</li>
              </ul>
              <Button asChild className="w-full">
                <Link href="/kol-bed/creators">
                  Trova Creator
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Come funziona</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold text-xl">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Registrati</h3>
                  <p className="text-sm text-muted-foreground">
                    Crea il tuo profilo come Creator o Host
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold text-xl">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Connettiti</h3>
                  <p className="text-sm text-muted-foreground">
                    Esplora e contatta potenziali collaboratori
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold text-xl">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Collabora</h3>
                  <p className="text-sm text-muted-foreground">
                    Inizia collaborazioni proficue per entrambi
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Per altri ruoli o utenti senza ruolo, mostra entrambe le sezioni
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-8 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">KOL&BED</h1>
          <p className="text-muted-foreground text-lg">
            La piattaforma che connette Key Opinion Leaders e strutture ricettive
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Per Creator</CardTitle>
              <CardDescription>
                Trova strutture disponibili per collaborazioni
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li>• Collaborazioni gratuite</li>
                <li>• Soggiorni scontati</li>
                <li>• Partnership retribuite</li>
                <li>• Esposizione delle tue piattaforme</li>
              </ul>
              {profile?.role === "creator" ? (
                <Button asChild className="w-full">
                  <Link href="/home">
                    Esplora offerte
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full">
                  <Link href="/onboarding">
                    Diventa Creator
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Per Host</CardTitle>
              <CardDescription>
                Collabora con creator per promuovere la tua struttura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li>• Aumenta la visibilità</li>
                <li>• Contenuti autentici</li>
                <li>• Raggiungi nuovi target</li>
                <li>• Marketing efficace</li>
              </ul>
              {(profile?.role as string) === "host" ? (
                <Button asChild className="w-full">
                  <Link href="/kol-bed/creators">
                    Trova Creator
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full">
                  <Link href="/onboarding">
                    Diventa Host
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Come funziona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold mb-2">Registrati</h3>
                <p className="text-sm text-muted-foreground">
                  Crea il tuo profilo come Creator o Host
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold mb-2">Connettiti</h3>
                <p className="text-sm text-muted-foreground">
                  Esplora e contatta potenziali collaboratori
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold mb-2">Collabora</h3>
                <p className="text-sm text-muted-foreground">
                  Inizia collaborazioni proficue per entrambi
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



