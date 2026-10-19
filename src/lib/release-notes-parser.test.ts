import { describe, expect, it } from "vitest"
import { parseMarkdownBlocks, parseInline } from "./release-notes-parser"

describe("release-notes-parser", () => {
  it("parses headings and block structures correctly", () => {
    const markdown = `## Lifestone v1.0.8 Release Notes

### 🎵 Hymnal Console Smooth Scrolling & Display Fix
- **Unconstrained Multi-Directional Scrolling**: Replaced restricted viewport with native custom scrollbars.
- **Badge & Content Layout**: Fixed clipping of 'BUILTIN' badge.
- **Responsive Stanza Grid**: Stanza cards wrap lyrics cleanly.

> Note: this is an important update.

1. Step one
2. Step two
`
    const blocks = parseMarkdownBlocks(markdown)

    expect(blocks[0]).toEqual({
      type: "h2",
      content: "Lifestone v1.0.8 Release Notes",
    })

    expect(blocks[1]).toEqual({
      type: "h3",
      content: "🎵 Hymnal Console Smooth Scrolling & Display Fix",
    })

    expect(blocks[2]).toEqual({
      type: "bullet",
      content:
        "**Unconstrained Multi-Directional Scrolling**: Replaced restricted viewport with native custom scrollbars.",
      indent: 0,
    })

    expect(blocks[3]).toEqual({
      type: "bullet",
      content: "**Badge & Content Layout**: Fixed clipping of 'BUILTIN' badge.",
      indent: 0,
    })

    expect(blocks[4]).toEqual({
      type: "bullet",
      content:
        "**Responsive Stanza Grid**: Stanza cards wrap lyrics cleanly.",
      indent: 0,
    })

    expect(blocks[5]).toEqual({
      type: "blockquote",
      content: "Note: this is an important update.",
    })

    expect(blocks[6]).toEqual({
      type: "number",
      content: "Step one",
      num: "1",
      indent: 0,
    })

    expect(blocks[7]).toEqual({
      type: "number",
      content: "Step two",
      num: "2",
      indent: 0,
    })
  })

  it("handles code blocks properly", () => {
    const markdown = `Here is some code:
\`\`\`ts
const version = "1.0.8";
console.log(version);
\`\`\`
Done.`

    const blocks = parseMarkdownBlocks(markdown)
    expect(blocks.length).toBe(3)
    expect(blocks[0].type).toBe("paragraph")
    expect(blocks[1]).toEqual({
      type: "code",
      content: 'const version = "1.0.8";\nconsole.log(version);',
      language: "ts",
    })
    expect(blocks[2].type).toBe("paragraph")
  })

  it("parses inline bold, code, italic, and links", () => {
    const text =
      "Check out **bold feature**, `code snippet`, *italic note*, and [link](https://github.com)."
    const nodes = parseInline(text)
    expect(nodes.length).toBe(9)
  })

  it("parses unicode bullets, dividers, and raw URLs", () => {
    const markdown = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• First item
• Second item with https://lifestone-church-ai.vercel.app`
    const blocks = parseMarkdownBlocks(markdown)
    expect(blocks[0].type).toBe("hr")
    expect(blocks[1].type).toBe("bullet")
    expect(blocks[1].content).toBe("First item")
    expect(blocks[2].type).toBe("bullet")

    const inlineNodes = parseInline(blocks[2].content)
    expect(inlineNodes.length).toBe(2)
  })
})
