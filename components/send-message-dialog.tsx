"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface SendMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receiverId: string
  receiverName: string
  receiverRole?: string
}

export default function SendMessageDialog({
  open,
  onOpenChange,
  receiverId,
  receiverName,
  receiverRole,
}: SendMessageDialogProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  // Pre-compiled message based on receiver role
  const getDefaultMessage = () => {
    if (receiverRole === "creator") {
      return `Ciao ${receiverName},\n\nSono interessato a una possibile collaborazione con te. Mi piacerebbe discutere di come potremmo lavorare insieme per promuovere la mia struttura.\n\nFammi sapere se sei disponibile!\n\nGrazie`
    } else if (receiverRole === "host") {
      return `Ciao ${receiverName},\n\nHo visto la tua struttura e sarei interessato a una collaborazione. Possiamo discutere dei dettagli?\n\nGrazie`
    } else {
      return `Ciao ${receiverName},\n\nVorrei mettermi in contatto con te per discutere di una possibile collaborazione.\n\nGrazie`
    }
  }

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && !message) {
      setMessage(getDefaultMessage())
    }
    onOpenChange(isOpen)
  }

  const handleSend = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato",
        variant: "destructive",
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: "Errore",
        description: "Scrivi un messaggio",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: session.user.id,
          receiver_id: receiverId,
          content: message.trim(),
          read: false,
        })

      if (error) throw error

      toast({
        title: "Messaggio inviato!",
        description: `Il tuo messaggio è stato inviato a ${receiverName}`,
      })

      setMessage("")
      onOpenChange(false)
      
      // Redirect to messages page
      router.push("/messages")
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare il messaggio",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Invia messaggio a {receiverName}</DialogTitle>
          <DialogDescription>
            Scrivi un messaggio per iniziare una conversazione
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Scrivi il tuo messaggio..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            Il messaggio sarà visibile nella sezione "Messaggi" del tuo profilo
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button onClick={handleSend} disabled={loading || !message.trim()}>
            {loading ? "Invio..." : "Invia messaggio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




