"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useGpuTier } from "@/hooks/use-gpu-tier"
import { makeRng, seededRange, clamp } from "@/lib/prng"
import { GrassField } from "@/components/world/grass"
import { Mountains } from "@/components/world/mountains"
import { MountainsPhoto } from "@/components/world/mountains-photo"
import { Sun } from "@/components/world/sun"
import { Motes } from "@/components/world/motes"
import { AssetBoundary } from "@/components/experience/asset-boundary"
import { PbrMaterial } from "@/lib/textures"
import { type FloorProps } from "@/lib/floors"
import {
  SUN_DIR,
  SUN_COLOR,
  SKY_FILL,
  GRASS_BASE,
  GRASS_DRY,
  GRASS_RIM,
  GROUND_GREEN,
  GROUND_WARM,
  HAZE,
  SURFACE_FOG_NEAR,
  SURFACE_FOG_FAR,
} from "@/lib/surface-light"

const TAU = Math.PI * 2

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

// ── The rolling land ─────────────────────────────────────────────────────────
// One seeded height field the ground and grass both sample, so nothing floats.
// Gently rolling meadow — swelling more toward the hills, near-level underfoot.
interface TerrainWave {
  ax: number
  az: number
  ph: number
  w: number
}

function makeTerrain(): TerrainWave[] {
  const rng = makeRng("surface-terrain")
  const raw = [
    { ax: seededRange(rng, 0.05, 0.09), az: seededRange(rng, 0.04, 0.08), ph: seededRange(rng, 0, TAU), w: 1.0 },
    { ax: seededRange(rng, 0.12, 0.19), az: seededRange(rng, 0.1, 0.17), ph: seededRange(rng, 0, TAU), w: 0.5 },
    { ax: seededRange(rng, 0.26, 0.38), az: seededRange(rng, 0.22, 0.34), ph: seededRange(rng, 0, TAU), w: 0.26 },
  ]
  const sum = raw.reduce((s, r) => s + r.w, 0)
  return raw.map((r) => ({ ...r, w: r.w / sum }))
}

function terrainHeight(waves: TerrainWave[], x: number, z: number): number {
  // Gently rolling meadow — the mountains own the distance now, so the ground
  // stays a soft swell rather than building competing hills.
  const distFactor = smoothstep(-12, -34, z)
  const amp = 0.3 + (0.75 - 0.3) * distFactor
  let h = 0
  for (const wv of waves) h += Math.sin(x * wv.ax + z * wv.az + wv.ph) * wv.w
  return amp * h
}

// Seeded green/gold mottling — a meadow is never one flat tone.
interface Patch {
  k: number
  p1: number
  p2: number
}
function dryness(p: Patch, x: number, z: number): number {
  return clamp(
    0.34 +
      0.3 * Math.sin(x * p.k + z * p.k * 0.8 + p.p1) +
      0.14 * Math.sin(x * 0.06 - z * 0.08 + p.p2),
    0,
    1
  )
}

/**
 * Surface — the appearance. A golden-hour mountain meadow: lush green grass
 * backlit by a low sun so it glows, rolling into a warm haze. Built to be seen,
 * nearly wordless. The wind crosses whether or not anyone is watching (seeded,
 * clamped); the pointer only parts the grass near it.
 */
