import React from "react"

export type Block =
  | { type: "h1"; content: string }
  | { type: "h2"; content: string }
  | { type: "h3"; content: string }
  | { type: "h4"; content: string }
  | { type: "bullet"; content: string; indent: number }
  | { type: "number"; content: string; num: string; indent: number }
  | { type: "blockquote"; content: string }
  | { type: "hr" }
  | { type: "code"; content: string; language?: string }
  | { type: "paragraph"; content: string }

export function parseInline(
  text: string,
  onOpenUrl?: (url: string) => void
): React.ReactNode[] {
  // Regex matches:
  // 1 & 2: [linkText](linkUrl)
  // 3: **boldText**
  // 4: `codeText`
  // 5: *italicText*
  // 6: rawUrl
  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|(https?:\/\/[^\s<>()]+)/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const [, linkText, linkUrl, boldText, codeText, italicText, rawUrl] = match

    if (linkText && linkUrl) {
      nodes.push(
        <a
          key={`link-${match.index}`}
          href={linkUrl}
          onClick={(e) => {
            e.preventDefault()
            if (onOpenUrl) {
              onOpenUrl(linkUrl)
            } else {
              window.open(linkUrl, "_blank")
            }
          }}
          className="inline-flex cursor-pointer items-center gap-0.5 font-medium text-rose-400 underline underline-offset-2 transition-colors hover:text-rose-300"
        >
          {linkText}
        </a>
      )
    } else if (rawUrl !== undefined) {
      nodes.push(
        <a
          key={`rawurl-${match.index}`}
          href={rawUrl}
          onClick={(e) => {
            e.preventDefault()
            if (onOpenUrl) {
              onOpenUrl(rawUrl)
            } else {
              window.open(rawUrl, "_blank")
            }
          }}
          className="inline-flex cursor-pointer items-center gap-0.5 font-medium text-rose-400 underline underline-offset-2 transition-colors hover:text-rose-300"
        >
          {rawUrl}
        </a>
      )
    } else if (boldText !== undefined) {
      nodes.push(
        <strong
          key={`bold-${match.index}`}
          className="font-semibold text-foreground"
        >
          {boldText}
        </strong>
      )
    } else if (codeText !== undefined) {
      nodes.push(
        <code
          key={`code-${match.index}`}
          className="rounded border border-border/50 bg-muted/80 px-1 py-0.5 font-mono text-[0.7rem] text-rose-300"
        >
          {codeText}
        </code>
      )
    } else if (italicText !== undefined) {
      nodes.push(
        <em key={`em-${match.index}`} className="italic text-muted-foreground">
          {italicText}
        </em>
      )
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes.length > 0 ? nodes : [text]
}

export function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/)
  const blocks: Block[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let codeLang = ""

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    // Handle code block fences
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          type: "code",
          content: codeLines.join("\n"),
          language: codeLang,
        })
        inCodeBlock = false
        codeLines = []
        codeLang = ""
      } else {
        inCodeBlock = true
        codeLang = trimmed.slice(3).trim()
        codeLines = []
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(rawLine)
      continue
    }

    // Skip empty lines
    if (!trimmed) {
      continue
    }

    // Horizontal rule
    if (
      trimmed === "---" ||
      trimmed === "***" ||
      trimmed === "___" ||
      /^[-*_━─]{3,}$/.test(trimmed)
    ) {
      blocks.push({ type: "hr" })
      continue
    }

    // Headers
    if (rawLine.startsWith("# ")) {
      blocks.push({ type: "h1", content: rawLine.slice(2).trim() })
      continue
    }
    if (rawLine.startsWith("## ")) {
      blocks.push({ type: "h2", content: rawLine.slice(3).trim() })
      continue
    }
    if (rawLine.startsWith("### ")) {
      blocks.push({ type: "h3", content: rawLine.slice(4).trim() })
      continue
    }
    if (rawLine.startsWith("#### ")) {
      blocks.push({ type: "h4", content: rawLine.slice(5).trim() })
      continue
    }

    // Blockquote
    if (rawLine.startsWith("> ")) {
      blocks.push({ type: "blockquote", content: rawLine.slice(2).trim() })
      continue
    }

    // Bullets: -, *, +, •
    const bulletMatch = rawLine.match(/^(\s*)[-*+•]\s+(.*)$/)
    if (bulletMatch) {
      blocks.push({
        type: "bullet",
        content: bulletMatch[2],
        indent: bulletMatch[1].length >= 2 ? 1 : 0,
      })
      continue
    }

    // Numbered list: 1., 2.
    const numMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.*)$/)
    if (numMatch) {
      blocks.push({
        type: "number",
        content: numMatch[3],
        num: numMatch[2],
        indent: numMatch[1].length >= 2 ? 1 : 0,
      })
      continue
    }

    // Multi-line continuation: if this line is indented and follows a bullet or paragraph
    const lastBlock = blocks[blocks.length - 1]
    if (
      lastBlock &&
      (rawLine.startsWith("  ") || rawLine.startsWith("\t")) &&
      (lastBlock.type === "bullet" || lastBlock.type === "paragraph")
    ) {
      lastBlock.content += ` ${trimmed}`
      continue
    }

    // Default to paragraph
    blocks.push({ type: "paragraph", content: trimmed })
  }

  // Handle unclosed code block if any
  if (inCodeBlock && codeLines.length > 0) {
    blocks.push({
      type: "code",
      content: codeLines.join("\n"),
      language: codeLang,
    })
  }

  return blocks
}
