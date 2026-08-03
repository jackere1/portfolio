"use client"

import dynamic from "next/dynamic"
import { useGpuTier } from "@/hooks/use-gpu-tier"
import { FlatTier } from "@/components/ui/flat-tier"

const Experience = dynamic(
  () => import("@/components/experience").then((m) => ({ default: m.Experience })),
  { ssr: false, loading: () => null }
)

export default function HomePage() {
  const { isFlat } = useGpuTier()

  if (isFlat) return <FlatTier />

  return <Experience />
}
