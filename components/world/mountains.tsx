"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { makeRng, seededRange } from "@/lib/prng"

// Layered mountain silhouettes — the aerial-perspective backdrop, built for COLOUR.
// A real dusk range is never one flat tone: blue-purple in the shadowed valleys,
// warm where the low sun rakes a slope, a wash of green on the lower forested
// flanks, and — with distance — a cool blue-lavender haze (NOT a white wash). Each
// ridge mixes those with seeded per-location noise so no two stretches match, and
// recedes further into the cool haze the deeper it is. Unlit + baked vertex colour
// → identical and near-free on every GPU, one draw call per ridge, zero download.

const MT_SHADOW = new THREE.Color("#2c2946") // cool blue-purple valley shadow
const MT_SUN = new THREE.Color("#8a5a40") // warm slope raked by the low sun
const MT_FOREST = new THREE.Color("#37482e") // muted green lower flanks
const MT_DIST = new THREE.Color("#93a2c4") // cool blue-lavender distance haze
const MT_CREST = new THREE.Color("#ffce93") // warm crest rim near the sun

interface Layer {
  z: number
  baseTop: number
  amp: number
  haze: number
  rimStrength: number
  seed: string
  width: number
}

// Near → far: farther ridges sit higher (seen over the nearer ones), hazier (cool),
// with a fainter rim.
const LAYERS: Layer[] = [
  { z: -64, baseTop: 18.6, amp: 2.6, haze: 0.2, rimStrength: 0.9, seed: "ridge-a", width: 150 },
  { z: -80, baseTop: 20.0, amp: 3.0, haze: 0.36, rimStrength: 0.62, seed: "ridge-b", width: 180 },
  { z: -96, baseTop: 21.4, amp: 3.3, haze: 0.52, rimStrength: 0.42, seed: "ridge-c", width: 210 },
  { z: -112, baseTop: 22.8, amp: 3.5, haze: 0.66, rimStrength: 0.28, seed: "ridge-d", width: 240 },
]

const SUN_AZIMUTH_X = 6 // world-x where crests catch the warm rim
const SKIRT_Y = -24 // extends below the horizon, hidden by ground + grass
// Rows below each crest: enough of them that the vertical shading reads as a
// smooth gradient, not stepped contour bands.
const DROPS = [0, 0.7, 1.6, 2.8, 4.2, 6.0, 8.2, 11.0]

// Cheap seeded 1-D value noise (smooth), 0..1.
function vnoise(x: number, off: number): number {
  const xi = Math.floor(x)
  const xf = x - xi
  const h = (i: number) => {
    const s = Math.sin(i * 12.9898 + off * 78.233) * 43758.5453
    return s - Math.floor(s)
  }
  const a = h(xi)
  const b = h(xi + 1)
  const u = xf * xf * (3 - 2 * xf)
  return a + (b - a) * u
}

function makeRidge(layer: Layer, li: number): THREE.BufferGeometry {
  const segs = 220
  const rng = makeRng(layer.seed)
  const octaves = Array.from({ length: 4 }, (_, k) => ({
    f: seededRange(rng, 0.015, 0.03) * (k + 1) * 1.6,
    p: seededRange(rng, 0, Math.PI * 2),
    a: 1 / (k + 1.4),
  }))
  const ridge = (x: number) => {
    let h = 0
    for (const o of octaves) h += Math.sin(x * o.f + o.p) * o.a
    return h
  }

  const c = new THREE.Color()
  const col = (x: number, hf: number, isCrest: boolean) => {
    const sunFacing = Math.exp(-((x - SUN_AZIMUTH_X) ** 2) / (2 * 34 * 34))
    const n1 = vnoise(x * 0.06, li * 3.7) * 2 - 1
    const n2 = vnoise(x * 0.15 + 5, li * 1.9 + 2) * 2 - 1
    // shadow → warm slope, pushed by the sun and by patchy noise
    c.copy(MT_SHADOW).lerp(MT_SUN, Math.min(1, Math.max(0, sunFacing * 0.7 + n1 * 0.28 + 0.08)))
    // green on the lower flanks
    const green = Math.min(1, Math.max(0, n2 * 0.5 + 0.4)) * (1 - hf) * 0.45
    c.lerp(MT_FOREST, green)
    // valleys darker, crest lighter; a little per-location brightness texture
    c.multiplyScalar((0.72 + 0.4 * hf) * (0.92 + 0.14 * (n1 * 0.5 + 0.5)))
    // aerial perspective — recede into the COOL distance haze (not white)
    c.lerp(MT_DIST, layer.haze)
    // thin warm crest rim near the sun
    if (isCrest) c.lerp(MT_CREST, Math.min(1, sunFacing * layer.rimStrength))
    return c
  }

  const R = DROPS.length + 1 // rows per column (drops + skirt)
  const positions: number[] = []
  const colors: number[] = []
  const W = layer.width
  for (let i = 0; i <= segs; i++) {
    const x = -W / 2 + (i / segs) * W
    const topY = layer.baseTop + ridge(x) * layer.amp
    for (let r = 0; r < DROPS.length; r++) {
      const d = DROPS[r]
      const y = topY - d
      const hf = Math.min(1, Math.max(0, 1 - d / 12))
      const cc = col(x, hf, r === 0)
      positions.push(x, y, 0)
      colors.push(cc.r, cc.g, cc.b)
    }
    const cc = col(x, 0, false) // skirt — darkest body
    positions.push(x, SKIRT_Y, 0)
    colors.push(cc.r, cc.g, cc.b)
  }

  const indices: number[] = []
  for (let i = 0; i < segs; i++) {
    for (let r = 0; r < R - 1; r++) {
      const a = i * R + r
      const b = i * R + r + 1
      const cIdx = (i + 1) * R + r
      const dIdx = (i + 1) * R + r + 1
      indices.push(a, b, cIdx, cIdx, b, dIdx)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  return g
}

export function Mountains() {
  const layers = useMemo(() => LAYERS.map((l, i) => ({ l, geo: makeRidge(l, i) })), [])
  return (
    <group>
      {layers.map(({ l, geo }) => (
        <mesh key={l.seed} geometry={geo} position={[0, 0, l.z]} renderOrder={-1}>
          <meshBasicMaterial vertexColors fog={false} />
        </mesh>
      ))}
    </group>
  )
}
