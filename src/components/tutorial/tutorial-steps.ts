import type { Step } from "react-joyride"

const STEP_DEFAULTS = {
  disableBeacon: true,
  skipBeacon: true,
} as const satisfies Partial<Step>

export const TUTORIAL_STEPS: Step[] = [
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="transport-bar"]',
    title: "⚡ Instant HDMI & Projector Ready",
    content:
      "Welcome to Lifestone! Just plug your HDMI cable into your church projector, TV, or external monitor. Lifestone automatically detects displays in real time and asks which screen to project on with zero driver configuration.",
    placement: "bottom",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="gpu-status"]',
    title: "🚀 Smart GPU & CPU Recognition",
    content:
      "Lifestone automatically checks your PC's graphics hardware on launch. If a dedicated GPU is found ('yay! there GPU lets fly'), AI runs at ultra speed. If no GPU is present on a budget PC, Lifestone switches to CPU-optimized mode so voice recognition still works reliably.",
    placement: "bottom",
    spotlightPadding: 4,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="projector-toggle"]',
    title: "🖥️ Live Projector Control",
    content:
      "Launch or close the live full-screen projection window with one click. When external displays are connected, this button lights up and gives you instant control over church screens.",
    placement: "bottom",
    spotlightPadding: 4,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="hymnal-toggle"]',
    title: "🎵 Church Hymnal (2,000+ Hymns)",
    content:
      "Access over 2,000 church hymns (including Gospel Hymn Book / GHS). Search by hymn number, title, or lyric lines, preview any stanza, and project them live immediately.",
    placement: "bottom",
    spotlightPadding: 4,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="developer-feedback"]',
    title: "💬 Talk to the Developer (Command Center)",
    content:
      "Have a feature request or need help? Sign in with your Gmail to receive a unique Church Digital Signature, chat directly with the developer, light up your church beacon on the global map, and receive custom signed update notifications.",
    placement: "bottom",
    spotlightPadding: 4,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="transcript-panel"]',
    title: "🎙️ Live Speech Transcription Bucket",
    content:
      "Lifestone listens to the sermon through your microphone or sound desk. Offline speech AI transcribes the sermon live, automatically identifying Bible books, chapters, and verses as they are preached.",
    placement: "right",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="detections-panel"]',
    title: "AI Bible Detections",
    content:
      "Detected verses appear here in real time. Press Present to project a verse immediately, or Queue to store it for upcoming sermon points.",
    placement: "left",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="book-search"]',
    title: "Manual Scripture Lookup",
    content:
      "Quickly browse any Bible book, chapter, and verse. Switch between translations (KJV, ASV, BBE) with one click.",
    placement: "bottom",
    spotlightPadding: 2,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="context-search"]',
    title: "AI Semantic Context Search",
    content:
      "Search by sermon phrase, theme, or concept (e.g. 'fruit of the spirit' or 'armor of God'). Lifestone finds matching scripture instantly.",
    placement: "bottom",
    spotlightPadding: 2,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="quick-nav"]',
    title: "Instant Keyboard Speed-Dial",
    content:
      "Type letters to navigate instantly: 'J' → 'Joshua' or '1 J' → '1 John'. Press Tab to jump through chapter and verse.",
    placement: "bottom",
    spotlightPadding: 2,
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="queue-panel"]',
    title: "Sermon Verse Queue",
    content:
      "Your staged verses live here. Drag to reorder and click to present. Build your service set list before or during preaching.",
    placement: "left",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="media-bucket"]',
    title: "Media & Announcement Bucket",
    content:
      "Load church flyer images and announcement videos. Click any media item to project it full-screen on your live projector displays.",
    placement: "right",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="preview-panel"]',
    title: "Programme Preview",
    content:
      "Preview how scriptures, hymns, and media look before sending them to the church screen. Confidence monitoring ensures stage accuracy.",
    placement: "bottom",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-slot="live-output-panel"]',
    title: "Live Display & Broadcast Output",
    content:
      "The master live display. Active scriptures, hymns, and media appear here and feed directly to HDMI projectors, OBS, vMix, and NDI streams.",
    placement: "bottom",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="broadcast"]',
    title: "Broadcast & NDI Streaming",
    content:
      "Configure NDI network video outputs, transparency alpha overlays, and custom output resolutions for your media team.",
    placement: "bottom",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="theme"]',
    title: "Visual Themes & Typography",
    content:
      "Customize fonts, colors, shadows, and backgrounds to match your church sanctuary aesthetic using the Theme Designer.",
    placement: "bottom",
  },
  {
    ...STEP_DEFAULTS,
    target: '[data-tour="settings"]',
    title: "Settings & Options",
    content:
      "Configure audio inputs, translation preferences, remote control, and keyboard hotkeys. You can restart this tutorial anytime here.",
    placement: "bottom",
  },
]
