"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useGpuTier } from "@/hooks/use-gpu-tier"
import { makeRng, seededRange, clamp } from "@/lib/prng"
import { PbrMaterial } from "@/lib/textures"
import { GrassField } from "@/components/world/grass"
import type { FloorProps } from "@/lib/floors"

const TAU = Math.PI * 2

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

// ── The land ────────────────────────────────────────────────────────────────
// A single seeded height field the whole surface stands on: ground plane, grass,
// stones and trail all sample it, so nothing floats or sinks. Nearly flat under
// the camera and down the central corridor; swelling only far out toward the
// hills. A corridor mask keeps the near ground level.
interface TerrainWave {
  ax: number
  az: number
  ph: number
  w: number
}
interface Terrain {
  waves: TerrainWave[]
}

function makeTerrain(): Terrain {
  const rng = makeRng("floor-surface-terrain")
  const raw = [
    { ax: seededRange(rng, 0.06, 0.11), az: seededRange(rng, 0.05, 0.1), ph: seededRange(rng, 0, TAU), w: 1.0 },
    { ax: seededRange(rng, 0.14, 0.22), az: seededRange(rng, 0.12, 0.2), ph: seededRange(rng, 0, TAU), w: 0.55 },
    { ax: seededRange(rng, 0.3, 0.42), az: seededRange(rng, 0.26, 0.4), ph: seededRange(rng, 0, TAU), w: 0.28 },
  ]
  const sum = raw.reduce((s, r) => s + r.w, 0)
  return { waves: raw.map((r) => ({ ...r, w: r.w / sum })) }
}

function terrainHeight(t: Terrain, x: number, z: number): number {
  // Only the far field, up by the hills, swells; everything from the camera to
  // the mid-ground stays nearly level so no slope turns its back on the low sun
  // and shadows into a dark bowl.
  const distFactor = smoothstep(-18, -36, z)
  const amp = 0.1 + (0.42 - 0.1) * distFactor
  // 0 down the central corridor (the path to the gate), 1 out in the field —
  // a wide, soft transition so the corridor never creases against the field.
  const corridor = smoothstep(1.2, 4.6, Math.abs(x))
  let h = 0
  for (const wv of t.waves) h += Math.sin(x * wv.ax + z * wv.az + wv.ph) * wv.w
  return amp * corridor * h
}

// Seeded ground-cover mottling: dawn steppe is patchy dry-gold and green, never
// one flat tone. 0 → green, 1 → dry gold.
interface Patch {
  k: number
  p1: number
  p2: number
}
function dryness(p: Patch, x: number, z: number): number {
  return clamp(
    0.5 +
      0.35 * Math.sin(x * p.k + z * p.k * 0.8 + p.p1) +
      0.15 * Math.sin(x * 0.07 - z * 0.09 + p.p2),
    0,
    1
  )
}

interface Hill {
  x: number
  z: number
  r: number
}

interface Mountain {
  x: number
  z: number
  r: number
  h: number
}

interface ShadowPatch {
  x: number
  z: number
  w: number
  d: number
  amp: number
  period: number
  phase: number
  opacity: number
}

interface Cloud {
  x: number
  y: number
  z: number
  w: number
  h: number
  amp: number
  period: number
  phase: number
  opacity: number
}

interface Stone {
  x: number
  z: number
  gy: number
  s: number
  rot: number
}

interface Bird {
  cx: number
  cz: number
  rx: number
  rz: number
  y: number
  speed: number
  phase: number
  bob: number
}

interface Horse {
  x: number
  z: number
  gy: number
  dir: number // +1 faces +x, -1 faces -x
  scale: number
  tone: string
  driftAmp: number
  driftFreq: number
  driftPhase: number
  bobPhase: number
}

// The Mongolian horse coats — dun, bay, brown, black, grey. Read as quiet
// silhouettes at this distance, but the tone keeps the herd from looking cloned.
const HORSE_COATS = ["#4a3826", "#3a2c1e", "#5a4632", "#2a221c", "#6a5c4a"]

