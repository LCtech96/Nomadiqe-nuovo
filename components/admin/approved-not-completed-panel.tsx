"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Mail } from "lucide-react"

type ApprovedNotCompletedUser = {
  id: string
  full_name: string
  email: string
  username: string
  phone_number: string
  role: string
  created_at: string
  status: "not_registered" | "onboarding_incomplete"
}

const roleLabel = (role: string) => {
  switch (role) {
    case "host":
      return "Host"
    case "creator":
      return "Creator"
    case "traveler":
      return "Traveler"
    case "jolly":
      return "Jolly"
    default:
      return role
  }
}

const statusLabel = (status: string) => {
  switch (status) {
    case "not_registered":
      return "Non registrato"
    case "onboarding_incomplete":
      return "Onboarding non completato"
    default:
      return status
  }
}

export default function ApprovedNotCompletedPanel() {
  const { toast } = useToast()
  const [users, setUsers] = useState<ApprovedNotCompletedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/waitlist/approved-not-completed")
      if (!response.ok) {
        throw new Error("Impossibile caricare gli utenti")
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error: unknown) {
      toast({
        title: "Errore",
        description: (error as Error)?.message || "Errore nel caricamento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSendReminder = async (email: string, id: string) => {
    setSendingId(id)
    try {
      const response = await fetch("/api/admin/send-onboarding-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Errore durante l'invio")
      }

      toast({
        title: "Email inviata",
        description: `Sollecito inviato a ${email}`,
      })
    } catch (error: unknown) {
      toast({
        title: "Errore",
        description: (error as Error)?.message || "Errore durante l'invio",
        variant: "destructive",
      })
    } finally {
      setSendingId(null)
    }
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Caricamento...
      </div>
    )
  }

  if (!users.length) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Nessun utente approvato in attesa di completare l&apos;onboarding.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Ruolo</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Data approvazione</TableHead>
            <TableHead className="text-right">Azione</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.full_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{roleLabel(user.role)}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    user.status === "not_registered"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {statusLabel(user.status)}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(user.created_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendReminder(user.email, user.id)}
                  disabled={sendingId === user.id}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  {sendingId === user.id ? "Invio..." : "Invia sollecito"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
