"use client"

import { Suspense, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { Preload } from "@react-three/drei"
import Lenis from "lenis"
import * as THREE from "three"
import { useGpuTier } from "@/hooks/use-gpu-tier"
import { setProgress, useJourneyStore } from "@/hooks/use-journey"
import { JOURNEY_VH } from "@/lib/stops"
import { CameraRig } from "./camera-rig"
import { Environment } from "./environment"
import { PostProcessing } from "./post-processing"
import { Sky } from "@/components/world/sky"
import { Terrain } from "@/components/world/terrain"
import { Vegetation } from "@/components/world/grass"
import { Ger } from "@/components/world/ger"
import { Camp } from "@/components/world/camp"
import { HOST_GER } from "@/lib/ger"
import { Chrome } from "@/components/ui/chrome"

function Scene({ quality }: { quality: ReturnType<typeof useGpuTier>["quality"] }) {
  return (
    <>
      <CameraRig />
      <Environment quality={quality} />
      <Sky />
      <Suspense fallback={null}>
        <Terrain />
      </Suspense>
      <Vegetation />
      <Ger params={HOST_GER} />
      <Camp />
      <PostProcessing quality={quality} />
      <Preload all />
    </>
  )
}

export function Experience() {
  const { quality } = useGpuTier()
  const setReady = useJourneyStore((s) => s.setReady)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Native touch scroll runs off the rAF thread and desyncs the canvas.
      syncTouch: true,
      touchMultiplier: 1.4,
    })

    // The camera moves ONLY while the user scrolls — one to one with the
    // gesture. This is the whole anti-nausea contract, and it lives here.
    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    lenis.on("scroll", (e: { progress: number }) => setProgress(e.progress))
    ;(window as unknown as { __ailchin?: unknown }).__ailchin = {
      lenis,
      seek: (t: number) =>
        lenis.scrollTo(t * (document.body.scrollHeight - window.innerHeight), {
          immediate: true,
        }),
    }

    setReady(true)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [setReady])

  return (
    <>
      <div className="stage">
        <Canvas
          dpr={[1, quality.dpr]}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: "high-performance",
            // The composer applies AgX itself; leave the renderer out of it or
            // the image is tone mapped twice.
            toneMapping: THREE.NoToneMapping,
          }}
          camera={{ fov: 60, near: 0.1, far: 6000, position: [18, 2, -104] }}
          shadows={quality.shadows}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace
            gl.setClearColor(0x05070f, 1)
          }}
        >
          <Scene quality={quality} />
        </Canvas>
      </div>

      {/* The scroll the journey rides on. Nothing is drawn here. */}
      <div className="scroll-track" style={{ height: `${JOURNEY_VH}vh` }} />

      <Chrome />
    </>
  )
}
