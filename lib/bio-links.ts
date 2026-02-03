/**
 * Estrae e normalizza link da un testo (bio, ecc.)
 * Rileva: https://, http://, www., domini nudi (es. example.com, example.it, site.altridomini)
 */
// https://, http://, www., domini nudi (example.com, example.it, site.altridomini)
export const LINK_REGEX =
  /(https?:\/\/[^\s]+)|(www\.[^\s]+)|((?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi

/** Normalizza URL per confronto: stessa forma canonica per match approvazione */
export function normalizeUrlForComparison(url: string): string {
  if (!url?.trim()) return ""
  let u = url.trim().toLowerCase()
  if (/^www\./i.test(u)) u = "https://" + u
  else if (/^[a-zA-Z0-9]/.test(u) && !/^https?:\/\//i.test(u) && u.includes(".")) {
    u = "https://" + u
  }
  u = u.replace(/[.,;:!?)]+$/, "")
  u = u.replace(/\/+$/, "") // trailing slash
  return u
}

export function toFullUrl(url: string): string {
  let u = url.trim().replace(/[.,;:!?)]+$/, "")
  if (/^www\./i.test(u)) return "https://" + u
  if (/^https?:\/\//i.test(u)) return u
  if (/^[a-zA-Z0-9]/.test(u) && u.includes(".")) return "https://" + u
  return u
}

export function extractLinksFromText(text: string): string[] {
  if (!text?.trim()) return []
  const matches = text.match(LINK_REGEX) || []
  const normalized = new Set<string>()
  for (const m of matches) {
    const url = toFullUrl(m)
    if (url) normalized.add(url)
  }
  return Array.from(normalized)
}