export function FloorSurface({ yTop, yBottom }: FloorProps) {
  const reduced = useReducedMotion()
  const { quality } = useGpuTier()

  const groundY = yBottom

  const full = quality.geometryDetail === "full"
  const reducedTier = quality.geometryDetail === "reduced"
  // A FEW TALL tufts scattered on the dirt — not a dense carpet. Sparse and tall
  // reads as dry steppe and lets the ground show through.
  const bladeCount = full ? 1100 : reducedTier ? 700 : 350
  const grassHeightScale = full ? 1.9 : reducedTier ? 1.7 : 1.4

  const terrain = useMemo(() => makeTerrain(), [])
  const patch = useMemo<Patch>(() => {
    const rng = makeRng("surface-patch")
    return {
      k: seededRange(rng, 0.1, 0.18),
      p1: seededRange(rng, 0, TAU),
      p2: seededRange(rng, 0, TAU),
    }
  }, [])

  // The rolling ground — a displaced plane sampling the height field.
  const groundGeo = useMemo(() => {
    const segX = full ? 96 : 56
    const segZ = Math.round((segX * 70) / 78)
    const g = new THREE.PlaneGeometry(78, 70, segX, segZ)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i)
      const ly = pos.getY(i)
      // Plane laid flat at [0, groundY, -24]; local (lx,ly) → world (lx,*,-ly-24).
      pos.setZ(i, terrainHeight(terrain, lx, -ly - 24))
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [terrain, full])

  const heightAt = useMemo(
    () => (x: number, z: number) => groundY + terrainHeight(terrain, x, z),
    [groundY, terrain]
  )

  // Grass tone: mostly lush green, seeded dry-gold patches.
  const grassTone = useMemo(() => {
    const green = new THREE.Color(GRASS_BASE)
    const gold = new THREE.Color(GRASS_DRY)
    const out = new THREE.Color()
    return (x: number, z: number) => out.copy(green).lerp(gold, dryness(patch, x, z))
  }, [patch])

  // Tufts scattered across the near/mid dirt — sparse, so the ground shows.
  const grassBounds = useMemo(
    () => ({ xMin: -16, xMax: 16, zMin: full ? -22 : -16, zMax: 8 }),
    [full]
  )

  // Lighting uniforms (shared golden-hour palette).
  const grassSun = useMemo(() => new THREE.Color(SUN_COLOR), [])
  // A warm muted-olive fill, LIFTED so the tall tufts stay readable against the
  // bright bloomed sky on hardware (they crushed to black otherwise).
  const grassAmbient = useMemo(() => new THREE.Color("#a49a6e"), [])
  void SKY_FILL
  const grassRim = useMemo(() => new THREE.Color(GRASS_RIM), [])
  const grassSunDir = useMemo(() => SUN_DIR.clone(), [])
  const grassFog = useMemo(() => new THREE.Color(HAZE), [])
  // A warm dark olive matching the photo's shadowed foreground (not bright green).
  const groundColor = useMemo(() => new THREE.Color("#3f4826"), [])
  void GROUND_GREEN
  void GROUND_WARM

  return (
    <group>
      {/* The distant mountains — a real misty-ridge photo, sky keyed out so the
          sunset shows through. If the image ever fails to load, the procedural
          layered silhouettes stand in — never a blank horizon. */}
      <AssetBoundary
        label="mountains"
        suspenseFallback={<Mountains />}
        errorFallback={<Mountains />}
      >
        <MountainsPhoto />
      </AssetBoundary>

      {/* The sun — a defined, blooming disc in the sky. */}
      <Sun />

      {/* The dry-dirt ground — a real CC0 soil texture (albedo + normal), lit warm
          by the low sun, fogging into the same haze as the distance. Falls back to
          a flat dirt tone while it loads or if it fails. */}
      <AssetBoundary
        label="ground"
        suspenseFallback={
          <mesh geometry={groundGeo} position={[0, groundY, -24]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color={groundColor} roughness={1} metalness={0} />
          </mesh>
        }
        errorFallback={
          <mesh geometry={groundGeo} position={[0, groundY, -24]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color={groundColor} roughness={1} metalness={0} />
          </mesh>
        }
      >
        <mesh geometry={groundGeo} position={[0, groundY, -24]} rotation={[-Math.PI / 2, 0, 0]}>
          <PbrMaterial
            name="dry-dirt"
            repeat={[15, 14]}
            tint="#c7a880"
            flatColor="#5b4a30"
            flatRoughness={1}
            normalScale={1.2}
          />
        </mesh>
      </AssetBoundary>

      {/* The sward — dense GPU grass, wind + backlit glow in the shader. */}
      {bladeCount > 0 && (
        <GrassField
          seed="surface"
          count={bladeCount}
          bounds={grassBounds}
          heightAt={heightAt}
          tone={grassTone}
          band={[yBottom, yTop]}
          heightScale={grassHeightScale}
          sunColor={grassSun}
          ambient={grassAmbient}
          rim={grassRim}
          sunDir={grassSunDir}
          fogColor={grassFog}
          fogNear={SURFACE_FOG_NEAR}
          fogFar={SURFACE_FOG_FAR}
          reduced={reduced}
        />
      )}

      {/* Dust catching the low sun — rich tiers only (additive overdraw). */}
      {(full || reducedTier) && (
        <Motes count={full ? 110 : 60} groundY={groundY} reduced={reduced} />
      )}
    </group>
  )
}
