import React from "react"
import { openUrl } from "@tauri-apps/plugin-opener"
import {
  parseMarkdownBlocks,
  parseInline,
  type Block,
} from "@/lib/release-notes-parser"

interface ReleaseNotesViewProps {
  notes?: string | null
  className?: string
}

export function ReleaseNotesView({ notes, className }: ReleaseNotesViewProps) {
  if (!notes || !notes.trim()) {
    return (
      <div className="py-2 text-xs italic text-muted-foreground">
        No release notes provided for this version.
      </div>
    )
  }

  const handleOpenLink = async (url: string) => {
    try {
      await openUrl(url)
    } catch {
      window.open(url, "_blank")
    }
  }

  const blocks = parseMarkdownBlocks(notes)

  // Render blocks grouped into list containers
  const elements: React.ReactNode[] = []
  let currentList: { type: "bullet" | "number"; items: Block[] } | null = null

  const flushList = (key: string | number) => {
    if (!currentList) return
    if (currentList.type === "bullet") {
      elements.push(
        <ul key={`ul-${key}`} className="my-1 space-y-1.5">
          {currentList.items.map((item, idx) => {
            if (item.type !== "bullet") return null
            return (
              <li
                key={`bullet-${idx}`}
                className={`flex items-start gap-2 text-xs leading-relaxed text-muted-foreground ${
                  item.indent > 0 ? "pl-4" : "pl-0.5"
                }`}
              >
                <span className="mt-1 shrink-0 text-[7px] leading-none text-rose-400 select-none">
                  ●
                </span>
                <span className="min-w-0 flex-1">
                  {parseInline(item.content, handleOpenLink)}
                </span>
              </li>
            )
          })}
        </ul>
      )
    } else {
      elements.push(
        <ol key={`ol-${key}`} className="my-1 space-y-1.5">
          {currentList.items.map((item, idx) => {
            if (item.type !== "number") return null
            return (
              <li
                key={`num-${idx}`}
                className={`flex items-start gap-2 text-xs leading-relaxed text-muted-foreground ${
                  item.indent > 0 ? "pl-4" : "pl-0.5"
                }`}
              >
                <span className="shrink-0 font-mono text-[0.7rem] font-semibold text-rose-400 select-none">
                  {item.num}.
                </span>
                <span className="min-w-0 flex-1">
                  {parseInline(item.content, handleOpenLink)}
                </span>
              </li>
            )
          })}
        </ol>
      )
    }
    currentList = null
  }

  blocks.forEach((block, index) => {
    if (block.type === "bullet" || block.type === "number") {
      if (!currentList || currentList.type !== block.type) {
        flushList(index)
        currentList = { type: block.type, items: [block] }
      } else {
        currentList.items.push(block)
      }
      return
    }

    // Flush any pending list
    flushList(index)

    switch (block.type) {
      case "h1":
        elements.push(
          <h2
            key={`h1-${index}`}
            className="border-b border-border/50 pt-2 pb-1 text-sm font-bold tracking-tight text-foreground first:pt-0"
          >
            {parseInline(block.content, handleOpenLink)}
          </h2>
        )
        break
      case "h2":
        elements.push(
          <h3
            key={`h2-${index}`}
            className="border-b border-border/30 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wider text-rose-400 first:pt-0"
          >
            {parseInline(block.content, handleOpenLink)}
          </h3>
        )
        break
      case "h3":
        elements.push(
          <h4
            key={`h3-${index}`}
            className="flex items-center gap-1.5 pt-2 pb-0.5 text-xs font-semibold text-foreground first:pt-0"
          >
            {parseInline(block.content, handleOpenLink)}
          </h4>
        )
        break
      case "h4":
        elements.push(
          <h5
            key={`h4-${index}`}
            className="pt-1.5 pb-0.5 text-xs font-medium text-muted-foreground first:pt-0"
          >
            {parseInline(block.content, handleOpenLink)}
          </h5>
        )
        break
      case "blockquote":
        elements.push(
          <div
            key={`quote-${index}`}
            className="my-1.5 rounded-r border-l-2 border-rose-500/50 bg-rose-500/5 py-1.5 pr-2 pl-3 text-xs italic text-muted-foreground"
          >
            {parseInline(block.content, handleOpenLink)}
          </div>
        )
        break
      case "hr":
        elements.push(
          <hr key={`hr-${index}`} className="my-2 border-border/60" />
        )
        break
      case "code":
        elements.push(
          <pre
            key={`code-${index}`}
            className="custom-scroll my-1.5 overflow-x-auto rounded-md border border-border/50 bg-muted/60 p-2.5 font-mono text-[0.7rem] text-foreground/90"
          >
            <code>{block.content}</code>
          </pre>
        )
        break
      case "paragraph":
        elements.push(
          <p
            key={`p-${index}`}
            className="my-1 text-xs leading-relaxed text-muted-foreground"
          >
            {parseInline(block.content, handleOpenLink)}
          </p>
        )
        break
    }
  })

  // Flush any final list
  flushList("final")

  return (
    <div className={`space-y-1 font-sans ${className || ""}`}>{elements}</div>
  )
}
