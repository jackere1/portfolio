"use client"

import { useEffect, useState } from "react"
import { useScrollStore } from "@/hooks/use-scroll-store"

export function LoadingScreen() {
  const loaded = useScrollStore((s) => s.loaded)
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (loaded) {
      // Begin fade-out
      setFading(true)
      const timer = setTimeout(() => setVisible(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [loaded])

  if (!visible) return null

  return (
    <div
      className={`loading-screen transition-opacity duration-1000 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Pulsing amber dot */}
        <div className="relative">
          <div className="w-4 h-4 rounded-full bg-[oklch(0.78_0.18_75)]" />
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-[oklch(0.78_0.18_75)] animate-ping opacity-40" />
        </div>

        <div className="text-center">
          <p className="text-sm font-mono text-[oklch(0.55_0.02_80)] tracking-[0.28em]">
            PRESSURIZING
          </p>
        </div>
      </div>
    </div>
  )
}
