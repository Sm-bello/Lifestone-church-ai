import { write } from "bun"

interface RawHymn {
  number: string
  title: string
  titleWithHymnNumber: string
  chorus: string | boolean
  verses: string[]
  category?: string
}

interface RawDb {
  categories: Record<string, number[]>
  hymns: Record<string, RawHymn>
}

async function harvest() {
  console.log("Fetching https://raw.githubusercontent.com/Sm-bello/gospel-hymns/master/content/db.json ...")
  const res = await fetch(
    "https://raw.githubusercontent.com/Sm-bello/gospel-hymns/master/content/db.json"
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch db.json: ${res.statusText}`)
  }

  const data = (await res.json()) as RawDb
  const rawHymns = data.hymns
  const hymns: any[] = []

  const cleanLines = (text: string) =>
    text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

  const numbers = Object.keys(rawHymns)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b)

  for (const num of numbers) {
    const h = rawHymns[String(num)]
    if (!h) continue

    const stanzas: any[] = []
    const hasChorus = typeof h.chorus === "string" && h.chorus.trim().length > 0
    const chorusLines = hasChorus ? cleanLines(h.chorus as string) : []

    const rawVerses = Array.isArray(h.verses) ? h.verses : []
    rawVerses.forEach((vText, idx) => {
      const vNum = idx + 1
      const lines = cleanLines(vText)
      if (lines.length > 0) {
        stanzas.push({
          id: `ghs-${num}-v${vNum}`,
          type: "verse",
          label: `Verse ${vNum}`,
          lines,
        })
      }

      // Add chorus after Verse 1 if present
      if (vNum === 1 && hasChorus) {
        stanzas.push({
          id: `ghs-${num}-chorus`,
          type: "chorus",
          label: "Chorus",
          lines: chorusLines,
        })
      }
    })

    // If there were no verses, but there was a chorus
    if (stanzas.length === 0 && hasChorus) {
      stanzas.push({
        id: `ghs-${num}-chorus`,
        type: "chorus",
        label: "Chorus",
        lines: chorusLines,
      })
    }

    hymns.push({
      id: `ghs-${num}`,
      number: num,
      title: h.title.trim(),
      category: h.category ? h.category.trim() : undefined,
      stanzas,
      createdAt: 1,
      source: "builtin",
    })
  }

  await write("src/data/ghs-hymns.json", JSON.stringify(hymns, null, 2))
  console.log(`Successfully generated ${hymns.length} hymns into src/data/ghs-hymns.json`)
}

harvest().catch((e) => {
  console.error("Harvest error:", e)
  process.exit(1)
})
