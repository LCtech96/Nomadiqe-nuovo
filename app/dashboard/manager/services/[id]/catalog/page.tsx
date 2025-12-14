"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"
import { Plus, Trash2, Edit2 } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price: number
  quantity: number
  delivery_time_days: number | null
  minimum_order: number
  is_active: boolean
}

export default function SupplierCatalogPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const serviceId = params.id as string

  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    delivery_time_days: "",
    minimum_order: "1",
    image_url: "",
    imageFile: null as File | null,
  })

  // Verifica autenticazione
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      loadProducts()
    }
  }, [serviceId, status, session])

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("supplier_products")
        .select("*")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error: any) {
      console.error("Error loading products:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare i prodotti",
        variant: "destructive",
      })
    }
  }

  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (!session?.user?.id) return null

    setUploadingImage(true)
    try {
      const blobToken = process.env.NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN

      if (!blobToken) {
        toast({
          title: "Errore",
          description: "Token Vercel Blob non configurato",
          variant: "destructive",
        })
        return null
      }

      const { put } = await import("@vercel/blob")
      const fileExtension = file.name.split(".").pop()
      const fileName = `${session.user.id}/supplier-products/${serviceId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
      
      const blob = await put(fileName, file, {
        access: "public",
        contentType: file.type,
        token: blobToken,
      })

      return blob.url
    } catch (error: any) {
      console.error("Error uploading image:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare l'immagine",
        variant: "destructive",
      })
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    setLoading(true)
    try {
      let imageUrl = formData.image_url

      // Se c'è un nuovo file, caricalo
      if (formData.imageFile) {
        const uploadedUrl = await handleImageUpload(formData.imageFile)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        } else {
          setLoading(false)
          return
        }
      }

      const productData: any = {
        service_id: serviceId,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity) || 0,
        delivery_time_days: formData.delivery_time_days ? parseInt(formData.delivery_time_days) : null,
        minimum_order: parseInt(formData.minimum_order) || 1,
        image_url: imageUrl || null,
        is_active: true,
      }

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from("supplier_products")
          .update(productData)
          .eq("id", editingProduct.id)

        if (error) throw error

        toast({
          title: "Successo",
          description: "Prodotto aggiornato con successo!",
        })
      } else {
        // Create new product
        const { error } = await supabase.from("supplier_products").insert(productData)

        if (error) throw error

        toast({
          title: "Successo",
          description: "Prodotto aggiunto al catalogo!",
        })
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
        quantity: "",
        delivery_time_days: "",
        minimum_order: "1",
        image_url: "",
        imageFile: null,
      })
      setEditingProduct(null)
      setShowForm(false)
      loadProducts()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    if (!session?.user?.id) return
    
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      delivery_time_days: product.delivery_time_days?.toString() || "",
      minimum_order: product.minimum_order.toString(),
      image_url: product.image_url || "",
      imageFile: null,
    })
    setShowForm(true)
  }

  const handleDelete = async (productId: string) => {
    if (!session?.user?.id) return
    if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return

    try {
      const { error } = await supabase
        .from("supplier_products")
        .delete()
        .eq("id", productId)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Prodotto eliminato",
      })
      loadProducts()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const toggleProductStatus = async (product: Product) => {
    if (!session?.user?.id) return
    
    try {
      const { error } = await supabase
        .from("supplier_products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id)

      if (error) throw error

      loadProducts()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Mostra loading durante il check di autenticazione
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento...</div>
      </div>
    )
  }

  // Se non autenticato, non mostrare nulla (il redirect è in corso)
  if (status === "unauthenticated" || !session?.user?.id) {
    return null
  }

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Catalogo prodotti</h1>
            <p className="text-muted-foreground">Gestisci il tuo catalogo prodotti</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Indietro
            </Button>
            {!showForm && session?.user?.id && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi prodotto
              </Button>
            )}
          </div>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingProduct ? "Modifica prodotto" : "Nuovo prodotto"}</CardTitle>
              <CardDescription>
                {editingProduct ? "Modifica i dettagli del prodotto" : "Aggiungi un nuovo prodotto al catalogo"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome prodotto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Es. Asciugamani di lusso"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Prezzo di vendita (€) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrizione</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Descrivi il prodotto..."
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantità disponibile</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery_time_days">Tempi di consegna (giorni)</Label>
                    <Input
                      id="delivery_time_days"
                      type="number"
                      min="0"
                      value={formData.delivery_time_days}
                      onChange={(e) => setFormData({ ...formData, delivery_time_days: e.target.value })}
                      placeholder="Es. 7"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimum_order">Quantità minima ordine</Label>
                    <Input
                      id="minimum_order"
                      type="number"
                      min="1"
                      value={formData.minimum_order}
                      onChange={(e) => setFormData({ ...formData, minimum_order: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Immagine prodotto</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setFormData({ ...formData, imageFile: file })
                      }
                    }}
                  />
                  {formData.image_url && !formData.imageFile && (
                    <div className="mt-2 relative w-32 h-32">
                      <Image
                        src={formData.image_url}
                        alt="Preview"
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading || uploadingImage}>
                    {loading || uploadingImage ? "Salvataggio..." : editingProduct ? "Aggiorna" : "Aggiungi"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setEditingProduct(null)
                      setFormData({
                        name: "",
                        description: "",
                        price: "",
                        quantity: "",
                        delivery_time_days: "",
                        minimum_order: "1",
                        image_url: "",
                        imageFile: null,
                      })
                    }}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className={!product.is_active ? "opacity-50" : ""}>
              <CardContent className="p-4">
                {product.image_url && (
                  <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
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
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Prezzo:</span>
                    <span className="font-semibold">€{product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Quantità:</span>
                    <span>{product.quantity}</span>
                  </div>
                  {product.delivery_time_days && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Consegna:</span>
                      <span>{product.delivery_time_days} giorni</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Min. ordine:</span>
                    <span>{product.minimum_order}</span>
                  </div>
                </div>
                {session?.user?.id && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      className="flex-1"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Modifica
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleProductStatus(product)}
                    >
                      {product.is_active ? "Disattiva" : "Attiva"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {products.length === 0 && !showForm && session?.user?.id && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">Nessun prodotto nel catalogo</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi primo prodotto
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

