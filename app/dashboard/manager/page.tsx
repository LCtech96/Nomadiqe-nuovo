"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Plus, Briefcase, CheckCircle } from "lucide-react"

interface Service {
  id: string
  service_type: string
  title: string
  description: string
  price_per_hour: number | null
  price_per_service: number | null
  is_active: boolean
  request_count: number
}

export default function ManagerDashboard() {
  const { data: session } = useSession()
  const supabase = createSupabaseClient()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      loadServices()
    }
  }, [session])

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from("manager_services")
        .select("*")
        .eq("manager_id", session!.user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get request counts
      const servicesWithRequests = await Promise.all(
        (data || []).map(async (service) => {
          const { count } = await supabase
            .from("service_requests")
            .select("*", { count: "exact", head: true })
            .eq("service_id", service.id)
            .eq("status", "completed")

          return {
            ...service,
            request_count: count || 0,
          }
        })
      )

      setServices(servicesWithRequests)
    } catch (error) {
      console.error("Error loading services:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard Manager</h1>
            <p className="text-muted-foreground">Gestisci i tuoi servizi</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/manager/services/new">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo servizio
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Servizi attivi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {services.filter((s) => s.is_active).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Servizi totali</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{services.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Richieste completate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {services.reduce((sum, s) => sum + s.request_count, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>I tuoi servizi</CardTitle>
            <CardDescription>Gestisci i servizi che offri</CardDescription>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Non hai ancora pubblicato nessun servizio
                </p>
                <Button asChild>
                  <Link href="/dashboard/manager/services/new">Crea il primo servizio</Link>
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <Card key={service.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{service.title}</CardTitle>
                        {service.is_active ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : null}
                      </div>
                      <CardDescription>
                        {service.service_type.replace("_", " ")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {service.description}
                      </p>
                      <div className="space-y-2 mb-4">
                        {service.price_per_hour && (
                          <p className="text-sm">
                            <span className="font-semibold">€{service.price_per_hour}</span>
                            /ora
                          </p>
                        )}
                        {service.price_per_service && (
                          <p className="text-sm">
                            <span className="font-semibold">€{service.price_per_service}</span>
                            /servizio
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {service.request_count} richieste completate
                        </p>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/dashboard/manager/services/${service.id}`}>
                          Modifica
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}






