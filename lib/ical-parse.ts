/**
 * Minimal iCal parser - extracts VEVENT date ranges for calendar sync
 */

function parseIcalDate(value: string): Date {
  const s = value.replace(/-/g, "").replace(/T.*/, "")
  if (s.length >= 8) {
    const y = parseInt(s.slice(0, 4), 10)
    const m = parseInt(s.slice(4, 6), 10) - 1
    const d = parseInt(s.slice(6, 8), 10)
    return new Date(Date.UTC(y, m, d))
  }
  return new Date(NaN)
}

export function parseIcalToBlockedDates(icsText: string): string[] {
  const dates: string[] = []
  const lines = icsText.split(/\r?\n/)
  let inEvent = false
  let dtstart = ""
  let dtend = ""

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    while (i + 1 < lines.length && /^\s/.test(lines[i + 1])) {
      line += lines[++i].replace(/^\s+/, "")
    }

    if (line.startsWith("BEGIN:VEVENT")) {
      inEvent = true
      dtstart = ""
      dtend = ""
    } else if (line.startsWith("END:VEVENT")) {
      if (dtstart) {
        const start = parseIcalDate(dtstart)
        const end = dtend ? parseIcalDate(dtend) : new Date(start.getTime() + 86400000)
        if (!isNaN(start.getTime())) {
          const current = new Date(start)
          while (current < end) {
            dates.push(current.toISOString().split("T")[0])
            current.setDate(current.getDate() + 1)
          }
        }
      }
      inEvent = false
    } else if (inEvent) {
      if (line.startsWith("DTSTART")) {
        const idx = line.indexOf(":")
        dtstart = idx >= 0 ? line.slice(idx + 1).trim().replace(/T.*$/, "") : ""
      } else if (line.startsWith("DTEND")) {
        const idx = line.indexOf(":")
        dtend = idx >= 0 ? line.slice(idx + 1).trim().replace(/T.*$/, "") : ""
      }
    }
  }

  return dates
}
