/**
 * Quick Search Utility Functions
 * Pure functions for Bible reference autocomplete logic
 */

export interface Book {
  id: number
  translation_id: number
  book_number: number
  name: string
  abbreviation: string
  testament: string
}

export interface AutocompleteResult {
  suggestion: string
  matchedBook?: Book
  chapter?: number
  verse?: number
  stage: "book" | "chapter" | "verse" | "complete" | "none"
}

/**
 * Convert number to Roman numeral for numbered books
 */
export function numberToRoman(num: number): string {
  if (num === 1) return "I"
  if (num === 2) return "II"
  if (num === 3) return "III"
  return String(num)
}

/**
 * Normalize input: convert leading numbers to Roman numerals for matching
 * Examples: "1 S" -> "I S", "2 C" -> "II C", "3 J" -> "III J"
 */
export function normalizeInput(input: string): string {
  const trimmed = input.trim()
  const leadingNumberMatch = trimmed.match(/^(\d+)\s*(.*)$/)

  if (leadingNumberMatch) {
    const num = parseInt(leadingNumberMatch[1])
    const rest = leadingNumberMatch[2]
    return numberToRoman(num) + (rest ? " " + rest : "")
  }

  return trimmed
}

/**
 * Strip diacritics/accents for accent-insensitive comparison (e.g. "Génesis" -> "Genesis")
 */
export function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

/**
 * Convert leading Roman numeral prefix ("I ", "II ", "III ") back to Arabic ("1 ", "2 ", "3 ")
 * so translations whose book names use Arabic digits (e.g. "1 Juan", "1 Samuel") also match.
 */
function romanToArabicPrefix(str: string): string {
  return str
    .replace(/^iii(?=\s|$)/i, "3")
    .replace(/^ii(?=\s|$)/i, "2")
    .replace(/^i(?=\s|$)/i, "1")
}

/**
 * Find matching book by name or abbreviation (case & accent insensitive, Roman/Arabic numbered book aware)
 */
export function findMatchingBook(bookInput: string, books: Book[]): Book | undefined {
  const normalized = bookInput.toLowerCase()

  // 1. Exact lowercase prefix match (original behavior)
  const exact = books.find(
    b =>
      b.name.toLowerCase().startsWith(normalized) ||
      b.abbreviation.toLowerCase().startsWith(normalized)
  )
  if (exact) return exact

  // 2. Accent-insensitive or Arabic-numbered prefix match (e.g. "genesis" -> "Génesis", "I juan" -> "1 Juan")
  const normStripped = stripAccents(normalized)
  const arabicVariant = romanToArabicPrefix(normalized)
  const arabicStripped = stripAccents(arabicVariant)
  const arabicNoSpace = arabicStripped.replace(/^(\d+)\s+/, "$1")

  return books.find(b => {
    const nameLower = b.name.toLowerCase()
    const nameStripped = stripAccents(nameLower)
    const abbrLower = b.abbreviation.toLowerCase()
    const abbrStripped = stripAccents(abbrLower)

    return (
      nameStripped.startsWith(normStripped) ||
      nameLower.startsWith(arabicVariant) ||
      nameStripped.startsWith(arabicStripped) ||
      abbrStripped.startsWith(normStripped) ||
      abbrStripped.startsWith(arabicNoSpace)
    )
  })
}

/**
 * Parse Bible reference input and return autocomplete suggestion
 */
