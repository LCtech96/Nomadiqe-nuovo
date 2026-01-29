import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * POST /api/service-requests/create
 * Crea una richiesta di servizio (host -> jolly).
 * Body: { jollyId, serviceId, propertyId, requestedDate?, description? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { jollyId, serviceId, propertyId, requestedDate, description } = body as {
      jollyId?: string
      serviceId?: string
      propertyId?: string
      requestedDate?: string
      description?: string
    }

    if (!jollyId || !serviceId) {
      return NextResponse.json(
        { error: "jollyId e serviceId sono obbligatori" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profile?.role !== "host") {
      return NextResponse.json(
        { error: "Solo gli host possono richiedere servizi" },
        { status: 403 }
      )
    }

    const { data: service, error: svcErr } = await supabase
      .from("manager_services")
      .select("id, manager_id, price_per_hour, price_per_service")
      .eq("id", serviceId)
      .eq("manager_id", jollyId)
      .eq("is_active", true)
      .single()

    if (svcErr || !service) {
      return NextResponse.json(
        { error: "Servizio non trovato o non attivo" },
        { status: 404 }
      )
    }

    let resolvedPropertyId: string | null = null
    if (propertyId) {
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .select("id, owner_id")
        .eq("id", propertyId)
        .single()

      if (propErr || !prop || prop.owner_id !== session.user.id) {
        return NextResponse.json(
          { error: "Proprietà non trovata o non di tua competenza" },
          { status: 400 }
        )
      }
      resolvedPropertyId = prop.id
    }

    let price: number | null = null
    if (service.price_per_service != null) price = Number(service.price_per_service)
    else if (service.price_per_hour != null) price = Number(service.price_per_hour) * 2

    const { error: insertErr } = await supabase.from("service_requests").insert({
      host_id: session.user.id,
      manager_id: jollyId,
      service_id: serviceId,
      property_id: resolvedPropertyId,
      requested_date: requestedDate || null,
      description: description || null,
      status: "pending",
      price,
    })

    if (insertErr) {
      console.error("service-requests create error:", insertErr)
      return NextResponse.json(
        { error: insertErr.message || "Errore nella creazione della richiesta" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("service-requests create API error:", e)
    return NextResponse.json(
      { error: "Errore interno" },
      { status: 500 }
    )
  }
}
