"use client"

import { useMemo } from "react"

interface BioWithApprovedLinksProps {
  bio: string | null
  approvedUrls: string[]
  className?: string
}

/**
 * Renderizza la bio: i link sono cliccabili solo se approvati.
 * I link non approvati vengono mostrati come testo normale.
 */
export function BioWithApprovedLinks({
  bio,
  approvedUrls,
  className = "",
}: BioWithApprovedLinksProps) {
  const rendered = useMemo(() => {
    if (!bio?.trim()) return null

    const approvedSet = new Set(approvedUrls.map((u) => u.toLowerCase()))
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi
    const parts: { type: "text" | "link"; content: string; url?: string }[] = []
    let lastIndex = 0
    let match

    const regex = new RegExp(urlRegex.source, "gi")
    while ((match = regex.exec(bio)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: bio.slice(lastIndex, match.index) })
      }
      let url = match[0].trim().replace(/[.,;:!?)]+$/, "")
      if (/^www\./i.test(url)) url = "https://" + url
      const isApproved = approvedSet.has(url.toLowerCase())
      parts.push({
        type: "link",
        content: match[0].trim(),
        url: isApproved ? url : undefined,
      })
      lastIndex = regex.lastIndex
    }
    if (lastIndex < bio.length) {
      parts.push({ type: "text", content: bio.slice(lastIndex) })
    }

    if (parts.length === 0) return bio

    return parts.map((p, i) => {
      if (p.type === "text") return <span key={i}>{p.content}</span>
      if (p.url) {
        return (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {p.content}
          </a>
        )
      }
      return <span key={i}>{p.content}</span>
    })
  }, [bio, approvedUrls])

  if (!rendered) return null

  return <p className={`whitespace-pre-wrap break-words ${className}`}>{rendered}</p>
}
