import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"

const INSTANCE_COUNT = 120
const CORE_HEIGHT = 30
const CORE_RADIUS = 1.5

export function MachineCore() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const progress = useScrollStore((s) => s.progress)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Generate instance positions arranged in a cylindrical tower
  const positions = useMemo(() => {
    const data: { pos: THREE.Vector3; scale: THREE.Vector3; baseRotation: number }[] = []
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const t = i / INSTANCE_COUNT
      const angle = t * Math.PI * 12 + Math.random() * 0.5
      const y = t * CORE_HEIGHT - CORE_HEIGHT / 2
      const radiusVariation = CORE_RADIUS + Math.sin(t * Math.PI * 8) * 0.4
      const x = Math.cos(angle) * radiusVariation
      const z = Math.sin(angle) * radiusVariation
      const scaleBase = 0.1 + Math.random() * 0.25

      data.push({
        pos: new THREE.Vector3(x, y, z),
        scale: new THREE.Vector3(
          scaleBase * (0.5 + Math.random()),
          scaleBase * (0.3 + Math.random() * 0.7),
          scaleBase * (0.5 + Math.random())
        ),
        baseRotation: Math.random() * Math.PI * 2,
      })
    }
    return data
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return

    const time = state.clock.elapsedTime

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const { pos, scale, baseRotation } = positions[i]

      // Breathing/pulsing effect
      const pulse = Math.sin(time * 1.5 + i * 0.1) * 0.15 + 1
      const scrollPulse = 1 + progress * 0.2

      dummy.position.copy(pos)
      dummy.scale.set(
        scale.x * pulse * scrollPulse,
        scale.y * pulse * scrollPulse,
        scale.z * pulse * scrollPulse
      )
      dummy.rotation.set(
        baseRotation + time * 0.1,
        baseRotation + time * 0.15,
        0
      )
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    // Slow rotation of the entire core
    meshRef.current.rotation.y = time * 0.05
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
