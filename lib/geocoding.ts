// Geocoding utility using OpenStreetMap Nominatim API

export interface GeocodeResult {
  lat: number
  lon: number
  display_name: string
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          "User-Agent": "Nomadiqe/1.0",
        },
      }
    )

    if (!response.ok) {
      throw new Error("Geocoding failed")
    }

    const data = await response.json()

    if (data.length === 0) {
      return null
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    }
  } catch (error) {
    console.error("Geocoding error:", error)
    return null
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          "User-Agent": "Nomadiqe/1.0",
        },
      }
    )

    if (!response.ok) {
      throw new Error("Reverse geocoding failed")
    }

    const data = await response.json()
    return data.display_name || null
  } catch (error) {
    console.error("Reverse geocoding error:", error)
    return null
  }
}

