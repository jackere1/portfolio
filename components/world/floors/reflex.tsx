import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng } from "@/lib/prng"
import type { FloorProps } from "@/lib/floors"

// The targeting grid lives on a vertical plane near the back of the cell,
// facing the camera. Reticles snap between its intersections.
const GRID_Z = -2.5
const GRID_HALF_X = 3.4 // columns span x ∈ [-3.4, 3.4]
const COLS = 13 // odd → a true centre column
const ROWS = 9
const CADENCE = 0.55 // seconds per snap — quantized, no easing
const SEQ_LEN = 64 // length of the precomputed deterministic jump sequence

interface Reticle {
  // The deterministic sequence of grid cells this reticle visits, one per tick.
  cells: { col: number; row: number }[]
  cool: boolean // cool-blue accent (one of the three)
  ring: number // outer ring radius
}

/**
 * Reflex — the aim trainer. A tight, regular dot grid fills the back of the
 * cell (drilled precision), and crosshair reticles SNAP to fresh intersections
 * on a fixed cadence with zero easing. The jump is instantaneous between
 * frames — under pressure you fall to your reflexes, and that snap is the point.
 */
export function FloorReflex({ yTop, yBottom, yCenter }: FloorProps) {
  const dotsRef = useRef<THREE.InstancedMesh>(null)
  const reticleRefs = useRef<(THREE.Group | null)[]>([])
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // The grid geometry: a regular lattice of intersection points on the plane.
  // Kept inside the cell with a margin so dots never touch the walls.
  const grid = useMemo(() => {
    const top = yTop - 0.7
    const bottom = yBottom + 0.7
    const xAt = (col: number) =>
      -GRID_HALF_X + (col / (COLS - 1)) * (GRID_HALF_X * 2)
    const yAt = (row: number) => bottom + (row / (ROWS - 1)) * (top - bottom)
    return { xAt, yAt, top, bottom }
  }, [yTop, yBottom])

  // Every dot/crossbar position — built once, written into the instanced mesh.
  const dotCount = COLS * ROWS

  // Seeded, deterministic per-step targets for each reticle. Hash the step
  // index against a fixed sequence; never Math.random, never rng() in useFrame.
  const reticles = useMemo<Reticle[]>(() => {
    const rng = makeRng("floor-reflex")
    const specs: { cool: boolean; ring: number }[] = [
      { cool: false, ring: 0.28 },
      { cool: false, ring: 0.22 },
      { cool: true, ring: 0.25 }, // one cool-blue
    ]
    return specs.map((spec) => {
      const cells: { col: number; row: number }[] = []
      let prevCol = -1
      let prevRow = -1
      for (let i = 0; i < SEQ_LEN; i++) {
        // Draw a fresh cell; reject a repeat of the immediately prior one so the
        // snap always visibly moves. Bounded by SEQ_LEN tries via the loop.
        let col = Math.floor(rng() * COLS)
        let row = Math.floor(rng() * ROWS)
        if (col === prevCol && row === prevRow) {
          col = (col + 1 + Math.floor(rng() * (COLS - 1))) % COLS
          row = (row + 1 + Math.floor(rng() * (ROWS - 1))) % ROWS
        }
        prevCol = col
        prevRow = row
        cells.push({ col, row })
      }
      return { cells, cool: spec.cool, ring: spec.ring }
    })
  }, [])

  // Write the static dot lattice into the instanced mesh once it mounts.
  useFrame(() => {
    const mesh = dotsRef.current
    if (mesh && !mesh.userData.placed) {
      let i = 0
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          dummy.position.set(grid.xAt(c), grid.yAt(r), GRID_Z)
          dummy.rotation.set(0, 0, Math.PI / 4) // diamond ticks
          dummy.scale.setScalar(1)
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
          i++
        }
      }
      mesh.instanceMatrix.needsUpdate = true
      mesh.userData.placed = true
    }
  })

  // Snap the reticles. Quantize time into ticks and index the precomputed
  // sequence — the position changes instantaneously between frames.
  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime
    const step = Math.floor(t / CADENCE)
    for (let i = 0; i < reticles.length; i++) {
      const g = reticleRefs.current[i]
      if (!g) continue
      // Each reticle phased onto a different slice of the sequence so they
      // don't move in lockstep.
      const cell = reticles[i].cells[(step + i * 5) % SEQ_LEN]
      g.position.set(grid.xAt(cell.col), grid.yAt(cell.row), GRID_Z + 0.06)
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* The targeting grid: a regular lattice of small diamond ticks. */}
      <instancedMesh
        ref={dotsRef}
        args={[undefined, undefined, dotCount]}
        frustumCulled={false}
      >
        <planeGeometry args={[0.05, 0.05]} />
        <meshStandardMaterial
          color="#1a1206"
          emissive="#e8a020"
          emissiveIntensity={0.35}
          metalness={0.7}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* Faint gridlines: thin crossbars marking the central axes, for the
          crisp drilled-grid read. */}
      <Gridlines
        x0={grid.xAt(0)}
        x1={grid.xAt(COLS - 1)}
        y0={grid.bottom}
        y1={grid.top}
        yc={yCenter}
      />

      {/* The reticles — crosshair markers that snap between intersections. */}
      {reticles.map((ret, i) => (
        <group
          key={i}
          ref={(el) => {
            reticleRefs.current[i] = el
          }}
        >
          <Crosshair ring={ret.ring} cool={ret.cool} />
        </group>
      ))}
    </group>
  )
}

