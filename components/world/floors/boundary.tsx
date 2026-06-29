import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng } from "@/lib/prng"
import { MACHINE_DRIFT_MAX, regionFactor } from "@/lib/world-config"
import type { FloorProps } from "@/lib/floors"

interface Cell {
  base: THREE.Vector3
  region: number
  amp: number
  freq: number
  phase: number
}

/**
 * Boundary — the thermocline cell. The same primitive on both sides of the
 * seam: drifting above it, locked into a rigid grid below. You watch order and
 * drift meet, right where you cross.
 */
export function FloorBoundary({ yTop, yBottom }: FloorProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const cells = useMemo<Cell[]>(() => {
    const rng = makeRng("floor-boundary")
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

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      const region = reduced ? 0 : c.region
      const amp = region * c.amp * MACHINE_DRIFT_MAX
      dummy.position.set(
        c.base.x + Math.sin(t * c.freq + c.phase) * amp,
        c.base.y + Math.cos(t * c.freq * 0.8 + c.phase) * amp,
        c.base.z + Math.sin(t * c.freq * 1.1 + c.phase) * amp
      )
      dummy.rotation.set(
        c.phase * region * 0.5 + t * 0.06 * region,
        c.phase * region * 0.5,
        0
      )
      const s = 0.17 * (1 + region * 0.2)
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
