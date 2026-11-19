import type { VerseRenderData } from "@/types/broadcast"

export interface TranslationAttribution {
  abbreviation: string
  title: string
  language: string
  releaseId: string
  cutoffDate: string
  edition: string
  schemaVersion: number
  licenseVersion: string
  publisherLinkText: string
  url: string
  creditText: string
  creditPrefix: string
  creditSuffix: string
}

/**
 * Structured registry of BibliaTodo translation attributions and release metadata.
 * Structured so English BTNT (or future BibliaTodo translations) can be enabled
 * the exact same way when bundled.
 */
export const TRANSLATION_ATTRIBUTIONS: Record<string, TranslationAttribution> = {
  NTBT: {
    abbreviation: "NTBT",
    title: "Nueva Traducción BibliaTodo",
    language: "es",
    releaseId: "NTBT-2026-11-06",
    cutoffDate: "2026-11-06",
    edition: "texto",
    schemaVersion: 3,
    licenseVersion: "1.7 (2026-11-12)",
    publisherLinkText: "BibliaTodo Bible Society",
    url: "https://www.bibliatodo.org/es/ntbt/",
    creditText:
      "Santa Biblia, Nueva Traducción BibliaTodo (NTBT). Publicada por BibliaTodo Bible Society, sello editorial de BibliaTodo LLC. https://www.bibliatodo.org/es/ntbt/",
    creditPrefix: "Santa Biblia, Nueva Traducción BibliaTodo (NTBT). Publicada por ",
    creditSuffix: ", sello editorial de BibliaTodo LLC. ",
  },
  BTNT: {
    abbreviation: "BTNT",
    title: "BibliaTodo New Translation",
    language: "en",
    releaseId: "BTNT-2026-11-06",
    cutoffDate: "2026-11-06",
    edition: "texto",
    schemaVersion: 3,
    licenseVersion: "1.7 (2026-11-12)",
    publisherLinkText: "BibliaTodo Bible Society",
    url: "https://www.bibliatodo.org/en/btnt/",
    creditText:
      "Holy Bible, BibliaTodo New Translation (BTNT). Published by BibliaTodo Bible Society, an imprint of BibliaTodo LLC. https://www.bibliatodo.org/en/btnt/",
    creditPrefix: "Holy Bible, BibliaTodo New Translation (BTNT). Published by ",
    creditSuffix: ", an imprint of BibliaTodo LLC. ",
  },
}

export function getTranslationAttribution(
  abbreviation?: string | null
): TranslationAttribution | null {
  if (!abbreviation) return null
  return TRANSLATION_ATTRIBUTIONS[abbreviation.toUpperCase()] ?? null
}

/**
 * Minimal credits slide reusing the existing VerseRenderData / live-output / verse-renderer path.
 */
export function toTranslationCreditsSlide(
  abbreviation: string = "NTBT"
): VerseRenderData {
  const attr = getTranslationAttribution(abbreviation) ?? TRANSLATION_ATTRIBUTIONS.NTBT
  return {
    reference: `${attr.title} (${attr.abbreviation}) · ${attr.releaseId}`,
    segments: [
      {
        text: attr.creditText,
      },
    ],
  }
}
