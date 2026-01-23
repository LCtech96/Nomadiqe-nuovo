"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix per l'icona del marker di Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

interface LocationPickerMapProps {
  initialPosition?: [number, number] | null
  onLocationSelect: (lat: number, lng: number) => void
  height?: string
}

// Componente per gestire i click sulla mappa
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      onLocationSelect(lat, lng)
    },
  })
  return null
}

// Componente per centrare la mappa quando cambia la posizione
function MapCenter({ position }: { position: [number, number] | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (position) {
      map.setView(position, 15)
    }
  }, [position, map])
  
  return null
}

// Componente per il marker della posizione selezionata
function LocationMarker({ position }: { position: [number, number] | null }) {
  if (!position) return null

  return (
    <Marker
      position={position}
      icon={L.icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })}
    />
  )
}

export default function LocationPickerMap({ 
  initialPosition, 
  onLocationSelect,
  height = "400px"
}: LocationPickerMapProps) {
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    initialPosition || null
  )

  const defaultCenter: [number, number] = initialPosition || [41.9028, 12.4964] // Rome, Italy

  const handleLocationSelect = (lat: number, lng: number) => {
    const position: [number, number] = [lat, lng]
    setSelectedPosition(position)
    onLocationSelect(lat, lng)
  }

  // Aggiorna la posizione quando cambia initialPosition
  useEffect(() => {
    if (initialPosition) {
      setSelectedPosition(initialPosition)
    }
  }, [initialPosition])

  return (
    <div 
      className="w-full rounded-lg overflow-hidden border"
      style={{ height }}
    >
      <MapContainer
        center={selectedPosition || defaultCenter}
        zoom={selectedPosition ? 15 : 6}
        style={{ 
          height: "100%", 
          width: "100%"
        }}
        scrollWheelZoom={true}
        zoomControl={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
        preferCanvas={false}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenter position={selectedPosition} />
        <MapClickHandler onLocationSelect={handleLocationSelect} />
        <LocationMarker position={selectedPosition} />
      </MapContainer>
    </div>
  )
}