// A single crosshair: a thin ring plus four tick marks — a "+" inside an "O".
function Crosshair({ ring, cool }: { ring: number; cool: boolean }) {
  const color = cool ? "#4060c0" : "#e8a020"
  const tick = ring * 0.62
  const tickLen = ring * 0.5
  const bar = 0.018
  return (
    <group>
      <mesh>
        <ringGeometry args={[ring - 0.025, ring, 32]} />
        <meshStandardMaterial
          color={cool ? "#0c1226" : "#241803"}
          emissive={color}
          emissiveIntensity={cool ? 0.85 : 0.6}
          metalness={0.7}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Four tick marks pointing inward — the aim cross. */}
      {[
        [0, tick, 0, bar, tickLen] as const,
        [0, -tick, 0, bar, tickLen] as const,
        [tick, 0, 0, tickLen, bar] as const,
        [-tick, 0, 0, tickLen, bar] as const,
      ].map(([px, py, , w, h], i) => (
        <mesh key={i} position={[px, py, 0]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial
            color={cool ? "#0c1226" : "#241803"}
            emissive={color}
            emissiveIntensity={cool ? 0.85 : 0.6}
            metalness={0.7}
            roughness={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Centre pip. */}
      <mesh>
        <planeGeometry args={[bar * 1.6, bar * 1.6]} />
        <meshStandardMaterial
          color={cool ? "#0c1226" : "#241803"}
          emissive={color}
          emissiveIntensity={cool ? 0.9 : 0.7}
          metalness={0.7}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// The two central axes of the grid, as thin dim crossbars on the plane.
function Gridlines({
  x0,
  x1,
  y0,
  y1,
  yc,
}: {
  x0: number
  x1: number
  y0: number
  y1: number
  yc: number
}) {
  const w = x1 - x0
  const h = y1 - y0
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const mat = {
    color: "#150e05",
    emissive: "#e8a020",
    emissiveIntensity: 0.18,
    metalness: 0.7,
    roughness: 0.4,
  } as const
  return (
    <group>
      {/* Horizontal axis through grid centre. */}
      <mesh position={[cx, cy, GRID_Z - 0.01]}>
        <planeGeometry args={[w, 0.012]} />
        <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
      </mesh>
      {/* Vertical axis through grid centre. */}
      <mesh position={[cx, cy, GRID_Z - 0.01]}>
        <planeGeometry args={[0.012, h]} />
        <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
      </mesh>
      {/* A horizontal axis aligned to the cell centre line — the aim datum. */}
      <mesh position={[cx, yc, GRID_Z - 0.005]}>
        <planeGeometry args={[w, 0.02]} />
        <meshStandardMaterial
          color="#150e05"
          emissive="#e8a020"
          emissiveIntensity={0.28}
          metalness={0.7}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
