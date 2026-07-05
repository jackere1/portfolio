"use client"

import { floors, SHAFT_HALF } from "@/lib/floors"
import { SEAM_Y, Y_BEDROCK } from "@/lib/world-config"
import { PbrMaterial } from "@/lib/textures"

// The shaft is open to the steppe above ground; the concrete walls begin exactly
// at the seam (ground level) and run to the bedrock — the line where the walls
// appear IS the boundary. Back + sides only; the +z face is the open cab aperture,
// so stages (x,z ∈ [-4,4], facing +z) are never occluded.
//
// The walls are not one pour. Each floor cell reads as its own band, a shade
// denser than the one above — strata in cross-section, the way a core sample
// reads. The banding is a thin dark veil per cell over ONE textured wall (one
// PbrMaterial per side, not one per band — every material instance costs GPU
// resources), with a sediment line at each boundary the cab passes. Bands derive
// from floors[], so the geology always matches the levels.
const TOP = SEAM_Y
const BOTTOM = Y_BEDROCK - 2
const H = TOP - BOTTOM
const MID = (TOP + BOTTOM) / 2
const SPAN = SHAFT_HALF * 2
const REPEAT: [number, number] = [3, Math.round(H / 3.5)]

const flat = { flatColor: "#3a3a3e", flatRoughness: 0.96, metalness: 0 }

interface Band {
  top: number
  bottom: number
  /** How dense this stratum reads — the veil's opacity, deeper = heavier. */
  veil: number
}

const BANDS: Band[] = (() => {
  const cells = floors
    .map((f) => ({
      top: Math.min(f.cellTop, TOP),
      bottom: Math.max(f.cellBottom, BOTTOM),
    }))
    .filter((c) => c.top > c.bottom + 0.05)
  if (cells.length > 0) cells[cells.length - 1].bottom = BOTTOM
  const n = cells.length
  return cells.map((c, i) => ({
    ...c,
    veil: n > 1 ? (i / (n - 1)) * 0.34 : 0,
  }))
})()

// Sediment lines — one at each stratum boundary the walls contain. The seam
// itself is not marked here; the seam beam owns that line.
const SEDIMENT_YS = BANDS.slice(1).map((b) => b.top)

const sedimentMat = {
  color: "#1a1206",
  emissive: "#e8a020",
  emissiveIntensity: 0.12,
  metalness: 0.6,
  roughness: 0.5,
} as const

// One entry per wall face: how to place a plane of width SPAN at height mid,
// nudged `inset` world units off the wall toward the shaft interior.
const FACES: {
  pos: (mid: number, inset: number) => [number, number, number]
  rot: [number, number, number]
}[] = [
  { pos: (mid, inset) => [0, mid, -SHAFT_HALF + inset], rot: [0, 0, 0] },
  { pos: (mid, inset) => [-SHAFT_HALF + inset, mid, 0], rot: [0, Math.PI / 2, 0] },
  { pos: (mid, inset) => [SHAFT_HALF - inset, mid, 0], rot: [0, -Math.PI / 2, 0] },
]

export function ShaftWalls() {
  return (
    <group>
      {/* The concrete itself — one textured plane per face. */}
      {FACES.map((f, i) => (
        <mesh key={`wall${i}`} position={f.pos(MID, 0)} rotation={f.rot}>
          <planeGeometry args={[SPAN, H]} />
          <PbrMaterial name="concrete-foundation" repeat={REPEAT} {...flat} />
        </mesh>
      ))}

      {/* The strata — a darkening veil per floor cell, denser with depth. */}
      {BANDS.map((b, bi) =>
        b.veil <= 0.01
          ? null
          : FACES.map((f, fi) => {
              const h = b.top - b.bottom
              const mid = (b.top + b.bottom) / 2
              return (
                <mesh
                  key={`veil${bi}f${fi}`}
                  position={f.pos(mid, 0.015)}
                  rotation={f.rot}
                >
                  <planeGeometry args={[SPAN, h]} />
                  <meshBasicMaterial
                    color="#06040a"
                    transparent
                    opacity={b.veil}
                    depthWrite={false}
                  />
                </mesh>
              )
            })
      )}

      {/* Sediment lines at each boundary the cab descends through. */}
      {SEDIMENT_YS.map((y, i) => (
        <group key={`sed${i}`}>
          <mesh position={[0, y, -SHAFT_HALF + 0.02]}>
            <boxGeometry args={[SPAN, 0.05, 0.03]} />
            <meshStandardMaterial {...sedimentMat} />
          </mesh>
          <mesh position={[-SHAFT_HALF + 0.02, y, 0]}>
            <boxGeometry args={[0.03, 0.05, SPAN]} />
            <meshStandardMaterial {...sedimentMat} />
          </mesh>
          <mesh position={[SHAFT_HALF - 0.02, y, 0]}>
            <boxGeometry args={[0.03, 0.05, SPAN]} />
            <meshStandardMaterial {...sedimentMat} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
