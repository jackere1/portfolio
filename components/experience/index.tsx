"use client"

import { Suspense, useEffect } from "react"
import { Canvas, useThree } from "@react-three/fiber"
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
import { Interior } from "@/components/world/interior"
import { Bankhar, Flock } from "@/components/world/animals"
import { Host } from "@/components/world/people"
import { Ovoo } from "@/components/world/ovoo"
import { HOST_GER } from "@/lib/ger"
import { Chrome } from "@/components/ui/chrome"

/** Exposes the renderer and scene on window.__ailchin for measurement. This is
 *  a runtime branch behind a flag, not a static one, so it is NOT tree-shaken —
 *  it ships. That is a deliberate trade: being able to profile the real build
 *  is worth a few bytes, and claiming otherwise would be untrue. */
function Probe() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    const w = window as unknown as { __ailchin?: Record<string, unknown> }
    // MUTATE, never replace. Two effects write to this object from two
    // different React roots (the page and the R3F canvas) and their order is
    // not guaranteed, so whichever assigned second used to erase the first.
    w.__ailchin = w.__ailchin ?? {}
    w.__ailchin.gl = gl
    w.__ailchin.scene = scene
    w.__ailchin.camera = camera
  }, [gl, scene, camera])
  return null
}

function Scene({ quality }: { quality: ReturnType<typeof useGpuTier>["quality"] }) {
  return (
    <>
      <Probe />
      <CameraRig />
      <Environment quality={quality} />
      <Sky />
      <Suspense fallback={null}>
        <Terrain />
      </Suspense>
      <Vegetation />
      <Ger params={HOST_GER} />
      <Camp />
      <Interior />
      <Flock />
      <Bankhar />
      <Host />
      <Ovoo />
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
    // MERGE, never assign: the in-canvas probe writes gl/scene/camera onto the
    // same object and whichever effect ran second used to erase the other.
    const w = window as unknown as { __ailchin?: Record<string, unknown> }
    w.__ailchin = w.__ailchin ?? {}
    w.__ailchin.lenis = lenis
    w.__ailchin.seek = (t: number) =>
      lenis.scrollTo(t * (document.body.scrollHeight - window.innerHeight), {
        immediate: true,
      })

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
          camera={{ fov: 60, near: 0.1, far: 26000, position: [18, 2, -104] }}
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
