"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useGpuTier } from "@/hooks/use-gpu-tier"
import { FlatTier } from "@/components/ui/flat-tier"
import { GpuDiagnostic } from "@/components/ui/gpu-diagnostic"

const Experience = dynamic(
  () => import("@/components/experience").then((m) => ({ default: m.Experience })),
  { ssr: false, loading: () => null }
)

export default function HomePage() {
  const { isFlat, probe } = useGpuTier()

  // Read once on the client. Reading `location` during render would disagree
  // with the server's markup.
  const [diag, setDiag] = useState(false)
  useEffect(() => {
    setDiag(new URLSearchParams(window.location.search).get("diag") === "1")
  }, [])

  return (
    <>
      {isFlat ? <FlatTier /> : <Experience />}
      {diag && <GpuDiagnostic probe={probe} />}
    </>
  )
}
