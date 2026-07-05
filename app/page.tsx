"use client"

import dynamic from "next/dynamic"
import { useGpuTier } from "@/hooks/use-gpu-tier"
import { MobileFallback } from "@/components/ui/mobile-fallback"
import { CanvasCrashBoundary } from "@/components/experience/asset-boundary"

const Experience = dynamic(
  () =>
    import("@/components/experience").then((mod) => ({
      default: mod.Experience,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="loading-screen">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-4 h-4 rounded-full bg-[oklch(0.78_0.18_75)]" />
            <div className="absolute inset-0 w-4 h-4 rounded-full bg-[oklch(0.78_0.18_75)] animate-ping opacity-40" />
          </div>
          <p className="text-sm font-mono text-[oklch(0.55_0.02_80)] tracking-wider">
            INITIALIZING
          </p>
        </div>
      </div>
    ),
  }
)

export default function HomePage() {
  const { isFallback } = useGpuTier()

  if (isFallback) {
    return <MobileFallback />
  }

  // If the WebGL experience crashes for any reason — a driver fault, a lost
  // context, an asset failure that slips past the in-scene boundaries — fall all
  // the way back to the CSS dive rather than a blank page. The dive still reads.
  return (
    <div className="noise-overlay">
      <CanvasCrashBoundary fallback={<MobileFallback />}>
        <Experience />
      </CanvasCrashBoundary>
    </div>
  )
}
