import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng, seededRange, seededDrift, clamp } from "@/lib/prng"
import type { FloorProps } from "@/lib/floors"

// One glyph-stroke: a short angular beam in a vertical column. The base box
// geometry is a unit cube scaled per-instance into a thin beam, then animated
// with a tiny clamped bob/sway so the script reads as alive-but-legible.
interface Stroke {
  // resting position in cell space
  x: number
  y: number
  z: number
  // beam dimensions
  len: number // along its own (rotated) length
  thick: number
  depth: number
  // resting tilt of the beam (radians, on z) — angular, script-like
  tilt: number
  // a rare cool-blue accent stroke
  cool: boolean
  // which column this stroke belongs to (for the read-column highlight)
  col: number
  // seeded animation params (read once, never inside useFrame)
  bobAmp: number
  bobFreq: number
  swayAmp: number
  phase: number
}

// Seeded column construction, shared by the near script and the far script.
// Given the same rng and inputs it always lays down the same strokes — the
// far columns are the same writing, just carried deeper. `scale` shrinks the
// beams (and their drift) without touching the draw order.
function buildColumns(
  rng: () => number,
  xBases: number[],
  top: number,
  bottom: number,
  zMin: number,
  zMax: number,
  scale: number,
): { strokes: Stroke[]; columnXs: number[] } {
  const span = top - bottom
  const strokes: Stroke[] = []
  const columnXs: number[] = []

  for (let c = 0; c < xBases.length; c++) {
    // base x with a small seeded jitter
    const x = clamp(xBases[c] + seededDrift(rng, 0.25), -3.6, 3.6)
    const z = seededRange(rng, zMin, zMax)

    // The column's vertical "spine" wanders a touch left/right as it descends,
    // like a brushed line of script — a per-column lean.
    const lean = seededDrift(rng, 0.35)

    // Each column packs a dense stack of strokes down its length. Tighter
    // spacing reads as accreted meaning rather than scattered cubes.
    const glyphs = Math.round(seededRange(rng, 14, 22))
    const step = span / glyphs

    // A column-wide phase so columns don't all bob in lockstep.
    const colPhase = rng() * Math.PI * 2

    // The column's mid-descent x — where a cursor would consider it to sit.
    columnXs.push(x + lean * 0.5)

    for (let g = 0; g < glyphs; g++) {
      // strokes per glyph row: 1–3 short beams, varied length & offset
      const beams = Math.round(seededRange(rng, 1, 3))
      const rowY = top - (g + 0.5) * step
      // how far down the column we are, 0 at top → 1 at bottom
      const t = (top - rowY) / span
      const rowX = x + lean * t

      for (let b = 0; b < beams; b++) {
        const len = seededRange(rng, 0.22, 0.62)
        // beams hang off the spine to alternating sides — script ticks
        const side = b === 0 ? 0 : b % 2 === 0 ? 1 : -1
        const offX = side * seededRange(rng, 0.06, 0.2)
        const offY = seededDrift(rng, step * 0.22)
        const offZ = seededDrift(rng, 0.12)

        // mostly near-horizontal/diagonal angular ticks; occasional steeper
        // diagonal gives the "wrong shape" grammar its edge.
        const diagonal = rng() > 0.62
        const tilt = diagonal
          ? seededRange(rng, 0.5, 1.15) * (rng() > 0.5 ? 1 : -1)
          : seededDrift(rng, 0.28)

        strokes.push({
          x: clamp(rowX + offX, -3.9, 3.9),
          y: clamp(rowY + offY, bottom, top),
          z: clamp(z + offZ, -3.9, 1.5),
          len: len * scale,
          thick: seededRange(rng, 0.05, 0.09) * scale,
          depth: seededRange(rng, 0.05, 0.08) * scale,
          tilt,
          cool: rng() > 0.94, // rare blue accent
          col: c,
          bobAmp: seededRange(rng, 0.01, 0.035) * scale,
          bobFreq: seededRange(rng, 0.3, 0.7),
          swayAmp: seededRange(rng, 0.02, 0.06) * scale,
          phase: colPhase + g * 0.35 + b * 1.1,
        })
      }
    }
  }
  return { strokes, columnXs }
}

