"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, Users, TrendingUp, Code, BarChart3 } from "lucide-react"

const positions = [
  {
    id: "client-success-manager",
    title: "Client Success Manager",
    description: "Gestisci le relazioni con gli host e i creator, assicurando la loro soddisfazione e successo sulla piattaforma",
    icon: Users,
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "sales",
    title: "Sales",
    description: "Aiuta a far crescere Nomadiqe BETA acquisendo nuovi host, creator e partner strategici",
    icon: TrendingUp,
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Crea strategie di marketing innovative per far conoscere Nomadiqe BETA al mondo e costruire una community globale",
    icon: BarChart3,
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "cto",
    title: "CTO",
    description: "Guida lo sviluppo tecnologico di Nomadiqe, costruendo una piattaforma scalabile e all'avanguardia",
    icon: Code,
    color: "from-orange-500 to-red-500"
  },
  {
    id: "vp-business-development",
    title: "VP Business Development",
    description: "Sviluppa partnership strategiche e nuove opportunità di business per far crescere Nomadiqe",
    icon: Briefcase,
    color: "from-indigo-500 to-blue-500"
  }
]

export default function LavoraConNoiPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Lavora con noi
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unisciti al team di Nomadiqe BETA e aiuta a costruire il futuro dei viaggi.
            Siamo alla ricerca di talenti appassionati che condividano la nostra visione.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {positions.map((position) => {
            const Icon = position.icon
            return (
              <Link key={position.id} href={`/lavora-con-noi/${position.id}`}>
                <Card className="h-full cursor-pointer transition-all hover:shadow-xl hover:scale-105 border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className={`w-16 h-16 bg-gradient-to-br ${position.color} rounded-lg flex items-center justify-center mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{position.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base mb-4">
                      {position.description}
                    </CardDescription>
                    <Button className="w-full" variant="outline">
                      Candidati ora
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Non vedi la posizione giusta per te?</h2>
              <p className="text-muted-foreground mb-6">
                Siamo sempre aperti a conoscere talenti eccezionali. 
                Invia una candidatura spontanea e ti contatteremo quando avremo un'opportunità adatta a te.
              </p>
              <Button asChild size="lg">
                <Link href="/lavora-con-noi/candidatura-spontanea">Candidatura spontanea</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

