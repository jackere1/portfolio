"use client"

import dynamic from "next/dynamic"
import { useGpuTier } from "@/hooks/use-gpu-tier"
import { MobileFallback } from "@/components/ui/mobile-fallback"

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

  return (
    <div className="noise-overlay">
      <Experience />
    </div>
  )
}