// A grazing horse in side profile, standing on y=0, facing +x, head lowered to
// the grass. A handful of boxes — at mid-field distance that is all it needs.
// Self-animating: a slow graze drift across the field, a faint bob, the head
// nodding at the grass, and the tail swishing. A soft contact shadow grounds it.
const HORSE_LEGS: [number, number][] = [
  [0.32, 0.1],
  [0.32, -0.1],
  [-0.32, 0.1],
  [-0.32, -0.1],
]

function GrazingHorse({
  m,
  reduced,
  shadowTex,
}: {
  m: Horse
  reduced: boolean
  shadowTex: THREE.Texture | null
}) {
  const groupRef = useRef<THREE.Group>(null)
  const neckRef = useRef<THREE.Group>(null)
  const tailRef = useRef<THREE.Mesh>(null)
  const mat = { color: m.tone, roughness: 0.85, metalness: 0 } as const

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    const t = state.clock.elapsedTime
    const drift = reduced ? 0 : Math.sin(t * m.driftFreq + m.driftPhase) * m.driftAmp
    const bob = reduced ? 0 : Math.sin(t * 0.6 + m.bobPhase) * 0.015
    g.position.set(m.x + drift, m.gy + bob, m.z)
    if (reduced) return
    // The head nods at the grass; the tail swishes on its own clock.
    if (neckRef.current) neckRef.current.rotation.z = -0.75 + Math.sin(t * 0.7 + m.bobPhase) * 0.16
    if (tailRef.current) tailRef.current.rotation.z = 0.5 + Math.sin(t * 1.9 + m.bobPhase) * 0.22
  })

  return (
    <group
      ref={groupRef}
      position={[m.x, m.gy, m.z]}
      rotation={[0, m.dir < 0 ? Math.PI : 0, 0]}
      scale={m.scale}
    >
      {shadowTex && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 0.95]} />
          <meshBasicMaterial map={shadowTex} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.0, 0.34, 0.3]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* Neck + head, pivoting at the shoulder so they nod together. */}
      <group ref={neckRef} position={[0.42, 0.74, 0]} rotation={[0, 0, -0.75]}>
        <mesh position={[0.05, -0.2, 0]}>
          <boxGeometry args={[0.16, 0.46, 0.22]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[0.22, -0.42, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.3, 0.15, 0.16]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      </group>
      {HORSE_LEGS.map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.26, lz]}>
          <boxGeometry args={[0.08, 0.52, 0.09]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
      <mesh ref={tailRef} position={[-0.5, 0.52, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.07, 0.32, 0.07]} />
        <meshStandardMaterial {...mat} />
      </mesh>
    </group>
  )
}

/**
 * Surface — the appearance. The Mongolian steppe just after sunrise: open
 * undulating grassland under a low dawn sun, hills melting into haze, a worn
 * trail crossing the field and a far flock rounding the sky. This is the outer
 * self — bright, drifting, built to be seen — composed and calm, indifferent to
 * being watched: the wind crosses whether or not anyone is there (seeded,
 * clamped); the pointer only parts the grass near it. Below it, the world locks.
 */
