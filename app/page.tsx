import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
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
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth/signin">Accedi</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/auth/signup">Registrati</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
              <Link href="/explore">Esplora</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
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

          <Card>
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

          <Card>
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

          <Card>
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
      </div>
    </div>
  );
}

