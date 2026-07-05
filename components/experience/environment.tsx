"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"

/**
 * The light of the descent. Three keyframes driven by depth:
 *   surface — Mongolian steppe under the eternal blue sky (bright clear daylight)
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
// Surface stop = golden hour (see lib/surface-light.ts): a warm low sun BACKLIGHTS
// the meadow, a cool sky fills the shadows, a warm haze eats the distance.
const FOG_NEAR = [28, 8, 4]
const FOG_FAR = [82, 50, 16]
// Surface ambient/hemisphere are LIFTED so the backlit dirt + grass stay readable
// under the bright bloomed sky (they crushed to black on hardware otherwise).
const AMB_I = [0.68, 0.2, 0.07]
const KEY_I = [1.2, 0.3, 0.12]
const FILL_I = [0.28, 0.14, 0.14]
const LAMP_I = [0.6, 2.4, 3.4]
// Sky→ground hemisphere fill. Strong at the surface (the cool sky bounce that
// keeps backlit grass from going black), off underground.
const HEMI_I = [0.85, 0.12, 0]
// (No image-based environment any more — the surface is lit by these lights.)
const ENV_I = [0, 0, 0]
// scene.backgroundIntensity — the color background is hidden behind the sky dome
// at the surface; this only matters underground where it darkens to the deep.
const BG_I = [1, 0.3, 0]
// KEY_POS[0] is the low golden sun, in −z (down the shaft) so it backlights the
// meadow. Must match SUN_DIR in lib/surface-light.ts — same sun, same sky.
const KEY_POS: [number, number, number][] = [
  [3.2, 4.0, -19.3],
  [8, 14, 6],
  [5, 20, 5],
]

const col = (hex: string) => new THREE.Color(hex)
// FOG[0] is the surface air — it MUST match HAZE in lib/surface-light.ts so the
// mountains and grass at the fog limit melt into the same warm haze.
const BG = ["#e7bd8e", "#2a2418", "#0a0a0c"].map(col)
const FOG = ["#e7bd8e", "#14100a", "#08080a"].map(col)
const AMB = ["#f0d2a0", "#c8a050", "#c8a050"].map(col)
const KEY = ["#ffbf76", "#e8b040", "#e8b040"].map(col)
const FILL = ["#8a9ac8", "#4060c0", "#4060c0"].map(col)

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
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const lampRef = useRef<THREE.PointLight>(null)

  // Persistent colors mutated each frame (the background reference is reused).
  const bg = useMemo(() => new THREE.Color("#9bb0cf"), [])

  useFrame(() => {
    const p = useScrollStore.getState().progress
    const [i0, i1, t] = segment(p)

    // The sky dome covers the view at the surface; scene.background only shows
    // underground, where it darkens to the deep. We always drive it now.
    bg.lerpColors(BG[i0], BG[i1], t)
    if (scene.background !== bg) scene.background = bg
    ;(scene as THREE.Scene & { backgroundIntensity: number }).backgroundIntensity =
      lerp(BG_I[i0], BG_I[i1], t)

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
    if (hemiRef.current) {
      hemiRef.current.intensity = lerp(HEMI_I[i0], HEMI_I[i1], t)
    }
    // Fade the HDRI image-based lighting with depth (r163+ scalar).
    ;(scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity =
      lerp(ENV_I[i0], ENV_I[i1], t)
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
      {/* Cool twilight sky / warm ground fill for the surface — off underground.
          The cool sky bounce is what keeps the backlit grass from going black. */}
      <hemisphereLight ref={hemiRef} args={["#7a86b0", "#4a4130", 0.5]} />

      {/* The cab lamp — rides just ahead of the cab; the only light deep down. */}
      <pointLight ref={lampRef} intensity={0.6} distance={16} decay={2} color="#e8a020" />

      <fog attach="fog" args={["#d8b48c", 14, 120]} />
    </>
  )
}
