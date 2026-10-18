export interface HymnStanza {
  id: string
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'pre-chorus' | 'tag'
  label: string          // e.g. "Verse 1", "Chorus", "Bridge"
  lines: string[]        // Each line of the stanza
}

export interface Hymn {
  id: string
  number?: number        // Traditional hymn number (optional)
  title: string
  author?: string
  stanzas: HymnStanza[]
  createdAt: number
  source: 'builtin' | 'imported'
}
