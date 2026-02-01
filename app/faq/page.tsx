"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"

const faqs: { q: string; a: string }[] = [
  {
    q: "Costo per stare nell'app",
    a: "Il costo dipenderà dalla struttura che si ha e dal tipo di adesione al programma KOL&BED. Al momento i primi 100 host non avranno costi, anzi se contribuiscono alla crescita di Nomadiqe possono arrivare a 0 commissioni.",
  },
  {
    q: "Come host si pagano commissioni?",
    a: "Come host le commissioni vanno dal 10% allo 0% se si contribuisce al programma KOL&BED. Se non si aderisce al programma KOL&BED le commissioni possono essere più alte. Nomadiqe favorisce gli host attraverso le prenotazioni dirette inviate nel proprio sito web.",
  },
  {
    q: "La gente non influencer ci contatta attraverso le piattaforme degli influencers oppure in futuro le nostre strutture saranno visibili anche ai non influencers?",
    a: "Attualmente Nomadiqe permetterà solamente connessioni tra influencer, host e Jolly (solo alcuni settori di Jolly), quindi le prenotazioni saranno ricevute esternamente. Gli host possono stringere collaborazioni a lungo termine con gli influencer e pubblicizzarli per 12/24 mesi fuori da Nomadiqe, dando quindi la possibilità di ricevere prenotazioni dirette sul proprio sito web e pagare solamente una piccola percentuale all'influencer che porta la prenotazione (dall'1% fino al 10%, in base all'accordo preso).",
  },
  {
    q: "Gli influencers sono solo della categoria Blockchain e Crypto?",
    a: "Gli influencer saranno selezionati e verificati in base al target richiesto: Travel, Lifestyle, Beauty, Fashion, ecc.",
  },
  {
    q: "Le prenotazioni passano solo dalla piattaforma Nomadiqe.com o da un mio sito?",
    a: "Le prenotazioni passano solo dalla piattaforma Nomadiqe.com e puoi finalizzarla solamente attraverso un sito che abbia un sistema di prenotazione integrato anche con Revolut stesso. Nomadiqe favorisce gli host attraverso le prenotazioni dirette inviate nel proprio sito web.",
  },
  {
    q: "Io avrò accesso al pannello prenotazioni?",
    a: "Sì, avrai accesso al pannello delle tue richieste di prenotazioni.",
  },
  {
    q: "Posso approvare o rifiutare ospiti e creators?",
    a: "Potrai bloccare, rifiutare o accettare a tua discrezione qualsiasi ospite. Se invece vuoi rifiutare una collaborazione KOL&BED potrai anche farlo dando una valida motivazione comprovata e dimostrata.",
  },
  {
    q: "Posso bloccare date quando voglio?",
    a: "Puoi bloccare le date a tua discrezione.",
  },
  {
    q: "Se non mi sento a mio agio con una persona, posso dire di no?",
    a: "Se non ti senti a tuo agio con un influencer o creator, prima di accettare la collaborazione potrai rifiutarti. Se invece hai già accettato, potrai rifiutarla fino a una settimana prima che il creator o influencer venga, comunicandolo sulla piattaforma stessa al creator. Puoi rifiutare solamente 2 collaborazioni consecutive quindi valuta attentamente le tue collaborazioni. Ti consigliamo di realizzare collaborazioni di almeno 3 notti per ogni collaborazione e di crearne con almeno 5/10 creators l'anno per massimizzare la tua visibilità.",
  },
  {
    q: "Potrò richiedere promozione e pubblicità?",
    a: "Potrai richiedere promozione e pubblicità soltanto al tuo profilo creato all'interno della piattaforma Nomadiqe o sito di prenotazioni personale.",
  },
  {
    q: "In quanto tempo ricevo i miei soldi?",
    a: "Ricevi i tuoi soldi dai tuoi canali di prenotazioni personali nei tempi prestabiliti dalla legge e bancari, di solito 48/72 ore giorni lavorativi.",
  },
  {
    q: "I creators vengono pagati solo se io incasso?",
    a: "Se decidi di stringere collaborazioni efficaci con gli influencer, riconoscendogli una percentuale (1-5%) da ogni prenotazione che ti portano, loro saranno pagati solo ed esclusivamente se tu ricevi i soldi.",
  },
  {
    q: "Se non ricevo prenotazioni, devo comunque pagare qualcosa?",
    a: "Se non ricevi prenotazioni, Nomadiqe non richiede nessun costo per l'host.",
  },
  {
    q: "Chi risponde se rompono qualcosa, disturbano o non rispettano le regole?",
    a: "Se succede qualcosa, Nomadiqe non è responsabile di danni a cose o persone, civili o penali. Consigliamo sempre di tutelarsi attraverso dei contratti privati creati personalmente con il guest/traveler/creator/influencer.",
  },
  {
    q: "Posso interrompere la collaborazione con un creator in qualsiasi momento?",
    a: "Puoi interrompere il contratto in qualsiasi momento.",
  },
  {
    q: "Prima di iniziare ci sarà un'assicurazione attiva per coprire eventuali infortuni, danni e responsabilità civile?",
    a: "Per informazioni specifiche sull'assicurazione, contatta il supporto Nomadiqe.",
  },
  {
    q: "Se non c'è assicurazione, quando sarà attiva esattamente?",
    a: "Per informazioni sull'attivazione dell'assicurazione, contatta il supporto Nomadiqe.",
  },
  {
    q: "Il contratto specifica che io resto unica proprietaria della casa? È scritto che non cedo uso esclusivo, non cedo gestione totale, non cedo subaffitto?",
    a: "Tu sei unico proprietario della tua struttura, non cedi nulla a nessuno.",
  },
  {
    q: "Posso interrompere il contratto quando voglio?",
    a: "Puoi interrompere il contratto in qualsiasi momento.",
  },
  {
    q: "Il contratto è regolato da legge italiana?",
    a: "Non c'è alcun contratto: semplicemente tu decidi di sfruttare Nomadiqe e gli immensi vantaggi che ne derivano dalla collaborazione con essa.",
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>FAQ&apos;s Host</CardTitle>
            <CardDescription>
              Domande frequenti per gli host
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group border rounded-lg overflow-hidden [&:not(:last-child)]:mb-2"
              >
                <summary className="flex items-center justify-between gap-2 cursor-pointer list-none px-4 py-3 hover:bg-muted/50 transition-colors">
                  <span className="font-medium text-sm">{faq.q}</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-3 pt-0 text-sm text-muted-foreground">
                  {faq.a}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
