"use client"

import { Canvas } from "@react-three/fiber"
import { Preload } from "@react-three/drei"
import { Suspense, useEffect, useRef } from "react"
import Lenis from "lenis"
import { CameraRig } from "./camera-rig"
import { Environment } from "./environment"
import { PostProcessing } from "./post-processing"
import { MachineCore } from "../world/machine-core"
import { EnergyRings } from "../world/energy-rings"
import { GridFloor } from "../world/grid-floor"
import { GpuParticleField } from "../world/particle-field-gpu"
import { FloatingMonoliths } from "../world/floating-monoliths"
import { HeroPanel } from "../sections/hero-panel"
import { AboutPanel } from "../sections/about-panel"
import { ExperiencePanel } from "../sections/experience-panel"
import { ProjectsPanel } from "../sections/projects-panel"
import { SkillsPanel } from "../sections/skills-panel"
import { ContactPanel } from "../sections/contact-panel"
import { NavOverlay } from "../ui/nav-overlay"
import { ScrollHint } from "../ui/scroll-hint"
import { LoadingScreen } from "../ui/loading-screen"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { useGpuTier } from "@/hooks/use-gpu-tier"

function Scene() {
  const { quality } = useGpuTier()

  return (
    <>
      <CameraRig />
      <Environment />

      {/* World geometry */}
      <MachineCore />
      <EnergyRings />
      <GridFloor />
      {quality.particleCount > 0 && (
        <GpuParticleField count={quality.particleCount} />
      )}
      <FloatingMonoliths />

      {/* HTML content panels anchored in 3D space */}
      <HeroPanel />
      <AboutPanel />
      <ExperiencePanel />
      <ProjectsPanel />
      <SkillsPanel />
      <ContactPanel />

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
          dpr={[1, 1.5]}
          camera={{ position: [0, 12, 8], fov: 60, near: 0.1, far: 200 }}
          style={{
            background: "#0a0a14",
            pointerEvents: "auto",
            touchAction: "pan-y",
          }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      {/* 2D overlays on top of the canvas */}
      <NavOverlay />
      <ScrollHint />
    </>
  )
}
