import { useEffect, useRef } from "react"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

export function useTauriEvent<T>(
  event: string,
  handler: (payload: T) => void
) {
  const handlerRef = useRef(handler)
  // eslint-disable-next-line react-hooks/refs
  handlerRef.current = handler

  useEffect(() => {
    let cancelled = false
    let unlisten: UnlistenFn | undefined

    listen<T>(event, (e) => {
      if (!cancelled) {
        handlerRef.current(e.payload)
      }
    }).then((fn) => {
      if (cancelled) {
        fn()
      } else {
        unlisten = fn
      }
    })

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [event])
}