"use client"

import { useScrollStore } from "@/hooks/use-scroll-store"

export function ScrollHint() {
  const progress = useScrollStore((s) => s.progress)
  const loaded = useScrollStore((s) => s.loaded)

  // Only show at the very beginning
  if (!loaded || progress > 0.05) return null

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 animate-pulse">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[oklch(0.55_0.02_80)]">
        Scroll to explore
      </span>
      <div className="w-5 h-8 rounded-full border border-[oklch(0.78_0.18_75/0.3)] flex justify-center pt-1.5">
        <div className="w-1 h-2 rounded-full bg-[oklch(0.78_0.18_75)] animate-bounce" />
      </div>
    </div>
  )
}
