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
import { useToast } from "@/hooks/use-toast"

type WaitlistRequest = {
  id: string
  full_name: string
  email: string
  username: string
  phone_number: string
  role: string
  created_at: string
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

export default function WaitlistAdminPanel() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<WaitlistRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const loadRequests = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/waitlist/pending")
      if (!response.ok) {
        throw new Error("Impossibile caricare le richieste")
      }
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error?.message || "Errore nel caricamento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      const response = await fetch("/api/admin/waitlist/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.error || "Errore durante l'approvazione")
      }

      setRequests((prev) => prev.filter((item) => item.id !== id))
      toast({
        title: "Approvato",
        description: "Email inviata con successo",
      })
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error?.message || "Errore durante l'approvazione",
        variant: "destructive",
      })
    } finally {
      setApprovingId(null)
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Caricamento...</div>
  }

  if (!requests.length) {
    return <div className="py-10 text-center text-muted-foreground">Nessuna richiesta in attesa.</div>
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Telefono</TableHead>
            <TableHead>Ruolo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Azione</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.full_name}</TableCell>
              <TableCell>{request.email}</TableCell>
              <TableCell>{request.username}</TableCell>
              <TableCell>{request.phone_number}</TableCell>
              <TableCell>{roleLabel(request.role)}</TableCell>
              <TableCell>
                {new Date(request.created_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  onClick={() => handleApprove(request.id)}
                  disabled={approvingId === request.id}
                >
                  {approvingId === request.id ? "Approvazione..." : "Approva"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
