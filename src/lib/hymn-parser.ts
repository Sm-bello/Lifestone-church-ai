import type { Hymn, HymnStanza } from "@/types/hymn"

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

export const BUILTIN_HYMNS: Hymn[] = [
  {
    id: "builtin-1",
    number: 1,
    title: "Amazing Grace",
    author: "John Newton",
    createdAt: 0,
    source: "builtin",
    stanzas: [
      {
        id: "ag-v1",
        type: "verse",
        label: "Verse 1",
        lines: [
          "Amazing grace! How sweet the sound",
          "That saved a wretch like me!",
          "I once was lost, but now am found;",
          "Was blind, but now I see.",
        ],
      },
      {
        id: "ag-v2",
        type: "verse",
        label: "Verse 2",
        lines: [
          "'Twas grace that taught my heart to fear,",
          "And grace my fears relieved;",
          "How precious did that grace appear",
          "The hour I first believed.",
        ],
      },
      {
        id: "ag-v3",
        type: "verse",
        label: "Verse 3",
        lines: [
          "Through many dangers, toils, and snares,",
          "I have already come;",
          "'Tis grace hath brought me safe thus far,",
          "And grace will lead me home.",
        ],
      },
      {
        id: "ag-v4",
        type: "verse",
        label: "Verse 4",
        lines: [
          "When we've been there ten thousand years,",
          "Bright shining as the sun,",
          "We've no less days to sing God's praise",
          "Than when we'd first begun.",
        ],
      },
    ],
  },
  {
    id: "builtin-2",
    number: 2,
    title: "How Great Thou Art",
    author: "Carl Boberg / Stuart K. Hine",
    createdAt: 0,
    source: "builtin",
    stanzas: [
      {
        id: "hgta-v1",
        type: "verse",
        label: "Verse 1",
        lines: [
          "O Lord my God, when I in awesome wonder,",
          "Consider all the worlds Thy hands have made;",
          "I see the stars, I hear the rolling thunder,",
          "Thy power throughout the universe displayed.",
        ],
      },
      {
        id: "hgta-c1",
        type: "chorus",
        label: "Chorus",
        lines: [
          "Then sings my soul, My Saviour God, to Thee,",
          "How great Thou art, how great Thou art.",
          "Then sings my soul, My Saviour God, to Thee,",
          "How great Thou art, how great Thou art!",
        ],
      },
      {
        id: "hgta-v2",
        type: "verse",
        label: "Verse 2",
        lines: [
          "When through the woods, and forest glades I wander,",
          "And hear the birds sing sweetly in the trees.",
          "When I look down, from lofty mountain grandeur",
          "And see the brook, and feel the gentle breeze.",
        ],
      },
      {
        id: "hgta-c2",
        type: "chorus",
        label: "Chorus",
        lines: [
          "Then sings my soul, My Saviour God, to Thee,",
          "How great Thou art, how great Thou art.",
          "Then sings my soul, My Saviour God, to Thee,",
          "How great Thou art, how great Thou art!",
        ],
      },
      {
        id: "hgta-v3",
        type: "verse",
        label: "Verse 3",
        lines: [
          "And when I think, that God, His Son not sparing;",
          "Sent Him to die, I scarce can take it in;",
          "That on the Cross, my burden gladly bearing,",
          "He bled and died to take away my sin.",
        ],
      },
      {
        id: "hgta-c3",
        type: "chorus",
        label: "Chorus",
        lines: [
          "Then sings my soul, My Saviour God, to Thee,",
          "How great Thou art, how great Thou art.",
          "Then sings my soul, My Saviour God, to Thee,",
          "How great Thou art, how great Thou art!",
        ],
      },
      {
        id: "hgta-v4",
        type: "verse",
        label: "Verse 4",
        lines: [
          "When Christ shall come, with shout of acclamation,",
          "And take me home, what joy shall fill my heart!",
          "Then I shall bow, in humble adoration,",
          "And then proclaim: \"My God, how great Thou art!\"",
        ],
      },
      {
        id: "hgta-c4",
        type: "chorus",
        label: "Chorus",
        lines: [
          "Then sings my soul, My Saviour God, to Thee,",
          "How great Thou art, how great Thou art.",
          "Then sings my soul, My Saviour God, to Thee,",
          "How great Thou art, how great Thou art!",
        ],
      },
    ],
  },
  {
    id: "builtin-3",
    number: 3,
    title: "Blessed Assurance",
    author: "Fanny Crosby",
    createdAt: 0,
    source: "builtin",
    stanzas: [
      {
        id: "ba-v1",
        type: "verse",
        label: "Verse 1",
        lines: [
          "Blessed assurance, Jesus is mine!",
          "O what a foretaste of glory divine!",
          "Heir of salvation, purchase of God,",
          "Born of His Spirit, washed in His blood.",
        ],
      },
      {
        id: "ba-c1",
        type: "chorus",
        label: "Chorus",
        lines: [
          "This is my story, this is my song,",
          "Praising my Savior all the day long;",
          "This is my story, this is my song,",
          "Praising my Savior all the day long.",
        ],
      },
      {
        id: "ba-v2",
        type: "verse",
        label: "Verse 2",
        lines: [
          "Perfect submission, perfect delight,",
          "Visions of rapture now burst on my sight;",
          "Angels descending bring from above",
          "Echoes of mercy, whispers of love.",
        ],
      },
      {
        id: "ba-c2",
        type: "chorus",
        label: "Chorus",
        lines: [
          "This is my story, this is my song,",
          "Praising my Savior all the day long;",
          "This is my story, this is my song,",
          "Praising my Savior all the day long.",
        ],
      },
      {
        id: "ba-v3",
        type: "verse",
        label: "Verse 3",
        lines: [
          "Perfect submission, all is at rest,",
          "I in my Savior am happy and blest,",
          "Watching and waiting, looking above,",
          "Filled with His goodness, lost in His love.",
        ],
      },
      {
        id: "ba-c3",
        type: "chorus",
        label: "Chorus",
        lines: [
          "This is my story, this is my song,",
          "Praising my Savior all the day long;",
          "This is my story, this is my song,",
          "Praising my Savior all the day long.",
        ],
      },
    ],
  },
  {
    id: "builtin-4",
    number: 4,
    title: "Great Is Thy Faithfulness",
    author: "Thomas Chisholm",
    createdAt: 0,
    source: "builtin",
    stanzas: [
      {
        id: "gitf-v1",
        type: "verse",
        label: "Verse 1",
        lines: [
          "Great is Thy faithfulness, O God my Father,",
          "There is no shadow of turning with Thee;",
          "Thou changest not, Thy compassions, they fail not;",
          "As Thou hast been Thou forever wilt be.",
        ],
      },
      {
        id: "gitf-c1",
        type: "chorus",
        label: "Chorus",
        lines: [
          "Great is Thy faithfulness! Great is Thy faithfulness!",
          "Morning by morning new mercies I see;",
          "All I have needed Thy hand hath provided—",
          "Great is Thy faithfulness, Lord, unto me!",
        ],
      },
      {
        id: "gitf-v2",
        type: "verse",
        label: "Verse 2",
        lines: [
          "Summer and winter, and springtime and harvest,",
          "Sun, moon and stars in their courses above,",
          "Join with all nature in manifold witness",
          "To Thy great faithfulness, mercy and love.",
        ],
      },
      {
        id: "gitf-c2",
        type: "chorus",
        label: "Chorus",
        lines: [
          "Great is Thy faithfulness! Great is Thy faithfulness!",
          "Morning by morning new mercies I see;",
          "All I have needed Thy hand hath provided—",
          "Great is Thy faithfulness, Lord, unto me!",
        ],
      },
      {
        id: "gitf-v3",
        type: "verse",
        label: "Verse 3",
        lines: [
          "Pardon for sin and a peace that endureth,",
          "Thine own dear presence to cheer and to guide;",
          "Strength for today and bright hope for tomorrow,",
          "Blessings all mine, with ten thousand beside!",
        ],
      },
      {
        id: "gitf-c3",
        type: "chorus",
        label: "Chorus",
        lines: [
          "Great is Thy faithfulness! Great is Thy faithfulness!",
          "Morning by morning new mercies I see;",
          "All I have needed Thy hand hath provided—",
          "Great is Thy faithfulness, Lord, unto me!",
        ],
      },
    ],
  },
  {
    id: "builtin-5",
    number: 5,
    title: "What A Friend We Have In Jesus",
    author: "Joseph M. Scriven",
    createdAt: 0,
    source: "builtin",
    stanzas: [
      {
        id: "waf-v1",
        type: "verse",
        label: "Verse 1",
        lines: [
          "What a friend we have in Jesus,",
          "All our sins and griefs to bear!",
          "What a privilege to carry",
          "Everything to God in prayer!",
          "O what peace we often forfeit,",
          "O what needless pain we bear,",
          "All because we do not carry",
          "Everything to God in prayer!",
        ],
      },
      {
        id: "waf-v2",
        type: "verse",
        label: "Verse 2",
        lines: [
          "Have we trials and temptations?",
          "Is there trouble anywhere?",
          "We should never be discouraged;",
          "Take it to the Lord in prayer.",
          "Can we find a friend so faithful",
          "Who will all our sorrows share?",
          "Jesus knows our every weakness;",
          "Take it to the Lord in prayer.",
        ],
      },
      {
        id: "waf-v3",
        type: "verse",
        label: "Verse 3",
        lines: [
          "Are we weak and heavy laden,",
          "Cumbered with a load of care?",
          "Precious Savior, still our refuge,",
          "Take it to the Lord in prayer.",
          "Do thy friends despise, forsake thee?",
          "Take it to the Lord in prayer!",
          "In His arms He'll take and shield thee;",
          "Thou wilt find a solace there.",
        ],
      },
    ],
  },
  {
    id: "builtin-6",
    number: 6,
    title: "To God Be The Glory",
    author: "Fanny Crosby",
    createdAt: 0,
    source: "builtin",
    stanzas: [
      {
        id: "tgotg-v1",
        type: "verse",
        label: "Verse 1",
        lines: [
          "To God be the glory, great things He hath done;",
          "So loved He the world that He gave us His Son,",
          "Who yielded His life an atonement for sin,",
          "And opened the life gate that all may go in.",
        ],
      },
      {
        id: "tgotg-c1",
        type: "chorus",
        label: "Chorus",
        lines: [
          "Praise the Lord, praise the Lord,",
          "Let the earth hear His voice!",
          "Praise the Lord, praise the Lord,",
          "Let the people rejoice!",
          "O come to the Father through Jesus the Son,",
          "And give Him the glory, great things He hath done.",
        ],
      },
      {
        id: "tgotg-v2",
        type: "verse",
        label: "Verse 2",
        lines: [
          "O perfect redemption, the purchase of blood,",
          "To every believer the promise of God;",
          "The vilest offender who truly believes,",
          "That moment from Jesus a pardon receives.",
        ],
      },
      {
        id: "tgotg-c2",
        type: "chorus",
        label: "Chorus",
        lines: [
          "Praise the Lord, praise the Lord,",
          "Let the earth hear His voice!",
          "Praise the Lord, praise the Lord,",
          "Let the people rejoice!",
          "O come to the Father through Jesus the Son,",
          "And give Him the glory, great things He hath done.",
        ],
      },
      {
        id: "tgotg-v3",
        type: "verse",
        label: "Verse 3",
        lines: [
          "Great things He hath taught us, great things He hath done,",
          "And great our rejoicing through Jesus the Son;",
          "But purer, and higher, and greater will be",
          "Our wonder, our transport, when Jesus we see.",
        ],
      },
      {
        id: "tgotg-c3",
        type: "chorus",
        label: "Chorus",
        lines: [
          "Praise the Lord, praise the Lord,",
          "Let the earth hear His voice!",
          "Praise the Lord, praise the Lord,",
          "Let the people rejoice!",
          "O come to the Father through Jesus the Son,",
          "And give Him the glory, great things He hath done.",
        ],
      },
    ],
  },
  {
    id: "builtin-7",
    number: 7,
    title: "It Is Well With My Soul",
    author: "Horatio Spafford",
    createdAt: 0,
    source: "builtin",
    stanzas: [
      {
        id: "iiw-v1",
        type: "verse",
        label: "Verse 1",
        lines: [
          "When peace, like a river, attendeth my way,",
          "When sorrows like sea billows roll;",
          "Whatever my lot, Thou hast taught me to say,",
          "It is well, it is well with my soul.",
        ],
      },
      {
        id: "iiw-c1",
        type: "chorus",
        label: "Chorus",
        lines: [
          "It is well with my soul,",
          "It is well, it is well with my soul.",
        ],
      },
      {
        id: "iiw-v2",
        type: "verse",
        label: "Verse 2",
        lines: [
          "Though Satan should buffet, though trials should come,",
          "Let this blest assurance control,",
          "That Christ has regarded my helpless estate,",
          "And hath shed His own blood for my soul.",
        ],
      },
      {
        id: "iiw-c2",
        type: "chorus",
        label: "Chorus",
        lines: [
          "It is well with my soul,",
          "It is well, it is well with my soul.",
        ],
      },
      {
        id: "iiw-v3",
        type: "verse",
        label: "Verse 3",
        lines: [
          "My sin, oh, the bliss of this glorious thought!",
          "My sin, not in part but the whole,",
          "Is nailed to the cross, and I bear it no more,",
          "Praise the Lord, praise the Lord, O my soul!",
        ],
      },
      {
        id: "iiw-c3",
        type: "chorus",
        label: "Chorus",
        lines: [
          "It is well with my soul,",
          "It is well, it is well with my soul.",
        ],
      },
      {
        id: "iiw-v4",
        type: "verse",
        label: "Verse 4",
        lines: [
          "And Lord, haste the day when the faith shall be sight,",
          "The clouds be rolled back as a scroll;",
          "The trump shall resound, and the Lord shall descend,",
          "Even so, it is well with my soul.",
        ],
      },
      {
        id: "iiw-c4",
        type: "chorus",
        label: "Chorus",
        lines: [
          "It is well with my soul,",
          "It is well, it is well with my soul.",
        ],
      },
    ],
  },
  {
    id: "builtin-8",
    number: 8,
    title: "Holy, Holy, Holy! Lord God Almighty",
    author: "Reginald Heber",
    createdAt: 0,
    source: "builtin",
    stanzas: [
      {
        id: "hhh-v1",
        type: "verse",
        label: "Verse 1",
        lines: [
          "Holy, Holy, Holy! Lord God Almighty!",
          "Early in the morning our song shall rise to Thee;",
          "Holy, Holy, Holy! Merciful and Mighty!",
          "God in Three Persons, blessed Trinity!",
        ],
      },
      {
        id: "hhh-v2",
        type: "verse",
        label: "Verse 2",
        lines: [
          "Holy, Holy, Holy! All the saints adore Thee,",
          "Casting down their golden crowns around the glassy sea;",
          "Cherubim and seraphim falling down before Thee,",
          "Which wert, and art, and evermore shalt be.",
        ],
      },
      {
        id: "hhh-v3",
        type: "verse",
        label: "Verse 3",
        lines: [
          "Holy, Holy, Holy! Though the darkness hide Thee,",
          "Though the eye of sinful man Thy glory may not see,",
          "Only Thou art holy; there is none beside Thee,",
          "Perfect in power, in love, and purity.",
        ],
      },
      {
        id: "hhh-v4",
        type: "verse",
        label: "Verse 4",
        lines: [
          "Holy, Holy, Holy! Lord God Almighty!",
          "All Thy works shall praise Thy Name, in earth, and sky, and sea;",
          "Holy, Holy, Holy! Merciful and Mighty!",
          "God in Three Persons, blessed Trinity!",
        ],
      },
    ],
  },
]