// The shared ambient motion: a clamped bob/sway/wobble around each stroke's
// resting pose. One pass, zero allocations — `dummy` is reused throughout.
function writeStrokeMatrices(
  mesh: THREE.InstancedMesh,
  list: Stroke[],
  t: number,
  frozen: boolean,
  dummy: THREE.Object3D,
) {
  for (let i = 0; i < list.length; i++) {
    const s = list[i]
    // small clamped vertical bob — strokes settling end over end
    const bob = frozen ? 0 : clamp(Math.sin(t * s.bobFreq + s.phase) * s.bobAmp, -0.05, 0.05)
    // a hair of horizontal sway — the line is brushed, not printed
    const sway = frozen ? 0 : clamp(Math.cos(t * s.bobFreq * 0.8 + s.phase) * s.swayAmp, -0.08, 0.08)
    // a slight rotation drift around the resting tilt, clamped tight
    const wobble = frozen ? 0 : clamp(Math.sin(t * 0.4 + s.phase) * 0.06, -0.07, 0.07)

    dummy.position.set(s.x + sway, s.y + bob, s.z)
    dummy.rotation.set(0, 0, s.tilt + wobble)
    dummy.scale.set(s.len, s.thick, s.depth)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
}

// Near columns sit spaced across the cell; far columns hang behind them, out
// past where the cursor can reach.
const NEAR_X_BASES = [-3.5, -1.75, 0, 1.75, 3.5]
const FAR_X_BASES = [1.0, 2.7] // right of centre — the text holds the left

/**
 * Tongue — the mother language, carried. Traditional Mongolian script runs
 * top-to-bottom, so several tall columns of short angular glyph-strokes descend
 * the cell, each stroke settling and shifting a hair — meaning stacked end over
 * end, legible as structure even though the machines were never taught to read
 * it. The worry lives here: a language the systems treat as noise.
 *
 * The pointer is a text cursor. Whichever near column it lands beside becomes
 * the read column and brightens in the same frame — no easing in, none out,
 * exactly like a caret dropping into a line. The far columns never respond:
 * some of the language stays where the machines can't touch it.
 */
export function FloorTongue({ yTop, yBottom }: FloorProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const farRef = useRef<THREE.InstancedMesh>(null)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // The vertical writing span inside the cell, kept clear of ceiling/floor.
  const band = useMemo(
    () => ({ top: yTop - 0.7, bottom: yBottom + 0.7 }),
    [yTop, yBottom],
  )

  const { strokes, columnXs } = useMemo(
    () => buildColumns(makeRng("floor-tongue"), NEAR_X_BASES, band.top, band.bottom, -2, 1, 1),
    [band],
  )

  // The far script: dimmer, 60% scale, pushed deep behind the near columns.
  // Same seeded construction under its own name — a second, quieter hand.
  const farStrokes = useMemo(
    () =>
      buildColumns(makeRng("floor-tongue-far"), FAR_X_BASES, band.top, band.bottom, -3.5, -2.5, 0.6)
        .strokes,
    [band],
  )

  // Per-instance tints. The read variants are the same hues stepped brighter —
  // a caret landing, not a glow swelling. Far strokes get a dimmed pair and
  // never change.
  const palette = useMemo(
    () => ({
      amber: new THREE.Color("#f0b452"),
      amberRead: new THREE.Color("#f0b452").multiplyScalar(3.0),
      cool: new THREE.Color("#7e9af0"),
      coolRead: new THREE.Color("#7e9af0").multiplyScalar(2.2),
      amberFar: new THREE.Color("#f0b452").multiplyScalar(0.6),
      coolFar: new THREE.Color("#7e9af0").multiplyScalar(0.6),
    }),
    [],
  )

  // Pointer projection: a plane at mid-stage depth, intersected fresh each
  // frame. Preallocated — nothing is created inside useFrame.
  const pointerPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const pointerPoint = useMemo(() => new THREE.Vector3(), [])
  // -2 is a sentinel: forces the first frame to lay down base colors.
  const activeColRef = useRef(-2)
  const farColorsPlacedRef = useRef(false)

  useFrame((state) => {
    const mesh = meshRef.current
    const far = farRef.current

    // ---- The read column (below the seam: instant and exact, or absent). ----
    // Project the pointer onto the stage plane; if it lands inside this
    // floor's band, the nearest column becomes the read column. Under reduced
    // motion the response is absent entirely.
    let active = -1
    if (!reduced && mesh) {
      state.raycaster.setFromCamera(state.pointer, state.camera)
      const hit = state.raycaster.ray.intersectPlane(pointerPlane, pointerPoint)
      if (hit && hit.y >= yBottom && hit.y <= yTop && Math.abs(hit.x) <= 4) {
        let best = Infinity
        for (let c = 0; c < columnXs.length; c++) {
          const d = Math.abs(columnXs[c] - hit.x)
          if (d < best) {
            best = d
            active = c
          }
        }
      }
    }

    // Colors are rewritten only on the frame the read column changes — one
    // full pass over the instances, then nothing until the caret moves.
    if (mesh && active !== activeColRef.current) {
      for (let i = 0; i < strokes.length; i++) {
        const s = strokes[i]
        const read = s.col === active
        mesh.setColorAt(
          i,
          s.cool
            ? read
              ? palette.coolRead
              : palette.cool
            : read
              ? palette.amberRead
              : palette.amber,
        )
      }
      if (mesh.instanceColor) {
        ;(mesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true
      }
      activeColRef.current = active
    }

    // Far tints are laid down once and never touched again.
    if (far && !farColorsPlacedRef.current) {
      for (let i = 0; i < farStrokes.length; i++) {
        far.setColorAt(i, farStrokes[i].cool ? palette.coolFar : palette.amberFar)
      }
      if (far.instanceColor) {
        ;(far.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true
        farColorsPlacedRef.current = true
      }
    }

    // ---- The ambient drift (frozen under reduced motion). ----
    const t = reduced ? 0 : state.clock.elapsedTime
    if (mesh) writeStrokeMatrices(mesh, strokes, t, reduced, dummy)
    if (far) writeStrokeMatrices(far, farStrokes, t, reduced, dummy)
  })

  return (
    <group>
      {/* The near script — five columns within the cursor's reach. */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, strokes.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#d89018"
          emissive="#e8a020"
          emissiveIntensity={0.5}
          metalness={0.7}
          roughness={0.4}
        />
      </instancedMesh>

      {/* The far script — carried deeper, dimmer, beyond the read column. */}
      <instancedMesh
        ref={farRef}
        args={[undefined, undefined, farStrokes.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#7a5210"
          emissive="#e8a020"
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.4}
        />
      </instancedMesh>
    </group>
  )
}
