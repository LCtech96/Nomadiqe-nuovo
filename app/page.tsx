"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { GridBackground } from "@/components/ui/grid-background"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Briefcase, TrendingUp, Users, Zap, Shield, Sparkles, Languages } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n/context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function HomePageContent() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const { t, locale, setLocale, localeNames, availableLocales } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const supabase = createSupabaseClient()
  const [waitlistForm, setWaitlistForm] = useState({
    email: "",
    phone_number: "",
    role: "",
    referral_code: "",
  })
  const [submittingWaitlist, setSubmittingWaitlist] = useState(false)
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{
    approved: boolean
    hasProfile: boolean
  } | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      loadProfile()
    } else {
      setLoadingProfile(false)
    }

    // Leggi referral_code dall'URL
    const refCode = searchParams.get("ref")
    if (refCode) {
      setWaitlistForm((prev) => ({
        ...prev,
        referral_code: refCode.toUpperCase(),
      }))
    }
  }, [session, searchParams])

  const loadProfile = async () => {
    if (!session?.user?.id) return
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, full_name, username, onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle()

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error)
      }

      if (data) {
        setProfile(data)
        
        // CONTROLLO ONBOARDING OBBLIGATORIO PER HOST
        // Se l'utente è host e non ha completato l'onboarding, reindirizza forzatamente
        if (data.role === "host" && !data.onboarding_completed) {
          console.log("Host onboarding not completed - redirecting to onboarding")
          router.push("/onboarding")
          return
        }
        
        // Se l'utente non ha un ruolo, reindirizza all'onboarding
        if (!data.role) {
          console.log("User has no role - redirecting to onboarding")
          router.push("/onboarding")
          return
        }
      } else {
        // Se non c'è un profilo, reindirizza all'onboarding
        console.log("No profile found - redirecting to onboarding")
        router.push("/onboarding")
        return
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const checkEmailStatus = async (email: string) => {
    if (!email || !email.includes("@")) {
      setEmailChecked(false)
      setEmailStatus(null)
      return
    }

    try {
      const response = await fetch(`/api/waitlist/check?email=${encodeURIComponent(email)}`)
      if (response.ok) {
        const data = await response.json()
        setEmailStatus({
          approved: data.approved || false,
          hasProfile: data.hasProfile || false,
        })
        setEmailChecked(true)
      }
    } catch (error) {
      console.error("Error checking email status:", error)
      setEmailChecked(false)
      setEmailStatus(null)
    }
  }

  useEffect(() => {
    // Debounce per evitare troppe chiamate API
    const timeoutId = setTimeout(() => {
      if (waitlistForm.email) {
        checkEmailStatus(waitlistForm.email)
      } else {
        setEmailChecked(false)
        setEmailStatus(null)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [waitlistForm.email])

  const handleWaitlistSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    // Se l'email è già approvata e ha un profilo, reindirizza al signin
    if (emailStatus?.approved && emailStatus?.hasProfile) {
      window.location.href = `/auth/signin?email=${encodeURIComponent(waitlistForm.email)}`
      return
    }

    // Se l'email è già approvata ma non ha ancora un profilo, reindirizza al signup
    if (emailStatus?.approved && !emailStatus?.hasProfile) {
      window.location.href = `/auth/signup?email=${encodeURIComponent(waitlistForm.email)}`
      return
    }

    setSubmittingWaitlist(true)

    try {
      const response = await fetch("/api/waitlist/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(waitlistForm),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.error || "Errore durante l'invio")
      }

      setWaitlistSubmitted(true)
      toast({
        title: "Richiesta inviata",
        description: "Grazie! Ti contatteremo via email.",
      })
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error?.message || "Si è verificato un errore",
        variant: "destructive",
      })
    } finally {
      setSubmittingWaitlist(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>{t('common.loading')}</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="relative min-h-screen">
        <GridBackground />
        {/* Language Selector - Fixed top right */}
        <div className="fixed top-4 right-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="bg-gray-950/50 backdrop-blur-sm border-gray-800 text-white hover:bg-gray-900">
                <Languages className="h-5 w-5" />
                <span className="sr-only">{t('language.select')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-950 border-gray-800">
              <DropdownMenuLabel className="text-white">{t('language.title')}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-800" />
              {availableLocales.map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className={locale === loc ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}
                >
                  {localeNames[loc]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative z-10 py-12">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 space-y-16">
            {/* Hero Section */}
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-6 text-center">
                <h2 className="text-4xl sm:text-5xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-br from-gray-200 to-gray-600">
                  {t('waitlist.title')}
                </h2>
                <p className="text-xl text-gray-400 max-w-lg mx-auto">
                  {t('waitlist.description')}
                </p>
              </div>

              {/* Cos'è Nomadiqe - Versione Hero */}
              <div className="max-w-4xl mx-auto">
                <div className="bg-gray-950/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-800 shadow-lg">
                  <h3 className="text-2xl md:text-3xl font-bold text-center mb-4 text-gray-200">
                    {t('homepage.whatIsNomadiqe')}
                  </h3>
                  <p className="text-base md:text-lg text-gray-300 mb-4 leading-relaxed text-center">
                    {t('homepage.whatIsNomadiqeDesc1')}
                  </p>
                  <p className="text-base md:text-lg text-gray-300 leading-relaxed text-center">
                    {t('homepage.whatIsNomadiqeDesc2')}
                  </p>
                </div>
              </div>

              {/* CTA Cards: Lavora con noi e Investi - Hero */}
              <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-gradient-to-br from-blue-600/80 to-indigo-700/80 backdrop-blur-sm text-white border-0 hover:shadow-2xl transition-shadow cursor-pointer">
                    <Link href="/lavora-con-noi">
                      <CardContent className="p-6 text-center">
                        <Briefcase className="w-12 h-12 mx-auto mb-3" />
                        <h3 className="text-xl font-bold mb-2">{t('homepage.workWithUs')}</h3>
                        <p className="text-blue-100 text-sm mb-4">
                          {t('homepage.workWithUsDesc')}
                        </p>
                        <Button variant="secondary" size="sm" className="bg-white text-blue-600 hover:bg-gray-100">
                          {t('homepage.seePositions')}
                        </Button>
                      </CardContent>
                    </Link>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-600/80 to-pink-700/80 backdrop-blur-sm text-white border-0 hover:shadow-2xl transition-shadow cursor-pointer">
                    <Link href="/investi">
                      <CardContent className="p-6 text-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-3" />
                        <h3 className="text-xl font-bold mb-2">{t('homepage.invest')}</h3>
                        <p className="text-purple-100 text-sm mb-4">
                          {t('homepage.investDesc')}
                        </p>
                        <Button variant="secondary" size="sm" className="bg-white text-purple-600 hover:bg-gray-100">
                          {t('homepage.discoverMore')}
                        </Button>
                      </CardContent>
                    </Link>
                  </Card>
                </div>
              </div>
            </div>

            {/* Sezione: Perché Nomadiqe è migliore */}
            <section className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-200">
                {t('homepage.whyDifferent')}
              </h2>
              <div className="space-y-6">
                <Card className="bg-gray-950/50 backdrop-blur-sm border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Sparkles className="w-8 h-8 text-yellow-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-xl mb-2 text-gray-200">{t('homepage.levelSystem')}</h3>
                        <p className="text-gray-300">
                          {t('homepage.levelSystemDesc')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-950/50 backdrop-blur-sm border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <TrendingUp className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-xl mb-2 text-gray-200">{t('homepage.kolBed')}</h3>
                        <p className="text-gray-300">
                          {t('homepage.kolBedDesc')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-950/50 backdrop-blur-sm border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Briefcase className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-xl mb-2 text-gray-200">{t('homepage.marketplace')}</h3>
                        <p className="text-gray-300">
                          {t('homepage.marketplaceDesc')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-950/50 backdrop-blur-sm border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Users className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-xl mb-2 text-gray-200">{t('homepage.community')}</h3>
                        <p className="text-gray-300">
                          {t('homepage.communityDesc')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Form Waitlist */}
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-200">
                  {t('homepage.joinWaitlist')}
                </h2>
                <p className="text-lg text-gray-400">
                  {t('homepage.joinWaitlistDesc')}
                </p>
              </div>

            {!waitlistSubmitted ? (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3 max-w-md mx-auto">
                {emailChecked && emailStatus?.approved && (
                  <div className="mb-4 p-4 bg-blue-950/50 border border-blue-700 rounded-lg">
                    {emailStatus.hasProfile ? (
                      <div className="text-center space-y-3">
                        <p className="text-blue-200">
                          🎉 La tua email è già approvata e hai già completato la registrazione!
                        </p>
                        <Button
                          type="button"
                          onClick={() => window.location.href = `/auth/signin?email=${encodeURIComponent(waitlistForm.email)}`}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Accedi
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-3">
                        <p className="text-blue-200">
                          ✅ La tua email è già approvata! Completa la registrazione per accedere.
                        </p>
                        <Button
                          type="button"
                          onClick={() => window.location.href = `/auth/signup?email=${encodeURIComponent(waitlistForm.email)}`}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Completa la registrazione
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder={t('waitlist.email')}
                    className="h-12 bg-gray-950/50 border-gray-800 text-white placeholder:text-gray-500"
                    value={waitlistForm.email}
                    onChange={(e) =>
                      setWaitlistForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    required
                    disabled={submittingWaitlist || (emailStatus?.approved && emailStatus?.hasProfile)}
                  />
                  <Input
                    type="tel"
                    placeholder={t('waitlist.phone')}
                    className="h-12 bg-gray-950/50 border-gray-800 text-white placeholder:text-gray-500"
                    value={waitlistForm.phone_number}
                    onChange={(e) =>
                      setWaitlistForm((prev) => ({
                        ...prev,
                        phone_number: e.target.value,
                      }))
                    }
                    required
                    disabled={submittingWaitlist}
                  />
                </div>
                <Select
                  value={waitlistForm.role}
                  onValueChange={(value) =>
                    setWaitlistForm((prev) => ({
                      ...prev,
                      role: value,
                    }))
                  }
                  required
                  disabled={submittingWaitlist}
                >
                  <SelectTrigger className="h-12 bg-gray-950/50 border-gray-800 text-white">
                    <SelectValue placeholder={t('waitlist.role')} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800 text-white">
                    <SelectItem value="traveler">{t('waitlist.traveler')}</SelectItem>
                    <SelectItem value="host">{t('waitlist.host')}</SelectItem>
                    <SelectItem value="creator">{t('waitlist.creator')}</SelectItem>
                    <SelectItem value="jolly">{t('waitlist.jolly')}</SelectItem>
                  </SelectContent>
                </Select>
                {!emailStatus?.approved && (
                <Button
                  type="submit"
                  className="h-12 px-6 bg-black hover:bg-black/90 text-white"
                  variant="ghost"
                  disabled={submittingWaitlist || !waitlistForm.role}
                >
                  {submittingWaitlist ? t('waitlist.submitting') : t('waitlist.submit')}
                </Button>
                )}
              </form>
            ) : (
              <div className="max-w-md mx-auto text-center">
                <p className="text-lg text-gray-300 mb-4">
                  Registrazione alla Waitlist completata. Attendi una nostra mail che ti comunicherà se e quando sei stato approvato e ti è stato dato accesso all'ecosistema Nomadiqe BETA
                </p>
              </div>
            )}

              <div className="flex flex-col items-center gap-8">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    <Avatar className="border-2 w-12 h-12">
                      <AvatarFallback className="text-sm font-semibold border-white/20 bg-purple-600">JD</AvatarFallback>
                    </Avatar>
                    <Avatar className="border-2 w-12 h-12">
                      <AvatarFallback className="text-sm font-semibold border-white/20 bg-blue-600">AS</AvatarFallback>
                    </Avatar>
                    <Avatar className="border-2 w-12 h-12">
                      <AvatarFallback className="text-sm font-semibold border-white/20 bg-blue-700">MK</AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="font-bold text-gray-300">100+ persone in waitlist</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Nomadiqe BETA
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Soggiorni Più Equi, Connessioni Più Profonde
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg">
              <Link href="/home">Vai alla Dashboard</Link>
            </Button>
          </div>
        </div>


        {/* Sezione: Perché Nomadiqe è migliore */}
        <section className="mb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
              {t('homepage.whyDifferent')}
            </h2>
            <div className="space-y-6">
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Sparkles className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-xl mb-2">{t('homepage.levelSystem')}</h3>
                      <p className="text-muted-foreground">
                        {t('homepage.levelSystemDesc')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <TrendingUp className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-xl mb-2">{t('homepage.kolBed')}</h3>
                      <p className="text-muted-foreground">
                        {t('homepage.kolBedDesc')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Briefcase className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-xl mb-2">{t('homepage.marketplace')}</h3>
                      <p className="text-muted-foreground">
                        {t('homepage.marketplaceDesc')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Users className="w-8 h-8 text-purple-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-xl mb-2">{t('homepage.community')}</h3>
                      <p className="text-muted-foreground">
                        {t('homepage.communityDesc')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Sezioni CTA: Lavora con noi e Investi */}
        <section className="mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 hover:shadow-2xl transition-shadow cursor-pointer">
                <Link href="/lavora-con-noi">
                  <CardContent className="p-8 text-center">
                    <Briefcase className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-4">Lavora con noi</h3>
                    <p className="text-blue-100 mb-6">
                      Unisciti al team di Nomadiqe e aiuta a costruire il futuro dei viaggi
                    </p>
                    <Button variant="secondary" size="lg">
                      Vedi posizioni aperte
                    </Button>
                  </CardContent>
                </Link>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 hover:shadow-2xl transition-shadow cursor-pointer">
                <Link href="/investi">
                  <CardContent className="p-8 text-center">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-4">{t('homepage.invest')}</h3>
                    <p className="text-purple-100 mb-6">
                      {t('homepage.investDesc')}
                    </p>
                    <Button variant="secondary" size="lg">
                      {t('homepage.discoverMore')}
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        {session && profile?.role && (
          <div className="text-center">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm inline-block">
              <CardContent className="p-6">
                <p className="text-lg text-muted-foreground mb-4">
                  Benvenuto, {profile.full_name || profile.username || "utente"}! 
                  Sei già registrato come <span className="font-semibold text-primary">{profile.role}</span>.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link href="/home">Vai alla Home</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/explore">Esplora</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}
