/**
 * Estrae e normalizza link da un testo (bio, ecc.)
 * Rileva: https://, http://, www.
 */
const LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi

/** Normalizza URL per confronto: stessa forma canonica per match approvazione */
export function normalizeUrlForComparison(url: string): string {
  if (!url?.trim()) return ""
  let u = url.trim().toLowerCase()
  if (/^www\./i.test(u)) u = "https://" + u
  u = u.replace(/[.,;:!?)]+$/, "")
  u = u.replace(/\/+$/, "") // trailing slash
  return u
}

export function extractLinksFromText(text: string): string[] {
  if (!text?.trim()) return []
  const matches = text.match(LINK_REGEX) || []
  const normalized = new Set<string>()
  for (const m of matches) {
    let url = m.trim()
    if (/^www\./i.test(url)) url = "https://" + url
    url = url.replace(/[.,;:!?)]+$/, "")
    normalized.add(url)
  }
  return Array.from(normalized)
}
