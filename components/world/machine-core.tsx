import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng } from "@/lib/prng"
import { MACHINE_DRIFT_MAX, regionFactor } from "@/lib/world-config"

const INSTANCE_COUNT = 120
const CORE_HEIGHT = 30
const CORE_RADIUS = 1.5

interface Inst {
  pos: THREE.Vector3
  scale: THREE.Vector3
  baseRotation: number
  region: number // 0 locked … 1 drift, fixed by base y
  driftAmp: number
  driftFreq: number
  driftPhase: number
  pulsePhase: number
}

export function MachineCore() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const progress = useScrollStore((s) => s.progress)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Seeded once. The base is a perfectly reproducible lattice; the drift is
  // bounded noise layered on top, never re-rolled per frame.
  const positions = useMemo<Inst[]>(() => {
    const rng = makeRng("machine-core")
    const data: Inst[] = []
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const t = i / INSTANCE_COUNT
      const angle = t * Math.PI * 12 + (rng() - 0.5) * 0.5
      const y = t * CORE_HEIGHT - CORE_HEIGHT / 2
      const radiusVariation = CORE_RADIUS + Math.sin(t * Math.PI * 8) * 0.4
      const x = Math.cos(angle) * radiusVariation
      const z = Math.sin(angle) * radiusVariation
      const scaleBase = 0.1 + rng() * 0.25

      data.push({
        pos: new THREE.Vector3(x, y, z),
        scale: new THREE.Vector3(
          scaleBase * (0.5 + rng()),
          scaleBase * (0.3 + rng() * 0.7),
          scaleBase * (0.5 + rng())
        ),
        baseRotation: rng() * Math.PI * 2,
        region: regionFactor(y),
        driftAmp: 0.4 + rng() * 0.6,
        driftFreq: 0.6 + rng() * 1.2,
        driftPhase: rng() * Math.PI * 2,
        pulsePhase: rng() * Math.PI * 2,
      })
    }
    return data
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime
    const scrollPulse = 1 + progress * 0.2

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const inst = positions[i]
      // Above the seam → drift. Below → locked. Reduced motion → locked everywhere.
      const region = reduced ? 0 : inst.region

      // Bounded, seeded drift — only in the probabilistic region.
      const drift = region * inst.driftAmp * MACHINE_DRIFT_MAX
      const dx = Math.sin(time * inst.driftFreq + inst.driftPhase) * drift
      const dy = Math.cos(time * inst.driftFreq * 0.8 + inst.driftPhase) * drift
      const dz = Math.sin(time * inst.driftFreq * 1.1 + inst.driftPhase) * drift
      dummy.position.set(inst.pos.x + dx, inst.pos.y + dy, inst.pos.z + dz)

      // Breathing only in the drift region; the locked region holds still.
      const pulse = 1 + region * (Math.sin(time * 1.5 + inst.pulsePhase) * 0.15)
      dummy.scale.set(
        inst.scale.x * pulse * scrollPulse,
        inst.scale.y * pulse * scrollPulse,
        inst.scale.z * pulse * scrollPulse
      )

      // Locked region keeps a fixed orientation; drift region tumbles.
      dummy.rotation.set(
        inst.baseRotation + time * 0.1 * region,
        inst.baseRotation + time * 0.15 * region,
        0
      )
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    // Slow, uniform (deterministic) rotation of the whole tower.
    meshRef.current.rotation.y = reduced ? 0 : time * 0.04
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, INSTANCE_COUNT]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#e8a020"
        emissive="#e8a020"
        emissiveIntensity={0.6}
        metalness={0.8}
        roughness={0.3}
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  )
}
