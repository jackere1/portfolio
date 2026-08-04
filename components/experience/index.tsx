"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
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
import { Bankhar, Flock, Zel } from "@/components/world/animals"
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

/**
 * Watches the GL context and reports it losing and regaining consciousness.
 *
 * This lives INSIDE the canvas rather than in `onCreated` for one reason:
 * `onCreated` has no teardown, and these listeners must die with the canvas
 * they belong to. When a restored context triggers a remount, the discarded
 * canvas fires `webglcontextlost` a SECOND time on its way out — and a listener
 * that outlived it flips the "lost" overlay back on over the perfectly good new
 * canvas underneath, which looks exactly like a failed recovery.
 */
function ContextGuard({
  onLost,
  onRestored,
}: {
  onLost: () => void
  onRestored: () => void
}) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (e: Event) => {
      // Without preventDefault the browser never attempts a restore and
      // `webglcontextrestored` never fires at all. three does this too; doing
      // it here as well costs nothing and does not depend on three's internals.
      e.preventDefault()
      onLost()
    }
    const restored = () => onRestored()
    canvas.addEventListener("webglcontextlost", lost)
    canvas.addEventListener("webglcontextrestored", restored)
    return () => {
      canvas.removeEventListener("webglcontextlost", lost)
      canvas.removeEventListener("webglcontextrestored", restored)
    }
  }, [gl, onLost, onRestored])
  return null
}

function Scene({
  quality,
  onGlLost,
  onGlRestored,
}: {
  quality: ReturnType<typeof useGpuTier>["quality"]
  onGlLost: () => void
  onGlRestored: () => void
}) {
  return (
    <>
      <Probe />
      <ContextGuard onLost={onGlLost} onRestored={onGlRestored} />
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
      <Zel />
      <Host />
      <Ovoo />
      <PostProcessing quality={quality} />
      <Preload all />
    </>
  )
}

/**
 * The world, while the GPU has taken the context away.
 *
 * Deliberately plain and inline-styled: this renders precisely when the
 * renderer is gone, so it may not depend on anything the renderer owns. It
 * carries the night inks explicitly for the same reason the entry overlay does
 * — it sits on a cleared canvas whatever the sky was doing a moment ago.
 */
function ContextLost() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 4000)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "grid",
        placeItems: "center",
        gap: 14,
        background: "#05070f",
        color: "#cfd8e8",
        font: "500 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <div style={{ opacity: 0.7 }}>The light went out</div>
        <div style={{ opacity: 0.4, marginTop: 8, textTransform: "none", letterSpacing: "0.04em" }}>
          {slow
            ? "The graphics context did not come back."
            : "Rebuilding the world…"}
        </div>
        {slow && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 18,
              padding: "10px 18px",
              background: "transparent",
              border: "1px solid rgba(240,176,96,0.5)",
              borderRadius: 2,
              color: "#f0b060",
              font: "inherit",
              letterSpacing: "0.14em",
              cursor: "pointer",
            }}
          >
            Ride again
          </button>
        )}
      </div>
    </div>
  )
}

export function Experience() {
  const { quality } = useGpuTier()
  const setReady = useJourneyStore((s) => s.setReady)

  // A phone that goes to another app and comes back has usually had its GL
  // context taken away. Left unhandled that is a permanently black canvas —
  // and it only became reachable at all once phones stopped being routed to
  // the flat tier.
  const [glGeneration, setGlGeneration] = useState(0)
  const [glLost, setGlLost] = useState(false)

  const onCanvasCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.setClearColor(0x05070f, 1)
  }, [])

  const onGlLost = useCallback(() => setGlLost(true), [])
  const onGlRestored = useCallback(() => {
    setGlLost(false)
    setGlGeneration((g) => g + 1)
  }, [])

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

  /**
   * The canvas element is MEMOISED, and that is load-bearing rather than an
   * optimisation.
   *
   * Showing the "context lost" overlay is a state change on this component, and
   * without the memo that recreates the <Scene> element, which re-renders the
   * whole R3F tree — including the composer — WHILE THE GL CONTEXT IS DEAD.
   * @react-three/postprocessing then throws "Converting circular structure to
   * JSON" out of its effect memoisation and React unwinds the entire app to
   * "Application error: a client-side exception has occurred". Verified: with
   * the memo the overlay appears over a live tree; without it, losing the
   * context takes the whole page down, which is far worse than the black canvas
   * this was written to fix.
   *
   * Rebuilding GPU resources is only safe once the context is BACK, which is
   * exactly what the generation key does and when it does it.
   */
  const canvas = useMemo(
    () => (
      <Canvas
        // Bumped when the GL context comes back. Remounting is the cleanest
        // possible recovery: a brand-new renderer has an empty resource map, so
        // every texture, geometry and composer target is rebuilt by
        // construction rather than by hoping three re-uploaded all of them.
        key={glGeneration}
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
        onCreated={onCanvasCreated}
      >
        <Scene
          quality={quality}
          onGlLost={onGlLost}
          onGlRestored={onGlRestored}
        />
      </Canvas>
    ),
    [glGeneration, quality, onCanvasCreated, onGlLost, onGlRestored]
  )

  return (
    <>
      <div className="stage">{canvas}</div>

      {glLost && <ContextLost />}

      {/* The scroll the journey rides on. Nothing is drawn here. */}
      <div className="scroll-track" style={{ height: `${JOURNEY_VH}vh` }} />

      <Chrome />
    </>
  )
}
