"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface Property {
  id: string
  name: string
  description: string
  property_type: string
  city: string
  country: string
  latitude: number
  longitude: number
  price_per_night: number
  max_guests: number
  images: string[]
  rating: number
  review_count: number
}

interface MapComponentProps {
  properties: Property[]
  onPropertySelect: (property: Property) => void
  center?: [number, number]
}

function MapController({ center, shouldFlyTo }: { center: [number, number], shouldFlyTo?: boolean }) {
  const map = useMap()
  const hasSetInitialView = useRef(false)
  const prevCenter = useRef<[number, number] | null>(null)
  
  useEffect(() => {
    if (!center) return
    
    // Check if center has changed
    const centerChanged = prevCenter.current && 
      (prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1])
    
    if (!hasSetInitialView.current) {
      map.setView(center, 6) // Initial view with wider zoom
      hasSetInitialView.current = true
      prevCenter.current = center
    } else if (shouldFlyTo || centerChanged) {
      map.flyTo(center, 13, { duration: 1.5 }) // Fly to new center
      prevCenter.current = center
    }
  }, [center, map, shouldFlyTo])
  
  return null
}

// Component to track zoom level and update markers
function ZoomHandler({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom())
    },
  })
  
  useEffect(() => {
    onZoomChange(map.getZoom())
  }, [map, onZoomChange])
  
  return null
}

// Create custom icon with property image and price
function createPropertyIcon(property: Property, size: number = 60): L.DivIcon {
  // Get the first image URL - same logic as feed view
  let imageUrl: string | null = null
  
  if (property.images && Array.isArray(property.images) && property.images.length > 0) {
    const firstImage = property.images[0]
    if (firstImage && typeof firstImage === 'string' && firstImage.trim()) {
      imageUrl = firstImage.trim()
    }
  }
  
  // Fallback SVG if no image
  const fallbackSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "'%3E%3Crect width='" + size + "' height='" + size + "' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='" + (size * 0.4) + "'%3E🏠%3C/text%3E%3C/svg%3E"
  
  // Escape HTML to prevent XSS for property name
  const escapedName = property.name
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
  
  // For image URL in HTML attribute, we need to escape quotes
  // Use JSON.stringify to safely escape the URL for HTML attributes
  const safeImageUrl = imageUrl 
    ? JSON.stringify(imageUrl).slice(1, -1) // Remove surrounding quotes from JSON.stringify
    : fallbackSvg
  
  // Handle price - ensure it's a valid number
  const price = property.price_per_night && !isNaN(Number(property.price_per_night))
    ? Number(property.price_per_night).toString()
    : '0'
  
  // Calculate font size based on marker size
  const fontSize = Math.max(7, size * 0.15)
  const padding = Math.max(2, size * 0.05)
  
  const iconHtml = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      overflow: hidden;
      border: ${Math.max(2, size * 0.05)}px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s;
      background-color: #e5e7eb;
    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      <img 
        src="${safeImageUrl}" 
        alt="${escapedName}"
        style="
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        "
        loading="lazy"
        onerror="this.onerror=null; this.src='${fallbackSvg}';"
      />
      <div style="
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 50%, transparent 100%);
        padding: ${padding}px ${padding * 1.5}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          color: white;
          font-size: ${fontSize}px;
          font-weight: 700;
          text-shadow: 0 1px 3px rgba(0,0,0,0.9);
          line-height: 1;
          letter-spacing: 0.3px;
        ">€${price}</span>
      </div>
    </div>
  `
  
  const anchorX = size / 2
  const anchorY = size
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-property-marker',
    iconSize: [size, size],
    iconAnchor: [anchorX, anchorY],
    popupAnchor: [0, -anchorY],
  })
}

// Component to render markers with dynamic sizing
function MarkersLayer({ 
  properties, 
  zoomLevel, 
  onPropertySelect 
}: { 
  properties: Property[]
  zoomLevel: number
  onPropertySelect: (property: Property) => void
}) {
  const markerRefs = useRef<{ [key: string]: L.Marker }>({})
  
  // Calculate marker size based on zoom level
  const getMarkerSize = (zoom: number): number => {
    if (zoom <= 8) return 40
    if (zoom <= 11) return 50
    if (zoom <= 14) return 60
    return 70
  }

  const markerSize = getMarkerSize(zoomLevel)

  // Update all markers when zoom changes
  useEffect(() => {
    properties.forEach((property) => {
      const marker = markerRefs.current[property.id]
      if (marker) {
        const newIcon = createPropertyIcon(property, markerSize)
        marker.setIcon(newIcon)
      }
    })
  }, [zoomLevel, markerSize, properties])

  return (
    <>
      {properties.map((property) => {
        // Only render if property has valid coordinates
        if (!property.latitude || !property.longitude || 
            isNaN(property.latitude) || isNaN(property.longitude)) {
          return null
        }

        return (
          <Marker
            key={property.id}
            position={[property.latitude, property.longitude]}
            icon={createPropertyIcon(property, markerSize)}
            eventHandlers={{
              click: () => onPropertySelect(property),
            }}
            ref={(ref) => {
              if (ref) {
                markerRefs.current[property.id] = ref
              }
            }}
          >
            <Popup>
              <div>
                <h3 className="font-semibold">{property.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {property.city}, {property.country}
                </p>
                <p className="font-bold">€{property.price_per_night || 0}/notte</p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

export default function MapComponent({ properties, onPropertySelect, center: propCenter }: MapComponentProps) {
  const [zoomLevel, setZoomLevel] = useState(6)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  
  const defaultCenter: [number, number] = [41.9028, 12.4964] // Rome, Italy

  // Filter properties with valid coordinates and calculate center
  const validProperties = properties.filter(
    p => p.latitude && p.longitude && 
         !isNaN(p.latitude) && !isNaN(p.longitude)
  )

  // Use prop center if provided, otherwise calculate center based on all properties (average position)
  const center = propCenter || (validProperties.length > 0
    ? [
        validProperties.reduce((sum, p) => sum + p.latitude, 0) / validProperties.length,
        validProperties.reduce((sum, p) => sum + p.longitude, 0) / validProperties.length
      ] as [number, number]
    : defaultCenter)
  
  const handlePropertyClick = (property: Property) => {
    setSelectedPropertyId(property.id)
    onPropertySelect(property)
  }

  // Prevent page scroll when interacting with map
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      // Only prevent default if we're actually over the map
      const target = e.target as HTMLElement
      if (target.closest('.leaflet-container') || target.closest('.leaflet-pane')) {
        e.stopPropagation()
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Allow touch events for map interaction
      const target = e.target as HTMLElement
      if (target.closest('.leaflet-container') || target.closest('.leaflet-pane')) {
        e.stopPropagation()
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  return (
    <div ref={mapContainerRef} style={{ height: "100%", width: "100%", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}>
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: "100%", width: "100%", touchAction: "none" }}
        scrollWheelZoom={true}
        zoomControl={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        preferCanvas={false}
        attributionControl={true}
      >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={center} shouldFlyTo={!!propCenter} />
      <ZoomHandler onZoomChange={setZoomLevel} />
      <MarkersLayer 
        properties={validProperties}
        zoomLevel={zoomLevel}
        onPropertySelect={handlePropertyClick}
      />
      </MapContainer>
    </div>
  )
}

