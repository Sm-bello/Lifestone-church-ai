import { create } from "zustand"
import { load } from "@tauri-apps/plugin-store"
import { useSettingsStore } from "./settings-store"

export const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000 // 48 hours of inactivity

interface TutorialState {
  isRunning: boolean
  isRefresher: boolean
  startTutorial: (isRefresher?: boolean) => void
  stopTutorial: () => void
}

export const useTutorialStore = create<TutorialState>((set) => ({
  isRunning: false,
  isRefresher: false,
  startTutorial: (isRefresher = false) => set({ isRunning: true, isRefresher }),
  stopTutorial: () => set({ isRunning: false, isRefresher: false }),
}))

export interface HydrateResult {
  shouldRun: boolean
  isRefresher: boolean
}

/**
 * Load onboarding state and check for 2+ days of inactivity.
 * Returns whether the tutorial should run, and whether it's an inactivity refresher.
 */
export async function hydrateOnboardingState(): Promise<HydrateResult> {
  try {
    const store = await load("settings.json", { autoSave: false })
    const completed = await store.get<boolean>("onboardingComplete")
    const lastActive = await store.get<number>("lastActiveTimestamp")
    const now = Date.now()

    // Record activity timestamp for current session
    await store.set("lastActiveTimestamp", now)
    await store.save()

    if (!completed) {
      // First-time user onboarding
      return { shouldRun: true, isRefresher: false }
    }

    useSettingsStore.getState().setOnboardingComplete(true)

    // Intelligent refresher: if user has been inactive for > 2 days (48 hours), run refresher guide
    if (lastActive && now - lastActive > TWO_DAYS_MS) {
      return { shouldRun: true, isRefresher: true }
    }

    return { shouldRun: false, isRefresher: false }
  } catch {
    console.warn("[tutorial] Failed to load persisted state, using defaults")
    return { shouldRun: false, isRefresher: false }
  }
}

/** Write onboardingComplete=true to both Zustand and disk with updated timestamps. */
export async function persistOnboardingComplete(): Promise<void> {
  useSettingsStore.getState().setOnboardingComplete(true)
  try {
    const store = await load("settings.json", { autoSave: false })
    const now = Date.now()
    await store.set("onboardingComplete", true)
    await store.set("lastActiveTimestamp", now)
    await store.set("tutorialLastCompletedAt", now)
    await store.save()
  } catch {
    console.warn("[tutorial] Failed to persist onboarding state")
  }
}

/** Keep activity timestamp fresh during active session */
export async function touchActivity(): Promise<void> {
  try {
    const store = await load("settings.json", { autoSave: false })
    await store.set("lastActiveTimestamp", Date.now())
    await store.save()
  } catch {
    // Non-fatal
  }
}
