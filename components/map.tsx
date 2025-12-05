"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

interface Property {
  id: string
  name: string
  latitude: number
  longitude: number
  price_per_night: number
  city: string
  country: string
}

interface MapComponentProps {
  properties: Property[]
  onPropertySelect: (property: Property) => void
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.setView(center, 13)
    }
  }, [center, map])
  
  return null
}

export default function MapComponent({ properties, onPropertySelect }: MapComponentProps) {
  const defaultCenter: [number, number] = [41.9028, 12.4964] // Rome, Italy

  const center = properties.length > 0
    ? [properties[0].latitude, properties[0].longitude] as [number, number]
    : defaultCenter

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={center} />
      {properties.map((property) => (
        <Marker
          key={property.id}
          position={[property.latitude, property.longitude]}
          eventHandlers={{
            click: () => onPropertySelect(property),
          }}
        >
          <Popup>
            <div>
              <h3 className="font-semibold">{property.name}</h3>
              <p className="text-sm text-muted-foreground">
                {property.city}, {property.country}
              </p>
              <p className="font-bold">€{property.price_per_night}/notte</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

