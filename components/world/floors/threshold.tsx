import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng } from "@/lib/prng"
import {
  MACHINE_DRIFT_MAX,
  PARTICLE_DRIFT_MAX,
  SEAM_Y,
  regionFactor,
} from "@/lib/world-config"
import type { FloorProps } from "@/lib/floors"

// The pointer projects onto the front cube layer; the upper lattice notices it
// within this radius and leans — softly, lagging. The lower lattice does not.
const POINTER_Z = 1.5
const ATTRACT_RADIUS = 2.5
const LEAN_MAX = 0.3 // radians — the lean is clamped by construction
const MOTE_COUNT = 72

interface Cell {
  base: THREE.Vector3
  region: number
  amp: number
  freq: number
  phase: number
}

interface Mote {
  base: THREE.Vector3
  scale: number
  ampX: number
  ampY: number
  ampZ: number
  freq: number
  phase: number
  rotX: number
  rotY: number
  spin: number
}

/**
 * Threshold — where the persona meets the person. The same primitive on both
 * sides of the seam: drifting above it, locked into a rigid grid below. The
 * performing self stays upstairs; you watch order and drift meet, right where
 * you cross.
 *
 * The floor is the doctrine, so the pointer proves it: cubes above the seam
 * lean gently toward your cursor — eased, lagging, flirting. Cubes below give
 * zero response. Not damped. Zero. And the water above carries a little dust;
 * below the seam it is perfectly clear.
 */
