import { describe, it, expect } from "vitest"
import { parseHymnText, BUILTIN_HYMNS } from "./hymn-parser"

describe("hymn-parser", () => {
  it("includes all requested builtin hymns with stanzas", () => {
    expect(BUILTIN_HYMNS.length).toBeGreaterThanOrEqual(6)

    const titles = BUILTIN_HYMNS.map((h) => h.title)
    expect(titles).toContain("Amazing Grace")
    expect(titles).toContain("How Great Thou Art")
    expect(titles).toContain("Blessed Assurance")
    expect(titles).toContain("Great Is Thy Faithfulness")
    expect(titles).toContain("What A Friend We Have In Jesus")
    expect(titles).toContain("To God Be The Glory")

    // Check Amazing Grace has 4 verses
    const amazingGrace = BUILTIN_HYMNS.find((h) => h.title === "Amazing Grace")!
    expect(amazingGrace.stanzas).toHaveLength(4)
    expect(amazingGrace.stanzas.every((s) => s.type === "verse")).toBe(true)

    // Check How Great Thou Art has chorus
    const howGreat = BUILTIN_HYMNS.find((h) => h.title === "How Great Thou Art")!
    expect(howGreat.stanzas.some((s) => s.type === "chorus")).toBe(true)
  })

  it("parses hymns with labeled verses and choruses", () => {
    const raw = `
[Verse 1]
Line one of verse
Line two of verse

[Chorus]
This is the chorus line 1
This is the chorus line 2

[Verse 2]
Line one of verse 2
Line two of verse 2
`
    const hymn = parseHymnText(raw, "Test Song")
    expect(hymn.title).toBe("Test Song")
    expect(hymn.stanzas).toHaveLength(3)

    expect(hymn.stanzas[0].type).toBe("verse")
    expect(hymn.stanzas[0].label).toBe("Verse 1")
    expect(hymn.stanzas[0].lines).toEqual(["Line one of verse", "Line two of verse"])

    expect(hymn.stanzas[1].type).toBe("chorus")
    expect(hymn.stanzas[1].label).toBe("Chorus")

    expect(hymn.stanzas[2].type).toBe("verse")
    expect(hymn.stanzas[2].label).toBe("Verse 2")
  })

  it("numbers unlabeled blocks sequentially as Verse 1, Verse 2, etc.", () => {
    const raw = `
First stanza line 1
First stanza line 2

Second stanza line 1
Second stanza line 2

Third stanza line 1
Third stanza line 2
`
    const hymn = parseHymnText(raw)
    expect(hymn.stanzas).toHaveLength(3)
    expect(hymn.stanzas[0].label).toBe("Verse 1")
    expect(hymn.stanzas[1].label).toBe("Verse 2")
    expect(hymn.stanzas[2].label).toBe("Verse 3")
    expect(hymn.stanzas.every((s) => s.type === "verse")).toBe(true)
  })

  it("detects repeated blocks as Chorus", () => {
    const raw = `
Verse 1 line 1
Verse 1 line 2

We praise your holy name
Forever and ever

Verse 2 line 1
Verse 2 line 2

We praise your holy name
Forever and ever
`
    const hymn = parseHymnText(raw, "Repeated Test")
    expect(hymn.stanzas).toHaveLength(4)

    expect(hymn.stanzas[0].label).toBe("Verse 1")
    expect(hymn.stanzas[0].type).toBe("verse")

    expect(hymn.stanzas[1].type).toBe("chorus")
    expect(hymn.stanzas[1].label).toBe("Chorus")

    expect(hymn.stanzas[2].label).toBe("Verse 2")
    expect(hymn.stanzas[2].type).toBe("verse")

    expect(hymn.stanzas[3].type).toBe("chorus")
    expect(hymn.stanzas[3].label).toBe("Chorus")
  })

  it("extracts title from Title: header if title argument is omitted", () => {
    const raw = `Title: Cornerstone
My hope is built on nothing less
Than Jesus' blood and righteousness`

    const hymn = parseHymnText(raw)
    expect(hymn.title).toBe("Cornerstone")
    expect(hymn.stanzas).toHaveLength(1)
  })
})
