"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { createSupabaseClient } from "@/lib/supabase/client"
import Image from "next/image"
import { Package } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price: number
  quantity: number
  delivery_time_days: number | null
  minimum_order: number
}

interface SupplierCatalogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId: string
}

export default function SupplierCatalogDialog({
  open,
  onOpenChange,
  serviceId,
}: SupplierCatalogDialogProps) {
  const supabase = createSupabaseClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && serviceId) {
      loadProducts()
    }
  }, [open, serviceId])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("supplier_products")
        .select("*")
        .eq("service_id", serviceId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error loading products:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catalogo Prodotti</DialogTitle>
          <DialogDescription>
            Esplora il catalogo prodotti disponibili
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Caricamento catalogo...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nessun prodotto disponibile</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  {product.image_url && (
                    <div className="relative w-full h-48 mb-3 rounded-lg overflow-hidden">
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Prezzo:</span>
                      <span className="font-semibold">€{product.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quantità disponibile:</span>
                      <span>{product.quantity}</span>
                    </div>
                    {product.delivery_time_days && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Tempi di consegna:</span>
                        <span>{product.delivery_time_days} giorni</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Min. ordine:</span>
                      <span>{product.minimum_order}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}



