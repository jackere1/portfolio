import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng } from "@/lib/prng"
import { MACHINE_DRIFT_MAX, regionFactor } from "@/lib/world-config"

// A regular lattice column. The same primitive on both sides of the seam:
// below it the cubes hold a perfect grid (order); above it they drift on
// seeded, clamped noise (drift). Scrolling down resolves chaos into structure.
const COLS = [-1.95, -0.65, 0.65, 1.95] // 4×4 columns
const Y_TOP = 15
const Y_BOTTOM = -27
const LAYER_STEP = 1.5
const CUBE = 0.16

interface Cell {
  base: THREE.Vector3
  region: number
  driftAmp: number
  driftFreq: number
  driftPhase: number
  spin: number
}

export function MachineCore() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const cells = useMemo<Cell[]>(() => {
    const rng = makeRng("lattice")
    const out: Cell[] = []
    for (let y = Y_BOTTOM; y <= Y_TOP; y += LAYER_STEP) {
      for (const x of COLS) {
        for (const z of COLS) {
          out.push({
            base: new THREE.Vector3(x, y, z),
            region: regionFactor(y),
            driftAmp: 0.5 + rng() * 0.5,
            driftFreq: 0.5 + rng() * 1.1,
            driftPhase: rng() * Math.PI * 2,
            spin: rng() * Math.PI * 2,
          })
        }
      }
    }
    return out
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      const region = reduced ? 0 : c.region

      // Drift only above the seam — bounded, seeded, never unbounded.
      const amp = region * c.driftAmp * MACHINE_DRIFT_MAX
      dummy.position.set(
        c.base.x + Math.sin(time * c.driftFreq + c.driftPhase) * amp,
        c.base.y + Math.cos(time * c.driftFreq * 0.8 + c.driftPhase) * amp,
        c.base.z + Math.sin(time * c.driftFreq * 1.2 + c.driftPhase) * amp
      )

      // Locked cubes stay axis-aligned; drifting cubes tumble slightly.
      dummy.rotation.set(
        c.spin * region * 0.6 + time * 0.08 * region,
        c.spin * region * 0.6 + time * 0.05 * region,
        0
      )
      const s = CUBE * (1 + region * 0.25)
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
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
  )
}
