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
  // seeded animation params (read once, never inside useFrame)
  bobAmp: number
  bobFreq: number
  swayAmp: number
  phase: number
}

/**
 * Language — vertical script columns. The owner works with machines that were
 * never meant to read his language; the grammar is the wrong shape, words stack
 * meaning end over end. Traditional Mongolian script runs top-to-bottom, so
 * here several tall columns of short angular glyph-strokes descend the cell,
 * each stroke settling and shifting a hair — an alien vertical script accreting
 * meaning downward, legible as structure even though the machine can't parse it.
 */
export function FloorLanguage({ yTop, yBottom }: FloorProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const strokes = useMemo<Stroke[]>(() => {
    const rng = makeRng("floor-language")
    const out: Stroke[] = []

    // The vertical writing span inside the cell, kept clear of ceiling/floor.
    const top = yTop - 0.7
    const bottom = yBottom + 0.7
    const span = top - bottom

    // 4–6 columns spaced roughly evenly across x, at varied z (facing +z, but
    // never poking past the camera plane).
    const columnCount = 5
    for (let c = 0; c < columnCount; c++) {
      // even spacing in [-3.5, 3.5] with a small seeded jitter
      const xBase = -3.5 + (c / (columnCount - 1)) * 7
      const x = clamp(xBase + seededDrift(rng, 0.25), -3.6, 3.6)
      const z = seededRange(rng, -2, 1)

      // The column's vertical "spine" wanders a touch left/right as it descends,
      // like a brushed line of script — a per-column lean.
      const lean = seededDrift(rng, 0.35)

      // Each column packs a dense stack of strokes down its length. Tighter
      // spacing reads as accreted meaning rather than scattered cubes.
      const glyphs = Math.round(seededRange(rng, 14, 22))
      const step = span / glyphs

      // A column-wide phase so columns don't all bob in lockstep.
      const colPhase = rng() * Math.PI * 2

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
          const side = b === 0 ? 0 : (b % 2 === 0 ? 1 : -1)
          const offX = side * seededRange(rng, 0.06, 0.2)
          const offY = seededDrift(rng, step * 0.22)
          const offZ = seededDrift(rng, 0.12)

          // mostly near-horizontal/diagonal angular ticks; occasional steeper
          // diagonal gives the "wrong shape" grammar its edge.
          const diagonal = rng() > 0.62
          const tilt = diagonal
            ? seededRange(rng, 0.5, 1.15) * (rng() > 0.5 ? 1 : -1)
            : seededDrift(rng, 0.28)

          out.push({
            x: clamp(rowX + offX, -3.9, 3.9),
            y: clamp(rowY + offY, bottom, top),
            z: clamp(z + offZ, -3.9, 1.5),
            len,
            thick: seededRange(rng, 0.05, 0.09),
            depth: seededRange(rng, 0.05, 0.08),
            tilt,
            cool: rng() > 0.94, // rare blue accent
            bobAmp: seededRange(rng, 0.01, 0.035),
            bobFreq: seededRange(rng, 0.3, 0.7),
            swayAmp: seededRange(rng, 0.02, 0.06),
            phase: colPhase + g * 0.35 + b * 1.1,
          })
        }
      }
    }
    return out
  }, [yTop, yBottom])

  // Per-instance tint: most strokes amber, a rare few cool blue. Applied once
  // via setColorAt (the instanceColor buffer multiplies the material color).
  const colors = useMemo(() => {
    const amber = new THREE.Color("#f0b452")
    const cool = new THREE.Color("#7e9af0")
    return strokes.map((s) => (s.cool ? cool : amber))
  }, [strokes])

  useFrame((state) => {
    if (!meshRef.current) return
    // Lay down per-instance colors once (instanceColor exists after mount).
    if (!meshRef.current.instanceColor) {
      for (let i = 0; i < colors.length; i++) {
        meshRef.current.setColorAt(i, colors[i])
      }
      if (meshRef.current.instanceColor) {
        ;(meshRef.current.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true
      }
    }
    const t = reduced ? 0 : state.clock.elapsedTime
    for (let i = 0; i < strokes.length; i++) {
      const s = strokes[i]
      // small clamped vertical bob — strokes settling end over end
      const bob = reduced ? 0 : clamp(Math.sin(t * s.bobFreq + s.phase) * s.bobAmp, -0.05, 0.05)
      // a hair of horizontal sway — the line is brushed, not printed
      const sway = reduced ? 0 : clamp(Math.cos(t * s.bobFreq * 0.8 + s.phase) * s.swayAmp, -0.08, 0.08)
      // a slight rotation drift around the resting tilt, clamped tight
      const wobble = reduced ? 0 : clamp(Math.sin(t * 0.4 + s.phase) * 0.06, -0.07, 0.07)

      dummy.position.set(s.x + sway, s.y + bob, s.z)
      dummy.rotation.set(0, 0, s.tilt + wobble)
      dummy.scale.set(s.len, s.thick, s.depth)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
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
  )
}