export function FloorThreshold({ yTop, yBottom }: FloorProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const motesRef = useRef<THREE.InstancedMesh>(null)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Pointer scratch state — preallocated, nothing allocates inside useFrame.
  const pointerPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), -POINTER_Z),
    []
  )
  const pointerHit = useMemo(() => new THREE.Vector3(), [])
  const pointerSmooth = useMemo(
    () => new THREE.Vector3(0, (yTop + yBottom) / 2, POINTER_Z),
    [yTop, yBottom]
  )
  const attention = useRef(0)

  const cells = useMemo<Cell[]>(() => {
    const rng = makeRng("floor-threshold")
    const out: Cell[] = []
    const cols = [-3, -1.5, 0, 1.5, 3]
    const zs = [-1.5, 0, 1.5]
    for (let y = yBottom + 0.7; y <= yTop - 0.7; y += 1.05) {
      for (const x of cols) {
        for (const z of zs) {
          out.push({
            base: new THREE.Vector3(x, y, z),
            region: regionFactor(y),
            amp: 0.5 + rng() * 0.5,
            freq: 0.5 + rng() * 1.0,
            phase: rng() * Math.PI * 2,
          })
        }
      }
    }
    return out
  }, [yTop, yBottom])

  // Dust motes exist ONLY above the seam. Base positions and drift amplitudes
  // are chosen so no mote can ever cross below SEAM_Y — the locked water is
  // perfectly clear, and that clarity is honest, not approximate.
  const motes = useMemo<Mote[]>(() => {
    const rng = makeRng("floor-threshold-motes")
    const bottom = SEAM_Y + 0.7
    const top = yTop - 0.55
    if (top <= bottom) return []
    const out: Mote[] = []
    for (let i = 0; i < MOTE_COUNT; i++) {
      out.push({
        base: new THREE.Vector3(
          -3.3 + rng() * 6.6,
          bottom + rng() * (top - bottom),
          -3.2 + rng() * 5.4
        ),
        scale: 0.02 + rng() * 0.02,
        // Every amplitude ≤ PARTICLE_DRIFT_MAX, and the vertical amplitude is
        // tighter still so base.y - ampY stays above the seam.
        ampX: (0.25 + rng() * 0.65) * PARTICLE_DRIFT_MAX * 0.9,
        ampY: 0.1 + rng() * 0.35,
        ampZ: (0.25 + rng() * 0.65) * PARTICLE_DRIFT_MAX * 0.9,
        freq: 0.05 + rng() * 0.09, // long, lazy periods
        phase: rng() * Math.PI * 2,
        rotX: rng() * Math.PI * 2,
        rotY: rng() * Math.PI * 2,
        spin: 0.03 + rng() * 0.1,
      })
    }
    return out
  }, [yTop])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.1)

    // Project the pointer onto the front layer. The response is eased and
    // lagging — the performer noticing you — and it exists only above the
    // seam. Reduced motion silences it entirely.
    let target = 0
    if (!reduced) {
      state.raycaster.setFromCamera(state.pointer, state.camera)
      const hit = state.raycaster.ray.intersectPlane(pointerPlane, pointerHit)
      if (hit !== null && pointerHit.y >= yBottom && pointerHit.y <= yTop) {
        target = 1
      }
    }
    const ease = 1 - Math.exp(-dt * 4)
    if (target > 0) pointerSmooth.lerp(pointerHit, ease)
    attention.current += (target - attention.current) * ease
    if (reduced) attention.current = 0
    const att = attention.current

    if (meshRef.current) {
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]
        const region = reduced ? 0 : c.region
        const amp = region * c.amp * MACHINE_DRIFT_MAX
        let ox = Math.sin(t * c.freq + c.phase) * amp
        let oy = Math.cos(t * c.freq * 0.8 + c.phase) * amp
        const oz = Math.sin(t * c.freq * 1.1 + c.phase) * amp
        let leanX = 0
        let leanZ = 0

        // Above the seam (region > 0.5) the cube leans toward the pointer,
        // pull clamped by MACHINE_DRIFT_MAX with a soft falloff. Below the
        // seam this branch never runs: zero response, not a damped one.
        if (att > 0.001 && c.region > 0.5) {
          const dx = pointerSmooth.x - c.base.x
          const dy = pointerSmooth.y - c.base.y
          const d = Math.hypot(dx, dy)
          if (d > 0.0001 && d < ATTRACT_RADIUS) {
            const f = 1 - d / ATTRACT_RADIUS
            const fall = f * f * (3 - 2 * f)
            const pull = att * fall * c.region * MACHINE_DRIFT_MAX
            ox += (dx / d) * pull
            oy += (dy / d) * pull
            leanZ = -(dx / d) * att * fall * c.region * LEAN_MAX
            leanX = (dy / d) * att * fall * c.region * LEAN_MAX * 0.6
          }
        }

        dummy.position.set(c.base.x + ox, c.base.y + oy, c.base.z + oz)
        dummy.rotation.set(
          c.phase * region * 0.5 + t * 0.06 * region + leanX,
          c.phase * region * 0.5,
          leanZ
        )
        const s = 0.17 * (1 + region * 0.2)
        dummy.scale.set(s, s, s)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
      }
      meshRef.current.instanceMatrix.needsUpdate = true
    }

    // The dust: slow, clamped drift on long periods. Frozen under reduced
    // motion — the motes may exist, but they hold still.
    if (motesRef.current && motes.length > 0) {
      const mt = reduced ? 0 : t
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i]
        dummy.position.set(
          m.base.x + Math.sin(mt * m.freq + m.phase) * m.ampX,
          m.base.y + Math.sin(mt * m.freq * 0.7 + m.phase * 1.7) * m.ampY,
          m.base.z + Math.cos(mt * m.freq * 0.9 + m.phase) * m.ampZ
        )
        dummy.rotation.set(m.rotX + mt * m.spin, m.rotY + mt * m.spin * 0.8, 0)
        dummy.scale.setScalar(m.scale)
        dummy.updateMatrix()
        motesRef.current.setMatrixAt(i, dummy.matrix)
      }
      motesRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, cells.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#e8a020"
          emissive="#e8a020"
          emissiveIntensity={0.55}
          metalness={0.6}
          roughness={0.35}
          transparent
          opacity={0.92}
        />
      </instancedMesh>

      {motes.length > 0 && (
        <instancedMesh
          ref={motesRef}
          args={[undefined, undefined, motes.length]}
          frustumCulled={false}
        >
          <tetrahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#241803"
            emissive="#e8a020"
            emissiveIntensity={0.4}
            metalness={0.7}
            roughness={0.4}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </instancedMesh>
      )}
    </group>
  )
}
