import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng, seededRange, clamp } from "@/lib/prng"
import type { FloorProps } from "@/lib/floors"

// The strings stretch across the cell along X, anchored at the bridges.
const X_LEFT = -4
const X_RIGHT = 4
const SPAN = X_RIGHT - X_LEFT
// Each string is a row of short segments; more segments → a smoother wave.
const SEG_PER_STRING = 26
const SEG_W = SPAN / SEG_PER_STRING

interface Str {
  y: number // resting height of the string
  z: number // slight depth offset
  k: number // spatial frequency → number of standing-wave lobes
  f: number // temporal frequency → how fast it resonates
  phase: number
  amp: number // displacement amplitude (clamped ≤ 0.25)
  cool: boolean // the one blue string, resolving its tension
}

/**
 * Music — a resonating chord. Long horizontal strings stretched across the
 * cell, each vibrating as a standing wave at its own seeded harmonic. The ear
 * closes the cadence before the hands catch up: one string is cool-blue and
 * settles toward stillness — tension resolving. The rest hold their interval,
 * shimmering, a chord you can almost hear.
 */
export function FloorMusic({ yTop, yBottom, yCenter, height }: FloorProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Vertical band the strings live in, kept clear of the cell ceiling/floor.
  const yLo = yBottom + 0.7
  const yHi = yTop - 0.7

  const strings = useMemo<Str[]>(() => {
    const rng = makeRng("floor-music")
    // A small chord: 6 strings spread across the cell height. Integer-ish
    // spatial frequencies make clean standing-wave lobes (anchored at ends).
    const count = 6
    // pick which one resolves — a mid string, so it reads as the inner voice
    const coolIndex = 2
    const out: Str[] = []
    for (let i = 0; i < count; i++) {
      const span = Math.max(height - 1.4, 0.1)
      const y = yLo + (span * (i + 0.5)) / count
      // half-integer multiples of PI/SPAN keep nodes near the anchors
      const lobes = 1 + Math.floor(seededRange(rng, 1, 5))
      out.push({
        y,
        z: seededRange(rng, -0.9, 0.9),
        k: (lobes * Math.PI) / SPAN,
        f: seededRange(rng, 0.7, 1.9),
        phase: seededRange(rng, 0, Math.PI * 2),
        amp: clamp(seededRange(rng, 0.1, 0.22), 0, 0.25),
        cool: i === coolIndex,
      })
    }
    return out
  }, [yLo, height])

  const total = strings.length * SEG_PER_STRING

  // Per-instance colours: amber for the chord, blue for the resolving voice.
  const colors = useMemo(() => {
    const arr = new Float32Array(total * 3)
    const amber = new THREE.Color("#e8a020")
    const blue = new THREE.Color("#4060c0")
    let p = 0
    for (let s = 0; s < strings.length; s++) {
      const c = strings[s].cool ? blue : amber
      for (let j = 0; j < SEG_PER_STRING; j++) {
        c.toArray(arr, p * 3)
        p++
      }
    }
    return arr
  }, [strings, total])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    let i = 0
    for (let s = 0; s < strings.length; s++) {
      const str = strings[s]
      // The blue string settles: its amplitude decays toward rest, the chord
      // resolving. Others hold a gentle steady resonance.
      const settle = str.cool ? 0.35 + 0.65 / (1 + t * 0.25) : 1
      const amp = reduced ? 0 : clamp(str.amp * settle, 0, 0.25)
      for (let j = 0; j < SEG_PER_STRING; j++) {
        // segment centre along the string
        const x = X_LEFT + (j + 0.5) * SEG_W
        // standing wave: an envelope fixed in space, oscillating in time.
        // sin(x*k) pins the nodes; the temporal term makes it breathe.
        const local = x - X_LEFT
        const envelope = Math.sin(local * str.k)
        const dy = envelope * Math.sin(t * str.f + str.phase) * amp
        dummy.position.set(x, str.y + dy, str.z)
        // tilt each segment to follow the slope of the wave — it reads as a
        // continuous string rather than a row of beads.
        const slope =
          str.k * Math.cos(local * str.k) * Math.sin(t * str.f + str.phase) * amp
        dummy.rotation.set(0, 0, Math.atan(slope))
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        i++
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      {/* The vibrating strings — one instanced segment field. */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, total]}
        frustumCulled={false}
      >
        <boxGeometry args={[SEG_W * 1.04, 0.05, 0.05]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </boxGeometry>
        <meshStandardMaterial
          vertexColors
          color="#1a1206"
          emissive="#e8a020"
          emissiveIntensity={0.5}
          metalness={0.7}
          roughness={0.4}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Bridge posts — the anchors the strings are stretched between. */}
      {[X_LEFT, X_RIGHT].map((x, i) => (
        <mesh key={`bridge${i}`} position={[x, yCenter, 0]}>
          <boxGeometry args={[0.12, Math.max(height - 1.0, 0.2), 0.12]} />
          <meshStandardMaterial
            color="#221808"
            emissive="#e8a020"
            emissiveIntensity={0.3}
            metalness={0.75}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* Node markers — thin caps where each string seats on its bridge. */}
      {strings.map((str, i) => (
        <group key={`nodes${i}`}>
          <mesh position={[X_LEFT, str.y, str.z]}>
            <cylinderGeometry args={[0.06, 0.06, 0.16, 8]} />
            <meshStandardMaterial
              color="#2a1d09"
              emissive={str.cool ? "#4060c0" : "#e8a020"}
              emissiveIntensity={0.45}
              metalness={0.7}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[X_RIGHT, str.y, str.z]}>
            <cylinderGeometry args={[0.06, 0.06, 0.16, 8]} />
            <meshStandardMaterial
              color="#2a1d09"
              emissive={str.cool ? "#4060c0" : "#e8a020"}
              emissiveIntensity={0.45}
              metalness={0.7}
              roughness={0.4}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
