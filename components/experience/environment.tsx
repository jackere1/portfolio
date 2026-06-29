"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"

/**
 * The light of the descent. Three keyframes driven by depth:
 *   surface — Mongolian steppe at dawn (bright, natural, warm-cool daylight)
 *   ground  — the threshold, where daylight gives way to the enclosed interior
 *   deep    — the foundation, dark concrete lit only by the cab lamp
 *
 * The dramatic daylight→enclosed shift lands at the ground crossing (p≈0.20,
 * where the seam sits). Everything is mutated per-frame via refs with no React
 * re-render and no allocation inside useFrame.
 */

// Progress at which the camera crosses ground level: (Y_SURFACE - SEAM_Y)/span.
const GROUND_P = 0.2

// Numeric stops: [surface, ground, deep].
const FOG_NEAR = [14, 8, 4]
const FOG_FAR = [120, 50, 16]
const AMB_I = [0.55, 0.2, 0.07]
const KEY_I = [0.9, 0.3, 0.12]
const FILL_I = [0.1, 0.14, 0.14]
const LAMP_I = [0.6, 2.4, 3.4]
const KEY_POS: [number, number, number][] = [
  [12, 6, 8],
  [8, 14, 6],
  [5, 20, 5],
]

const col = (hex: string) => new THREE.Color(hex)
const BG = ["#9bb0cf", "#2a2418", "#0a0a0c"].map(col)
const FOG = ["#d8b48c", "#14100a", "#08080a"].map(col)
const AMB = ["#e8d8c0", "#c8a050", "#c8a050"].map(col)
const KEY = ["#ffd9a0", "#e8b040", "#e8b040"].map(col)
const FILL = ["#9fb8d8", "#4060c0", "#4060c0"].map(col)

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Which two stops bracket p, and the blend within them.
function segment(p: number): [number, number, number] {
  if (p <= GROUND_P) return [0, 1, p / GROUND_P]
  return [1, 2, (p - GROUND_P) / (1 - GROUND_P)]
}

export function Environment() {
  const { scene, camera } = useThree()
  const ambRef = useRef<THREE.AmbientLight>(null)
  const keyRef = useRef<THREE.DirectionalLight>(null)
  const fillRef = useRef<THREE.DirectionalLight>(null)
  const lampRef = useRef<THREE.PointLight>(null)

  // Persistent colors mutated each frame (the background reference is reused).
  const bg = useMemo(() => new THREE.Color("#9bb0cf"), [])

  useFrame(() => {
    const p = useScrollStore.getState().progress
    const [i0, i1, t] = segment(p)

    // Background — assign once, then mutate in place.
    bg.lerpColors(BG[i0], BG[i1], t)
    if (scene.background !== bg) scene.background = bg

    // Fog (mutate scene.fog created by the <fog> element below).
    const fog = scene.fog as THREE.Fog | null
    if (fog) {
      fog.color.lerpColors(FOG[i0], FOG[i1], t)
      fog.near = lerp(FOG_NEAR[i0], FOG_NEAR[i1], t)
      fog.far = lerp(FOG_FAR[i0], FOG_FAR[i1], t)
    }

    if (ambRef.current) {
      ambRef.current.intensity = lerp(AMB_I[i0], AMB_I[i1], t)
      ambRef.current.color.lerpColors(AMB[i0], AMB[i1], t)
    }
    if (keyRef.current) {
      keyRef.current.intensity = lerp(KEY_I[i0], KEY_I[i1], t)
      keyRef.current.color.lerpColors(KEY[i0], KEY[i1], t)
      keyRef.current.position.set(
        lerp(KEY_POS[i0][0], KEY_POS[i1][0], t),
        lerp(KEY_POS[i0][1], KEY_POS[i1][1], t),
        lerp(KEY_POS[i0][2], KEY_POS[i1][2], t)
      )
    }
    if (fillRef.current) {
      fillRef.current.intensity = lerp(FILL_I[i0], FILL_I[i1], t)
      fillRef.current.color.lerpColors(FILL[i0], FILL[i1], t)
    }
    if (lampRef.current) {
      lampRef.current.intensity = lerp(LAMP_I[i0], LAMP_I[i1], t)
      lampRef.current.position.set(
        camera.position.x,
        camera.position.y - 1,
        camera.position.z - 2
      )
    }
  })

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.55} color="#e8d8c0" />
      <directionalLight ref={keyRef} position={[12, 6, 8]} intensity={0.9} color="#ffd9a0" />
      <directionalLight ref={fillRef} position={[-5, -10, 5]} intensity={0.1} color="#9fb8d8" />

      {/* The cab lamp — rides just ahead of the cab; the only light deep down. */}
      <pointLight ref={lampRef} intensity={0.6} distance={16} decay={2} color="#e8a020" />

      <fog attach="fog" args={["#d8b48c", 14, 120]} />
    </>
  )
}
