"use client"

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const supabase = createSupabaseClient();

  useEffect(() => {
    if (session?.user?.id) {
      loadProfile();
    } else {
      setLoadingProfile(false);
    }
  }, [session]);

  const loadProfile = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, full_name, username")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };
  
  const handleRoleClick = (role: "traveler" | "host" | "creator" | "manager") => {
    if (!session) {
      // Se non autenticato, vai alla registrazione
      router.push("/auth/signup");
    } else {
      // Se autenticato, vai all'onboarding per scegliere il ruolo
      router.push("/onboarding");
    }
  };

  // Se l'utente è loggato e ha già un ruolo, nascondi le card dei ruoli
  const shouldShowRoleCards = !session || !profile?.role;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Nomadiqe
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Soggiorni Più Equi, Connessioni Più Profonde
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!session ? (
              <>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/auth/signin">Accedi</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="/auth/signup">Registrati</Link>
                </Button>
              </>
            ) : null}
            <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
              <Link href="/explore">Esplora</Link>
            </Button>
          </div>
        </div>

        {shouldShowRoleCards && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
              onClick={() => handleRoleClick("traveler")}
            >
              <CardHeader>
                <CardTitle>Traveler</CardTitle>
                <CardDescription>Viaggia e scopri</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Cerca e prenota alloggi unici, connettiti con altri viaggiatori e condividi le tue esperienze.
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
              onClick={() => handleRoleClick("host")}
            >
              <CardHeader>
                <CardTitle>Host</CardTitle>
                <CardDescription>Pubblica la tua struttura</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Pubblica la tua proprietà, collabora con creator e raggiungi più viaggiatori.
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
              onClick={() => handleRoleClick("creator")}
            >
              <CardHeader>
                <CardTitle>Creator</CardTitle>
                <CardDescription>Crea e collabora</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Collabora con host per creare contenuti autentici e guadagnare soggiorni.
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
              onClick={() => handleRoleClick("manager")}
            >
              <CardHeader>
                <CardTitle>Manager</CardTitle>
                <CardDescription>Offri servizi</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Offri servizi di gestione, pulizie, fotografia e molto altro agli host.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {session && profile?.role && (
          <div className="text-center mb-16">
            <p className="text-lg text-muted-foreground">
              Benvenuto, {profile.full_name || profile.username || "utente"}! 
              Sei già registrato come <span className="font-semibold text-primary">{profile.role}</span>.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/home">Vai alla Home</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/explore">Esplora</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

