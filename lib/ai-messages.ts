/**
 * Helper functions per inviare messaggi AI all'utente
 */

export async function sendWelcomeMessage(userId: string, role: string, username?: string, fullName?: string) {
  try {
    // Usa l'URL relativo per le chiamate interne
    const baseUrl = typeof window !== "undefined" 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    
    const response = await fetch(`${baseUrl}/api/ai-assistant/welcome`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        role: role as "traveler" | "host" | "creator" | "jolly",
        username,
        fullName,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Errore nell'invio del messaggio di benvenuto:", errorText)
      return false
    }

    return true
  } catch (error) {
    console.error("Errore nella chiamata API welcome:", error)
    return false
  }
}

export async function sendActionMessage(
  userId: string,
  action: string,
  actionDescription: string,
  role: string,
  pointsEarned?: number,
  nextSteps?: string[]
): Promise<{ success: boolean; showDisclaimer?: boolean }> {
  try {
    // Usa l'URL relativo per le chiamate interne
    const baseUrl = typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    
    const response = await fetch(`${baseUrl}/api/ai-assistant/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        action,
        actionDescription,
        role: role as "traveler" | "host" | "creator" | "jolly",
        pointsEarned,
        nextSteps,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Errore nell'invio del messaggio di azione:", errorText)
      return { success: false }
    }

    const data = await response.json()
    return { 
      success: true, 
      showDisclaimer: data.showDisclaimer || false 
    }
  } catch (error) {
    console.error("Errore nella chiamata API action:", error)
    return { success: false }
  }
}

export async function sendInactivityMessage(
  userId: string,
  role: string,
  username?: string,
  fullName?: string,
  hoursInactive?: number
) {
  try {
    const baseUrl = typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    
    const response = await fetch(`${baseUrl}/api/ai-assistant/inactivity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        role: role as "traveler" | "host" | "creator" | "jolly",
        username,
        fullName,
        hoursInactive,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Errore nell'invio del messaggio di inattività:", errorText)
      return false
    }

    return true
  } catch (error) {
    console.error("Errore nella chiamata API inactivity:", error)
    return false
  }
}
