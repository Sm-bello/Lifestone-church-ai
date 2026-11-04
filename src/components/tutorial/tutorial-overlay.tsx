import { useState, useEffect, useCallback, useMemo } from "react"
import { Joyride, STATUS, type EventData } from "react-joyride"
import { toast } from "sonner"
import {
  useTutorialStore,
  hydrateOnboardingState,
  persistOnboardingComplete,
  touchActivity,
} from "@/stores/tutorial-store"
import { TUTORIAL_STEPS } from "./tutorial-steps"
import { TutorialTooltip } from "./tutorial-tooltip"
import { useTheme } from "@/components/theme-provider"

export function TutorialOverlay() {
  const [isHydrated, setIsHydrated] = useState(false)
  const isRunning = useTutorialStore((s) => s.isRunning)
  const { theme } = useTheme()

  const [arrowColor, setArrowColor] = useState<string | undefined>()

  useEffect(() => {
    requestAnimationFrame(() => {
      const cardEl = document.querySelector(".bg-card")
      if (cardEl) {
        setArrowColor(getComputedStyle(cardEl).backgroundColor)
      }
    })
  }, [theme])

  const steps = useMemo(
    () =>
      TUTORIAL_STEPS.map((step) => ({
        ...step,
        arrowColor,
      })),
    [arrowColor]
  )

  useEffect(() => {
    hydrateOnboardingState().then(({ shouldRun, isRefresher }) => {
      setIsHydrated(true)
      if (shouldRun) {
        const timer = setTimeout(() => {
          if (isRefresher) {
            toast.info("Welcome back to Lifestone!", {
              description: "Starting a quick feature refresher (Press Esc to skip).",
            })
          }
          useTutorialStore.getState().startTutorial(isRefresher)
        }, 600)
        return () => clearTimeout(timer)
      }
    })

    // Periodic activity touch to record usage
    const interval = setInterval(touchActivity, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleEvent = useCallback((data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      useTutorialStore.getState().stopTutorial()
      persistOnboardingComplete()

      if (data.status === STATUS.SKIPPED) {
        toast.info("Tutorial skipped", {
          description: "Restart anytime in Settings.",
        })
      } else if (data.status === STATUS.FINISHED) {
        toast.success("You're all set!", {
          description: "Plug in HDMI, search hymns, or speak scripture to present live.",
        })
      }
    }
  }, [])

  if (!isHydrated) return null

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      continuous
      buttons={["back", "primary", "skip"]}
      skipScroll
      tooltipComponent={TutorialTooltip}
      onEvent={handleEvent}
      zIndex={60}
      overlayColor="rgba(0, 0, 0, 0.55)"
    />
  )
}
