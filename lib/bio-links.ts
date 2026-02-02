/**
 * Estrae e normalizza link da un testo (bio, ecc.)
 * Rileva: https://, http://, www.
 */
const LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi

export function extractLinksFromText(text: string): string[] {
  if (!text?.trim()) return []
  const matches = text.match(LINK_REGEX) || []
  const normalized = new Set<string>()
  for (const m of matches) {
    let url = m.trim()
    // Normalizza www. -> https://www.
    if (/^www\./i.test(url)) {
      url = "https://" + url
    }
    // Rimuovi trailing punteggiatura
    url = url.replace(/[.,;:!?)]+$/, "")
    normalized.add(url)
  }
  return Array.from(normalized)
}