export function getAutocompleteSuggestion(
  input: string,
  books: Book[]
): AutocompleteResult {
  const trimmed = input.trim()

  if (!trimmed) {
    return { suggestion: "", stage: "none" }
  }

  const normalizedInput = normalizeInput(trimmed)

  // Check if it's just a number (for numbered books like "1", "2", "3")
  if (/^\d+$/.test(trimmed)) {
    const matchingBook =
      books.find(b => b.name.startsWith(normalizedInput + " ")) ??
      books.find(b => b.name.startsWith(trimmed + " "))

    if (matchingBook) {
      const prefixUsed = matchingBook.name.startsWith(normalizedInput + " ")
        ? normalizedInput
        : trimmed
      const remainder = matchingBook.name.slice(prefixUsed.length)
      return {
        suggestion: prefixUsed + remainder + " 1:1",
        matchedBook: matchingBook,
        chapter: 1,
        verse: 1,
        stage: "book"
      }
    }
  }

  // Parse: "NumberedBook Chapter:Verse" or "BookName Chapter:Verse"
  // Match patterns like: "I J", "I John", "John", "John 3", "John 3:16", "Génesis 1:1", "1 Juan 1:9"
  const match = normalizedInput.match(/^([IVX]+\s+[\p{L}]+|[IVX]+\s+[\p{L}\s]+|[\p{L}\s]+?)\s*(\d+)?:?(\d+)?$/u)

  if (!match) {
    return { suggestion: "", stage: "none" }
  }

  const bookInput = match[1].trim()
  const chapterNum = match[2]
  const verseNum = match[3]

  const matchingBook = findMatchingBook(bookInput, books)

  if (!matchingBook) {
    return { suggestion: "", stage: "none" }
  }

  // Stage 1: Autocomplete book name + suggest 1:1
  if (!chapterNum) {
    return {
      suggestion: matchingBook.name + " 1:1",
      matchedBook: matchingBook,
      chapter: 1,
      verse: 1,
      stage: "book"
    }
  }

  const chapter = parseInt(chapterNum)

  // Stage 2: Suggest colon after chapter
  if (!verseNum && !trimmed.includes(':')) {
    return {
      suggestion: trimmed + ":1",
      matchedBook: matchingBook,
      chapter,
      verse: 1,
      stage: "chapter"
    }
  }

  // Stage 3: Has colon but no verse number yet
  if (!verseNum && trimmed.includes(':')) {
    return {
      suggestion: "",
      matchedBook: matchingBook,
      chapter,
      stage: "verse"
    }
  }

  // Stage 4: Complete reference
  if (verseNum) {
    const verse = parseInt(verseNum)
    return {
      suggestion: "",
      matchedBook: matchingBook,
      chapter,
      verse,
      stage: "complete"
    }
  }

  return { suggestion: "", stage: "none" }
}

/**
 * Determine what should happen when Tab/Arrow-Right is pressed
 */
export function getTabNavigationResult(
  currentInput: string,
  currentSuggestion: string
): string {
  if (!currentSuggestion || currentSuggestion === currentInput) {
    return currentInput
  }

  const trimmed = currentInput.trim()
  const suggestionTrimmed = currentSuggestion.trim()

  // Extract the full book name from the suggestion
  const bookNameMatch = suggestionTrimmed.match(/^(((?:[IVX]+|\d+)\s+)?[\p{L}\s]+)\s+\d+:\d+$/u)

  if (bookNameMatch) {
    const fullBookName = bookNameMatch[1]

    // Check if current input matches the COMPLETE book name
    const currentIsCompleteBookName =
      trimmed === fullBookName + " " || trimmed === fullBookName

    // Check if current input has a chapter number
    const escapedBook = fullBookName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedStrippedBook = stripAccents(fullBookName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const hasChapter =
      (new RegExp(`^${escapedBook}\\s+\\d+`, 'iu').test(trimmed) ||
        new RegExp(`^${escapedStrippedBook}\\s+\\d+`, 'iu').test(stripAccents(trimmed))) &&
      !trimmed.includes(':')

    // Stage 1: Still typing book name -> advance to complete book name
    if (!currentIsCompleteBookName && !hasChapter) {
      return fullBookName + " "
    }

    // Stage 2: Has chapter -> advance to chapter with colon
    if (hasChapter) {
      const chapterMatch = suggestionTrimmed.match(/^(((?:[IVX]+|\d+)\s+)?[\p{L}\s]+\s+\d+):\d+$/u)
      if (chapterMatch) {
        return chapterMatch[1] + ":"
      }
    }
  }

  // Default: accept full suggestion
  return currentSuggestion
}
