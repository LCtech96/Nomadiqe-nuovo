"use client"

import React from "react"

/**
 * Rende il contenuto del post con link cliccabili se l'autore è un host Prime
 * @param content - Il contenuto del post
 * @param isHostPrime - Se l'autore è un host Prime
 */
export function renderLinkContent(content: string, isHostPrime: boolean) {
  if (!isHostPrime) {
    // Se non è Prime, restituisci il contenuto normale
    return <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words">{content}</p>
  }

  // Regex per trovare URL (http/https)
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = content.split(urlRegex)
  
  // Crea un nuovo regex per testare ogni parte
  const testUrlRegex = /^https?:\/\/.+$/

  return (
    <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (testUrlRegex.test(part)) {
          // È un URL, rendilo cliccabile
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {part}
            </a>
          )
        }
        // Testo normale
        return <span key={index}>{part}</span>
      })}
    </p>
  )
}

