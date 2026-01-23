"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Info, TrendingUp, Gem, Diamond, Sparkles, Mail, MessageCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const investmentLevels = [
  {
    id: "rock",
    name: "Rock",
    min: 100,
    max: 500,
    color: "from-gray-500 to-gray-700",
    description: "Perfetto per iniziare il tuo percorso di investimento"
  },
  {
    id: "emerald",
    name: "Emerald",
    min: 1000,
    max: 5000,
    color: "from-green-500 to-emerald-600",
    description: "Un investimento più sostanzioso con maggiori vantaggi"
  },
  {
    id: "diamond",
    name: "Diamond",
    min: 10000,
    max: 50000,
    color: "from-cyan-400 to-blue-600",
    description: "Per investitori seri che credono nel futuro di Nomadiqe"
  },
  {
    id: "vibranium",
    name: "Vibranium",
    min: 100000,
    max: null,
    color: "from-purple-500 to-pink-600",
    description: "Il livello più alto per partner strategici"
  }
]

const hostLevels = [
  {
    level: "Base",
    invites: "Nessun invitato",
    benefits: "Nessuno sconto o vantaggio"
  },
  {
    level: "Advanced",
    invites: "1-5 utenti invitati",
    benefits: "+5% sull'intero importo utile (tasse escluse) delle prime 3 prenotazioni completate dagli utenti invitati"
  },
  {
    level: "Rubino",
    invites: "Oltre 20 utenti invitati",
    benefits: "Stessi vantaggi dell'Advanced + fino a 500€*"
  },
  {
    level: "Zaffiro",
    invites: "Oltre 50 utenti invitati",
    benefits: "1 anno 0 commissioni sulla piattaforma + tutto il Rubino + accesso ad alcune funzioni premium in anteprima mondiale"
  },
  {
    level: "Prime",
    invites: "Oltre 100 utenti invitati",
    benefits: "3 anni a 0 commissioni + tutto Zaffiro"
  }
]

export default function InvestiPage() {
  const [showContactDialog, setShowContactDialog] = useState(false)

  const handleEmailContact = () => {
    window.location.href = "mailto:luca@facevoice.ai?subject=Investimento in Nomadiqe"
  }

  const handleWhatsAppContact = () => {
    window.open("https://wa.me/393514206353", "_blank")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Investi e diventa Partner
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Unisciti a Nomadiqe come investitore e contribuisci a costruire il futuro dei viaggi.
            Scegli il livello di investimento che fa per te.
          </p>
        </div>

        {/* Investment Levels */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 max-w-6xl mx-auto">
          {investmentLevels.map((level) => (
            <Card key={level.id} className={`bg-gradient-to-br ${level.color} text-white border-0 hover:shadow-2xl transition-shadow`}>
              <CardHeader>
                <CardTitle className="text-2xl">{level.name}</CardTitle>
                <CardDescription className="text-white/80">
                  {level.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">
                  {level.min.toLocaleString()}€
                  {level.max ? ` - ${level.max.toLocaleString()}€` : "+"}
                </div>
                <Alert className="bg-white/20 border-white/30 text-white">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Presto aggiorneremo i compensi e le percentuali in base al livello di investimento scelto.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Host Levels Table */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl mb-2">Sistema di Livelli per Host</CardTitle>
              <CardDescription className="text-lg">
                Scala i livelli invitando altri host sulla piattaforma e guadagna vantaggi esclusivi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Livello</TableHead>
                      <TableHead>Utenti Invitati</TableHead>
                      <TableHead>Vantaggi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hostLevels.map((level, index) => {
                      // Colori distintivi per ogni livello senza cuoricini
                      const levelColors = {
                        0: "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
                        1: "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200",
                        2: "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200",
                        3: "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200",
                        4: "bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200",
                      }
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${levelColors[index as keyof typeof levelColors]}`}>
                                {level.level}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{level.invites}</TableCell>
                          <TableCell>{level.benefits}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <Alert className="mt-6">
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Come funziona:</strong> Ogni host che inviti e che completa la registrazione 
                  ti fa guadagnare punti nella classifica. Più host inviti, più sali di livello e più 
                  vantaggi ottieni. I vantaggi si applicano automaticamente quando raggiungi il livello corrispondente.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center max-w-2xl mx-auto">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Interessato a investire?</h2>
              <p className="text-muted-foreground mb-6">
                Contattaci per discutere delle opportunità di investimento e partnership con Nomadiqe.
                Siamo qui per rispondere a tutte le tue domande.
              </p>
              <Button 
                size="lg" 
                className="w-full sm:w-auto"
                onClick={() => setShowContactDialog(true)}
              >
                Contattaci per investire
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Come vuoi contattarci?</DialogTitle>
            <DialogDescription>
              Scegli il metodo di contatto preferito per discutere delle opportunità di investimento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleEmailContact}
            >
              <Mail className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Invia Email</div>
                <div className="text-sm text-muted-foreground">luca@facevoice.ai</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleWhatsAppContact}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Messaggio WhatsApp</div>
                <div className="text-sm text-muted-foreground">Apri WhatsApp</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

