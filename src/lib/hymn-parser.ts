import type { Hymn, HymnStanza } from "@/types/hymn"
import ghsHymnsData from "@/data/ghs-hymns.json"

interface RawBlock {
  explicitType?: HymnStanza["type"]
  explicitLabel?: string
  lines: string[]
  normalizedBody: string
}

function normalizeLines(lines: string[]): string {
  return lines
    .map((l) => l.toLowerCase().replace(/[^\w\s]/g, "").trim())
    .filter(Boolean)
    .join(" ")
}

function detectLabel(line: string): { type: HymnStanza["type"]; label: string } | null {
  const trimmed = line.trim()
  // Clean surrounding brackets and punctuation: [Verse 1] -> Verse 1, (Chorus): -> Chorus
  const clean = trimmed.replace(/^[\[\(\{]+/, "").replace(/[\]\)\}:]+$/, "").trim()

  // Verse / V1 / 1.
  const verseMatch = clean.match(/^(?:verse|v)\s*(\d+)?$/i)
  if (verseMatch) {
    const num = verseMatch[1]
    return { type: "verse", label: num ? `Verse ${num}` : "Verse" }
  }

  // Chorus / Refrain
  const chorusMatch = clean.match(/^(?:chorus|refrain)\s*(\d+)?$/i)
  if (chorusMatch) {
    const num = chorusMatch[1]
    return { type: "chorus", label: num ? `Chorus ${num}` : "Chorus" }
  }

  // Pre-Chorus
  const preChorusMatch = clean.match(/^(?:pre-chorus|pre\s*chorus)\s*(\d+)?$/i)
  if (preChorusMatch) {
    const num = preChorusMatch[1]
    return { type: "pre-chorus", label: num ? `Pre-Chorus ${num}` : "Pre-Chorus" }
  }

  // Bridge
  const bridgeMatch = clean.match(/^bridge\s*(\d+)?$/i)
  if (bridgeMatch) {
    const num = bridgeMatch[1]
    return { type: "bridge", label: num ? `Bridge ${num}` : "Bridge" }
  }

  // Tag
  const tagMatch = clean.match(/^tag\s*(\d+)?$/i)
  if (tagMatch) {
    const num = tagMatch[1]
    return { type: "tag", label: num ? `Tag ${num}` : "Tag" }
  }

  // Intro
  if (/^intro$/i.test(clean)) {
    return { type: "intro", label: "Intro" }
  }

  // Outro / Ending
  if (/^(?:outro|ending)$/i.test(clean)) {
    return { type: "outro", label: "Outro" }
  }

  // Numbered header: "1.", "1", "2."
  const numMatch = clean.match(/^(\d+)[\.:]?$/)
  if (numMatch) {
    return { type: "verse", label: `Verse ${numMatch[1]}` }
  }

  return null
}

export function parseHymnText(rawText: string, title?: string): Hymn {
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()
  if (!normalized) {
    return {
      id: `hymn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: title?.trim() || "Untitled Hymn",
      stanzas: [],
      createdAt: Date.now(),
      source: "imported",
    }
  }

  let derivedTitle = title?.trim()
  let contentToSplit = normalized

  // If no title was passed, check if the first line specifies a title (e.g. "Title: My Song")
  if (!derivedTitle) {
    const allLines = normalized.split("\n")
    const firstLine = allLines[0].trim()
    const titleMatch = firstLine.match(/^(?:title|song):\s*(.+)$/i)
    if (titleMatch) {
      derivedTitle = titleMatch[1].trim()
      contentToSplit = allLines.slice(1).join("\n").trim()
    }
  }

  // Split text by double-newlines into blocks
  const rawBlocks = contentToSplit.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean)

  const parsedBlocks: RawBlock[] = []

  for (const block of rawBlocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length === 0) continue

    const firstLine = lines[0]
    const labelResult = detectLabel(firstLine)

    if (labelResult) {
      const bodyLines = lines.slice(1)
      const finalLines = bodyLines.length > 0 ? bodyLines : [firstLine]
      parsedBlocks.push({
        explicitType: labelResult.type,
        explicitLabel: labelResult.label,
        lines: finalLines,
        normalizedBody: normalizeLines(finalLines),
      })
    } else {
      parsedBlocks.push({
        lines,
        normalizedBody: normalizeLines(lines),
      })
    }
  }

  // Count body frequencies to detect repeated blocks as Chorus
  const bodyCounts = new Map<string, number>()
  for (const block of parsedBlocks) {
    if (block.normalizedBody) {
      bodyCounts.set(block.normalizedBody, (bodyCounts.get(block.normalizedBody) || 0) + 1)
    }
  }

  // Number sequentially and identify repeated choruses
  let verseCounter = 1

  const stanzas: HymnStanza[] = parsedBlocks.map((block, index) => {
    let type: HymnStanza["type"] = "verse"
    let label = ""

    const count = bodyCounts.get(block.normalizedBody) || 0
    const isRepeated = count > 1

    if (block.explicitType) {
      type = block.explicitType
      label = block.explicitLabel || capitalize(block.explicitType)
    } else if (isRepeated) {
      type = "chorus"
      label = "Chorus"
    } else {
      type = "verse"
      label = `Verse ${verseCounter++}`
    }

    return {
      id: `stanza-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      label,
      lines: block.lines,
    }
  })

  return {
    id: `hymn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    title: derivedTitle || "Untitled Hymn",
    stanzas,
    createdAt: Date.now(),
    source: "imported",
  }
}

function capitalize(s: string): string {
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Complete collection of 260 Gospel Hymns & Songs (GHS 1 - 260) bundled offline
 */
export const BUILTIN_HYMNS: Hymn[] = ghsHymnsData as unknown as Hymn[]