export function FloorSurface({ yTop, yBottom }: FloorProps) {
  const reduced = useReducedMotion()
  const { quality } = useGpuTier()
  const cloudsRef = useRef<THREE.Group>(null)
  const bankRef = useRef<THREE.Group>(null)
  const birdsRef = useRef<THREE.InstancedMesh>(null)
  const shadowRef = useRef<THREE.Group>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const groundY = yBottom

  const full = quality.geometryDetail === "full"
  const reducedTier = quality.geometryDetail === "reduced"
  // "rich" = a real GPU (full OR integrated/reduced). On a real GPU the grass is
  // near-free (hardware instancing). The "minimal" tier is where SOFTWARE
  // rasterizers land (SwiftShader / llvmpipe) — there every pixel is drawn on the
  // CPU, so grass overdraw is the enemy. rich-only elements are the transparent,
  // overdraw-heavy ones (clouds, cloud shadows); everything else scales down but
  // stays, so the software path still gets a real steppe, just lighter.
  const rich = full || reducedTier

  // Dense GPU grass — vertex-shader wind, so the count is a fill-rate choice, not
  // a CPU-animation one. Real GPUs get a lush field; software gets a light one.
  const bladeCount = full ? 34000 : reducedTier ? 13000 : 2400
  const grassHeightScale = rich ? 1 : 0.55
  const stoneCount = full ? 8 : reducedTier ? 5 : 3
  const herdCount = full ? 7 : reducedTier ? 5 : 3

  // The land and its cover — one shared height field, one shared mottling.
  const terrain = useMemo(() => makeTerrain(), [])
  const patch = useMemo<Patch>(() => {
    const rng = makeRng("floor-surface-patch")
    return {
      k: seededRange(rng, 0.12, 0.2),
      p1: seededRange(rng, 0, TAU),
      p2: seededRange(rng, 0, TAU),
    }
  }, [])

  // The undulating ground — a segmented plane displaced by the height field, so
  // the grassland reads as land, not a table. Segment count scales with tier.
  const groundGeo = useMemo(() => {
    const segX = full ? 84 : 48
    const segZ = Math.round((segX * 66) / 70)
    const g = new THREE.PlaneGeometry(70, 66, segX, segZ)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i)
      const ly = pos.getY(i)
      // Plane is laid flat at [0, groundY, -22]; local (lx,ly) → world (lx, *, -ly-22).
      pos.setZ(i, terrainHeight(terrain, lx, -ly - 22))
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [terrain, full])

  // Ground height and grass tone as closures the GPU grass samples once when it
  // places its blades — so the field sits on the terrain and mottles like the
  // ground beneath it.
  const heightAt = useMemo(
    () => (x: number, z: number) => groundY + terrainHeight(terrain, x, z),
    [groundY, terrain]
  )
  const grassTone = useMemo(() => {
    const green = new THREE.Color("#44592a")
    const gold = new THREE.Color("#7a6a36")
    const out = new THREE.Color()
    return (x: number, z: number) => out.copy(green).lerp(gold, dryness(patch, x, z))
  }, [patch])
  // Smaller field on the software tier — less ground to cover in blades = less
  // overdraw for the CPU rasterizer.
  const grassBounds = useMemo(
    () => ({ xMin: -10, xMax: 10, zMin: rich ? -16 : -9, zMax: 4.5 }),
    [rich]
  )
  // Grass lighting, matched to the blue-sky day (see environment.tsx surface stop).
  const grassSun = useMemo(() => new THREE.Color("#b7a878"), [])
  const grassAmbient = useMemo(() => new THREE.Color("#54687e"), [])
  const grassTip = useMemo(() => new THREE.Color("#c9b46a"), [])

  // Scattered stones along the path edges — small, dark, planted on the terrain.
  const stones = useMemo<Stone[]>(() => {
    const rng = makeRng("floor-surface-stones")
    return Array.from({ length: stoneCount }, () => {
      // Cluster just off the corridor, in the near field.
      const side = rng() < 0.5 ? -1 : 1
      const x = side * seededRange(rng, 1.6, 3.8)
      const z = seededRange(rng, 0, 4)
      return {
        x,
        z,
        gy: groundY + terrainHeight(terrain, x, z),
        s: seededRange(rng, 0.07, 0.15),
        rot: seededRange(rng, 0, TAU),
      }
    })
  }, [stoneCount, groundY, terrain])

  // A small herd grazing the mid-field — kept right of centre and back from the
  // camera so it never crowds the level's text, facing mostly one way like a
  // real herd into the wind. It moves whether or not anyone is watching.
  const herd = useMemo<Horse[]>(() => {
    const rng = makeRng("floor-surface-herd")
    return Array.from({ length: herdCount }, () => {
      const x = seededRange(rng, -2, 6)
      const z = seededRange(rng, -13, -6)
      return {
        x,
        z,
        gy: groundY + terrainHeight(terrain, x, z),
        dir: rng() < 0.78 ? 1 : -1,
        scale: seededRange(rng, 0.8, 1.1),
        tone: HORSE_COATS[Math.floor(rng() * HORSE_COATS.length)],
        driftAmp: seededRange(rng, 0.25, 0.55),
        driftFreq: seededRange(rng, 0.04, 0.09),
        driftPhase: seededRange(rng, 0, TAU),
        bobPhase: seededRange(rng, 0, TAU),
      }
    })
  }, [herdCount, groundY, terrain])

  const hills = useMemo<Hill[]>(() => {
    const rng = makeRng("floor-surface-hills")
    // Pushed to the true horizon and kept modest so no near edge sprawls into
    // the field as a dark patch — distant ridges, not blobs on the grass.
    return Array.from({ length: 6 }, (_, i) => ({
      x: seededRange(rng, -26, 26),
      z: -34 - i * 6 - seededRange(rng, 0, 8),
      r: seededRange(rng, 8, 13),
    }))
  }, [])

  // Snow-capped mountains far beyond the hills — a whole range strung across the
  // horizon, ice on the peaks. Small and far so they read as distant grandeur,
  // not a pyramid in the field; hazed by distance fog into the blue.
  const mountains = useMemo<Mountain[]>(() => {
    const rng = makeRng("floor-surface-mountains")
    const n = full ? 8 : 5
    // Spread evenly across the horizon (with jitter) so they read as a whole
    // range, not a single central peak; depth varies so some sit farther and
    // hazier than others.
    return Array.from({ length: n }, (_, i) => ({
      x: -58 + (i / (n - 1)) * 116 + seededRange(rng, -7, 7),
      z: -60 - seededRange(rng, 0, 18),
      r: seededRange(rng, 11, 15),
      h: seededRange(rng, 10, 14),
    }))
  }, [full])

  // One unit cone, vertex-coloured rock→snow up its height, reused (scaled) for
  // every peak. A single mesh per mountain — no coincident cap cone to z-fight,
  // just a clean snow line that catches the daylight.
  const mountainGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 7, 4)
    g.translate(0, 0.5, 0)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const rock = new THREE.Color("#66727f")
    const snow = new THREE.Color("#e9f1f8")
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      c.copy(rock).lerp(snow, smoothstep(0.52, 0.74, pos.getY(i)))
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    return g
  }, [])

  // Cloud shadows — soft dark patches drifting across the sward, the one thing
  // that makes the wind visible on the ground. Slow, clamped, cheap.
  const cloudShadows = useMemo<ShadowPatch[]>(() => {
    if (!rich) return []
    const rng = makeRng("floor-surface-cloudshadows")
    return Array.from({ length: full ? 4 : 3 }, () => ({
      x: seededRange(rng, -8, 8),
      z: seededRange(rng, -14, -1),
      w: seededRange(rng, 7, 13),
      d: seededRange(rng, 5, 9),
      amp: seededRange(rng, 4, 8),
      period: seededRange(rng, 34, 64),
      phase: seededRange(rng, 0, TAU),
      opacity: seededRange(rng, 0.1, 0.18),
    }))
  }, [full, rich])

  // Drifting clouds — on any real GPU; skipped only on the weakest tier.
  const clouds = useMemo<Cloud[]>(() => {
    if (!rich) return []
    const rng = makeRng("floor-surface-clouds")
    return Array.from({ length: full ? 4 : 3 }, () => ({
      x: seededRange(rng, -12, 12),
      y: groundY + seededRange(rng, 4.0, 5.4),
      z: seededRange(rng, -34, -26),
      w: seededRange(rng, 9, 15),
      h: seededRange(rng, 2.2, 3.4),
      amp: seededRange(rng, 0.9, 1.5),
      period: seededRange(rng, 150, 320),
      phase: seededRange(rng, 0, TAU),
      opacity: seededRange(rng, 0.06, 0.1),
    }))
  }, [full, groundY])

  // A low cloud bank sitting on the horizon behind the hills — wider, fainter,
  // heavier than the drifting high clouds. Full tier only.
  const bank = useMemo<Cloud[]>(() => {
    if (!rich) return []
    const rng = makeRng("floor-surface-bank")
    return Array.from({ length: full ? 5 : 4 }, (_, i) => ({
      x: -18 + i * 9 + seededRange(rng, -3, 3),
      y: groundY + seededRange(rng, 1.6, 2.8),
      z: seededRange(rng, -44, -36),
      w: seededRange(rng, 14, 20),
      h: seededRange(rng, 3.0, 4.4),
      amp: seededRange(rng, 0.5, 1.0),
      period: seededRange(rng, 260, 460),
      phase: seededRange(rng, 0, TAU),
      opacity: seededRange(rng, 0.08, 0.14),
    }))
  }, [full, groundY])

  // A far flock, indifferent to the visitor: a closed loop high over the hills.
  const birds = useMemo<Bird[]>(() => {
    const rng = makeRng("floor-surface-birds")
    const n = full ? 6 : 5
    return Array.from({ length: n }, () => ({
      cx: seededRange(rng, -4, 4),
      cz: seededRange(rng, -30, -24),
      rx: seededRange(rng, 10, 15),
      rz: seededRange(rng, 3.5, 6),
      y: groundY + seededRange(rng, 8, 11),
      speed: seededRange(rng, 0.05, 0.09),
      phase: seededRange(rng, 0, TAU),
      bob: seededRange(rng, 0.2, 0.5),
    }))
  }, [full, groundY])

  // A soft elliptical falloff so the cloud planes have no visible edges.
  const cloudTex = useMemo(() => {
    if (typeof document === "undefined") return null
    const c = document.createElement("canvas")
    c.width = 128
    c.height = 64
    const ctx = c.getContext("2d")
    if (!ctx) return null
    ctx.scale(1, 0.5)
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 60)
    g.addColorStop(0, "rgba(232, 238, 244, 0.6)")
    g.addColorStop(0.6, "rgba(214, 224, 234, 0.24)")
    g.addColorStop(1, "rgba(214, 224, 234, 0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])

  // The worn path — a soft-edged dirt strip fading in from the foreground and
  // dissolving into the field. Alpha in the texture; dirt tone in the material.
  const pathTex = useMemo(() => {
    if (typeof document === "undefined") return null
    const c = document.createElement("canvas")
    c.width = 64
    c.height = 128
    const ctx = c.getContext("2d")
    if (!ctx) return null
    // Soft left/right edges (walked centre, feathered sides)…
    const gx = ctx.createLinearGradient(0, 0, 64, 0)
    gx.addColorStop(0, "rgba(0,0,0,0)")
    gx.addColorStop(0.5, "rgba(0,0,0,0.5)")
    gx.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = gx
    ctx.fillRect(0, 0, 64, 128)
    // …and a fade at the far (top) end so the path emerges from the grass.
    const gy = ctx.createLinearGradient(0, 0, 0, 128)
    gy.addColorStop(0, "rgba(0,0,0,0.35)")
    gy.addColorStop(0.35, "rgba(0,0,0,1)")
    gy.addColorStop(1, "rgba(0,0,0,1)")
    ctx.globalCompositeOperation = "destination-in"
    ctx.fillStyle = gy
    ctx.fillRect(0, 0, 64, 128)
    return new THREE.CanvasTexture(c)
  }, [])

  // A chevron bird stamp — a small dark V, seen at distance as a wingbeat.
  const birdTex = useMemo(() => {
    if (typeof document === "undefined") return null
    const c = document.createElement("canvas")
    c.width = 32
    c.height = 32
    const ctx = c.getContext("2d")
    if (!ctx) return null
    ctx.strokeStyle = "#2a2018"
    ctx.lineWidth = 4
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(5, 20)
    ctx.lineTo(16, 12)
    ctx.lineTo(27, 20)
    ctx.stroke()
    return new THREE.CanvasTexture(c)
  }, [])

  // A soft dark blob — reused for the drifting cloud shadows and the contact
  // shadow grounding each horse. Radial, feathered to nothing at the edge.
  const softDarkTex = useMemo(() => {
    if (typeof document === "undefined") return null
    const c = document.createElement("canvas")
    c.width = 64
    c.height = 64
    const ctx = c.getContext("2d")
    if (!ctx) return null
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31)
    g.addColorStop(0, "rgba(0,0,0,0.85)")
    g.addColorStop(0.55, "rgba(0,0,0,0.4)")
    g.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])

  // A soft round light sprite for the pollen motes drifting in the sun.
  const moteTex = useMemo(() => {
    if (typeof document === "undefined") return null
    const c = document.createElement("canvas")
    c.width = 32
    c.height = 32
    const ctx = c.getContext("2d")
    if (!ctx) return null
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, "rgba(255,246,222,1)")
    g.addColorStop(0.4, "rgba(255,232,180,0.5)")
    g.addColorStop(1, "rgba(255,232,180,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 32)
    return new THREE.CanvasTexture(c)
  }, [])

  // Pollen / dust catching the sun — a slow drift of warm motes in the air over
  // the sward. Magical, and cheap on a real GPU (rich tier only — additive
  // sprites are overdraw a software rasterizer shouldn't pay for).
  const motes = useMemo(() => {
    if (!rich) return null
    const rng = makeRng("floor-surface-motes")
    const n = full ? 190 : 120
    const base = new Float32Array(n * 3)
    const drift: { ax: number; ay: number; az: number; px: number; py: number; pz: number; sp: number }[] = []
    for (let i = 0; i < n; i++) {
      base[i * 3] = seededRange(rng, -9, 9)
      base[i * 3 + 1] = groundY + seededRange(rng, 0.4, 4.4)
      base[i * 3 + 2] = seededRange(rng, -11, 4.2)
      drift.push({
        ax: seededRange(rng, 0.15, 0.5),
        ay: seededRange(rng, 0.1, 0.35),
        az: seededRange(rng, 0.15, 0.5),
        px: seededRange(rng, 0, TAU),
        py: seededRange(rng, 0, TAU),
        pz: seededRange(rng, 0, TAU),
        sp: seededRange(rng, 0.12, 0.3),
      })
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3))
    return { geo, base, drift, n }
  }, [rich, full, groundY])

  // Plant the stones once.
  const stonesRef = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    if (!stonesRef.current) return
    for (let i = 0; i < stones.length; i++) {
      const s = stones[i]
      dummy.position.set(s.x, s.gy + s.s * 0.3, s.z)
      dummy.rotation.set(s.rot * 0.3, s.rot, s.rot * 0.2)
      dummy.scale.set(s.s, s.s * 0.7, s.s)
      dummy.updateMatrix()
      stonesRef.current.setMatrixAt(i, dummy.matrix)
    }
    stonesRef.current.instanceMatrix.needsUpdate = true
  }, [stones, dummy])

  // Initial bird placement, so under reduced motion the flock hangs at rest.
  useEffect(() => {
    if (!birdsRef.current) return
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i]
      dummy.position.set(b.cx + b.rx * Math.cos(b.phase), b.y, b.cz + b.rz * Math.sin(b.phase))
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(0.5)
      dummy.updateMatrix()
      birdsRef.current.setMatrixAt(i, dummy.matrix)
    }
    birdsRef.current.instanceMatrix.needsUpdate = true
  }, [birds, dummy])

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // High clouds drift laterally — clamped by construction, minutes-long periods.
    if (cloudsRef.current && !reduced && clouds.length > 0) {
      const kids = cloudsRef.current.children
      for (let i = 0; i < clouds.length && i < kids.length; i++) {
        const c = clouds[i]
        kids[i].position.x = c.x + Math.sin((t * TAU) / c.period + c.phase) * c.amp
      }
    }

    // The horizon bank drifts slower still.
    if (bankRef.current && !reduced && bank.length > 0) {
      const kids = bankRef.current.children
      for (let i = 0; i < bank.length && i < kids.length; i++) {
        const c = bank[i]
        kids[i].position.x = c.x + Math.sin((t * TAU) / c.period + c.phase) * c.amp
      }
    }

    // The flock rounds its loop — slow, distant, never approaching.
    if (birdsRef.current && !reduced && birds.length > 0) {
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i]
        const a = t * b.speed + b.phase
        dummy.position.set(
          b.cx + b.rx * Math.cos(a),
          b.y + Math.sin(a * 2) * b.bob,
          b.cz + b.rz * Math.sin(a)
        )
        dummy.rotation.set(0, 0, 0)
        dummy.scale.setScalar(0.5)
        dummy.updateMatrix()
        birdsRef.current.setMatrixAt(i, dummy.matrix)
      }
      birdsRef.current.instanceMatrix.needsUpdate = true
    }

    // Cloud shadows crawl across the sward — the wind made visible on the ground.
    if (shadowRef.current && !reduced && cloudShadows.length > 0) {
      const kids = shadowRef.current.children
      for (let i = 0; i < cloudShadows.length && i < kids.length; i++) {
        const s = cloudShadows[i]
        kids[i].position.x = s.x + Math.sin((t * TAU) / s.period + s.phase) * s.amp
      }
    }

    // Pollen motes drift in the air — a gentle 3D wander around each rest point.
    if (motes && !reduced) {
      const arr = motes.geo.attributes.position.array as Float32Array
      for (let i = 0; i < motes.n; i++) {
        const d = motes.drift[i]
        arr[i * 3] = motes.base[i * 3] + Math.sin(t * d.sp + d.px) * d.ax
        arr[i * 3 + 1] = motes.base[i * 3 + 1] + Math.sin(t * d.sp * 0.7 + d.py) * d.ay
        arr[i * 3 + 2] = motes.base[i * 3 + 2] + Math.sin(t * d.sp * 1.3 + d.pz) * d.az
      }
      motes.geo.attributes.position.needsUpdate = true
    }
  })

  return (
    <group>
      {/* The steppe — an undulating ground plane receding to the dawn horizon. */}
      <mesh
        geometry={groundGeo}
        position={[0, groundY, -22]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <PbrMaterial
          name="steppe-grass"
          repeat={[18, 18]}
          tint="#d8c89a"
          flatColor="#5a6a3a"
          flatRoughness={0.95}
        />
      </mesh>

      {/* A worn trail crossing the steppe — dirt fading in from the foreground
          and dissolving into the field as it recedes. It leads nowhere in
          particular; someone has just walked this way. */}
      {pathTex !== null && (
        <mesh position={[0, groundY + 0.02, -1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.9, 11]} />
          <meshStandardMaterial
            map={pathTex}
            color="#4a3d2c"
            roughness={1}
            metalness={0}
            transparent
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      )}

      {/* Cloud shadows crawling over the grass — soft, dark, drifting. */}
      {softDarkTex !== null && cloudShadows.length > 0 && (
        <group ref={shadowRef}>
          {cloudShadows.map((s, i) => (
            <mesh
              key={i}
              position={[s.x, groundY + 0.04, s.z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[s.w, s.d]} />
              <meshBasicMaterial
                map={softDarkTex}
                color="#0a1408"
                transparent
                opacity={s.opacity}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Snow-capped mountains — the range far beyond the hills, ice on the
          peaks. Low-poly and hazed; grandeur without cost. */}
      {mountains.map((m, i) => (
        <mesh
          key={i}
          geometry={mountainGeo}
          position={[m.x, groundY, m.z]}
          scale={[m.r, m.h, m.r]}
        >
          <meshStandardMaterial vertexColors roughness={0.95} metalness={0} flatShading />
        </mesh>
      ))}

      {/* Rolling hills on the horizon — caps of flattened spheres, a hazy
          daylit green-brown so they read as distant ridges under the blue. */}
      {hills.map((h, i) => (
        <mesh key={i} position={[h.x, groundY - h.r * 0.2, h.z]} scale={[1, 0.24, 1]}>
          <sphereGeometry args={[h.r, 20, 12]} />
          <meshStandardMaterial color="#59614a" roughness={1} metalness={0} />
        </mesh>
      ))}

      {/* A low cloud bank on the horizon, behind the hills. */}
      {cloudTex !== null && bank.length > 0 && (
        <group ref={bankRef}>
          {bank.map((c, i) => (
            <mesh key={i} position={[c.x, c.y, c.z]}>
              <planeGeometry args={[c.w, c.h]} />
              <meshBasicMaterial
                map={cloudTex}
                color="#dbe6ef"
                transparent
                opacity={c.opacity}
                depthWrite={false}
              />
            </mesh>
          ))}
          {/* A faint virga veil hanging under one bank cloud. */}
          <mesh position={[bank[1].x, bank[1].y - 2.4, bank[1].z + 0.2]}>
            <planeGeometry args={[bank[1].w * 0.5, 3.6]} />
            <meshBasicMaterial
              map={cloudTex}
              color="#c8d6e2"
              transparent
              opacity={0.06}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Distant dawn clouds — barely there, drifting over the hills. */}
      {cloudTex !== null && clouds.length > 0 && (
        <group ref={cloudsRef}>
          {clouds.map((c, i) => (
            <mesh key={i} position={[c.x, c.y, c.z]}>
              <planeGeometry args={[c.w, c.h]} />
              <meshBasicMaterial
                map={cloudTex}
                color="#e6eef4"
                transparent
                opacity={c.opacity}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* A far flock, high over the hills — indifferent to being watched. */}
      {birdTex !== null && birds.length > 0 && (
        <instancedMesh
          ref={birdsRef}
          args={[undefined, undefined, birds.length]}
          frustumCulled={false}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={birdTex} transparent depthWrite={false} opacity={0.7} />
        </instancedMesh>
      )}

      {/* Stones scattered along the path edges. */}
      {stoneCount > 0 && (
        <instancedMesh ref={stonesRef} args={[undefined, undefined, stoneCount]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6a5f52" roughness={0.85} metalness={0} />
        </instancedMesh>
      )}

      {/* The herd — horses grazing the mid-field, indifferent to the visitor. */}
      {herd.map((m, i) => (
        <GrazingHorse key={i} m={m} reduced={reduced} shadowTex={softDarkTex} />
      ))}

      {/* Pollen catching the sun — warm motes drifting over the sward. */}
      {motes && moteTex && (
        <points geometry={motes.geo}>
          <pointsMaterial
            size={0.08}
            map={moteTex}
            color="#ffe6b0"
            transparent
            opacity={0.6}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      )}

      {/* The sward — a dense GPU grass field, wind in the vertex shader. */}
      {bladeCount > 0 && (
        <GrassField
          seed="floor-surface"
          count={bladeCount}
          bounds={grassBounds}
          heightAt={heightAt}
          tone={grassTone}
          band={[yBottom, yTop]}
          heightScale={grassHeightScale}
          sunColor={grassSun}
          ambient={grassAmbient}
          tipWarm={grassTip}
          reduced={reduced}
        />
      )}
    </group>
  )
}
