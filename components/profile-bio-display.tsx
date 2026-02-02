"use client"

import { useState, useEffect } from "react"
import { BioWithApprovedLinks } from "./bio-with-approved-links"

interface ProfileBioDisplayProps {
  bio: string
  userId: string
  isHost: boolean
  className?: string
}

/** Per host: mostra link cliccabili solo se approvati. Per altri ruoli: mostra bio normale. */
export function ProfileBioDisplay({
  bio,
  userId,
  isHost,
  className = "",
}: ProfileBioDisplayProps) {
  const [approvedUrls, setApprovedUrls] = useState<string[]>([])

  useEffect(() => {
    if (!isHost || !userId) {
      setApprovedUrls([])
      return
    }
    fetch(`/api/profile/${userId}/approved-bio-links`)
      .then((r) => r.json())
      .then((data) => setApprovedUrls(data?.urls || []))
      .catch(() => setApprovedUrls([]))
  }, [userId, isHost])

  if (isHost) {
    return (
      <BioWithApprovedLinks
        bio={bio}
        approvedUrls={approvedUrls}
        className={className}
      />
    )
  }
  return <p className={`whitespace-pre-wrap break-words ${className}`}>{bio}</p>
}
