"use client"

import { useEffect, useState } from "react"

export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = (scrollTop / docHeight) * 100
      setProgress(scrollPercent)
    }

    window.addEventListener("scroll", updateProgress)
    return () => window.removeEventListener("scroll", updateProgress)
  }, [])

  return (
    <>
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-muted z-50">
        <div
          className="h-full bg-gradient-to-r from-primary via-primary to-primary/50 transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Side progress indicator */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col items-center gap-2">
        <div className="h-32 w-[2px] bg-muted rounded-full overflow-hidden">
          <div
            className="w-full bg-primary transition-all duration-150 ease-out rounded-full"
            style={{ height: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
      </div>
    </>
  )
}
