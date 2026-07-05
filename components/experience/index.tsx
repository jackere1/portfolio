"use client"

import { Canvas } from "@react-three/fiber"
import { Preload } from "@react-three/drei"
import { Suspense, useEffect, useRef } from "react"
import Lenis from "lenis"
import { CameraRig } from "./camera-rig"
import { Environment } from "./environment"
import { PostProcessing } from "./post-processing"
import { Shaft } from "../world/shaft"
import { Seam } from "../world/seam"
import { SkyDome } from "../world/sky-dome"
import { Levels } from "../sections/levels"
import { NavOverlay } from "../ui/nav-overlay"
import { ScrollHint } from "../ui/scroll-hint"
import { LoadingScreen } from "../ui/loading-screen"
import { Capsule } from "../ui/capsule"
import { Colophon } from "../ui/colophon"
import { Cursor } from "../ui/cursor"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { useGpuTier } from "@/hooks/use-gpu-tier"

function Scene() {
  const { quality } = useGpuTier()

  return (
    <>
      <CameraRig />
      <Environment />
      <SkyDome />

      {/* The shaft — a stack of distinct floor stages you descend through,
          divided by storey slabs, with ground level at the boundary. */}
      <Shaft />
      <Seam />

      {/* Post-processing effects */}
      <PostProcessing quality={quality} />

      <Preload all />
    </>
  )
}

export function Experience() {
  const lenisRef = useRef<Lenis | null>(null)
  const loaded = useScrollStore((s) => s.loaded)
  const setProgress = useScrollStore((s) => s.setProgress)
  const { quality } = useGpuTier()

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    })
    lenisRef.current = lenis

    // Expose lenis on window so nav can call scrollTo
    ;(window as Window & { __lenis?: Lenis }).__lenis = lenis

    lenis.on("scroll", (e: Lenis) => {
      setProgress(e.progress)
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
      delete (window as Window & { __lenis?: Lenis }).__lenis
    }
  }, [setProgress])

  return (
    <>
      {!loaded && <LoadingScreen />}

      {/* Scrollable spacer — Lenis scrolls this, we read progress */}
      <div style={{ height: "600vh" }} aria-hidden />

      {/* Fixed canvas overlay — touch-action allows mobile scroll pass-through */}
      <div
        className="fixed inset-0"
        style={{ touchAction: "pan-y", pointerEvents: "none" }}
      >
        <Canvas
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            stencil: false,
            depth: true,
          }}
          dpr={[1, quality.maxDpr]}
          camera={{ position: [0, 12, 8], fov: 60, near: 0.1, far: 200 }}
          style={{
            background: "#9bb0cf",
            pointerEvents: "auto",
            touchAction: "pan-y",
          }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      {/* 2D overlays on top of the canvas (DOM siblings — the camera can't touch them) */}
      <Capsule />
      <Levels />
      <NavOverlay />
      <ScrollHint />
      <Cursor />
      <Colophon />
    </>
  )
}
