"use client"

import { useScrollStore } from "@/hooks/use-scroll-store"

export function ScrollHint() {
  const progress = useScrollStore((s) => s.progress)
  const loaded = useScrollStore((s) => s.loaded)

  // Only show at the very beginning
  if (!loaded || progress > 0.05) return null

  return (
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[oklch(0.55_0.02_80)]">
        Scroll to descend
      </span>
      <span className="font-mono text-[oklch(0.78_0.18_75/0.8)] text-sm leading-none animate-bounce">
        ▼
      </span>
    </div>
  )
}
