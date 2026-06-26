import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore, getSectionProgress } from "@/hooks/use-scroll-store"

interface MonolithProps {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  index: number
}

function Monolith({ position, scale, color, index }: MonolithProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const edgeRef = useRef<THREE.LineSegments>(null)
  const progress = useScrollStore((s) => s.progress)

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime

    // Float up and down
    meshRef.current.position.y =
      position[1] + Math.sin(time * 0.5 + index * 0.8) * 0.3

    // Subtle rotation
    meshRef.current.rotation.y = Math.sin(time * 0.2 + index) * 0.1

    // Fade in around the boundary crossing
    const ringProgress = getSectionProgress(progress, "boundary")
    const material = meshRef.current.material as THREE.MeshStandardMaterial
    material.opacity = Math.min(1, ringProgress * 2)

    if (edgeRef.current) {
      edgeRef.current.position.copy(meshRef.current.position)
      edgeRef.current.rotation.copy(meshRef.current.rotation)
    }
  })

  return (
    <group>
      <mesh ref={meshRef} position={position} scale={scale}>
        <boxGeometry args={[1, 2, 0.15]} />
        <meshStandardMaterial
          color="#1a1a2e"
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.9}
          roughness={0.2}
          transparent
          opacity={0}
        />
      </mesh>
      <lineSegments ref={edgeRef} position={position} scale={scale}>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 2, 0.15)]} />
        <lineBasicMaterial color={color} transparent opacity={0.5} />
      </lineSegments>
    </group>
  )
}

/** Large monolith for the About section */
function AboutMonolith() {
  const meshRef = useRef<THREE.Mesh>(null)
  const progress = useScrollStore((s) => s.progress)

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime
    const gateProgress = getSectionProgress(progress, "gate")

    meshRef.current.position.y = 3 + Math.sin(time * 0.4) * 0.2
    meshRef.current.rotation.y = Math.sin(time * 0.15) * 0.05

    const material = meshRef.current.material as THREE.MeshStandardMaterial
    material.opacity = Math.min(0.9, gateProgress * 2)
  })

  return (
    <mesh ref={meshRef} position={[-3, 3, -2]} scale={[2.5, 3.5, 0.2]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#0d0d1a"
        emissive="#e8a020"
        emissiveIntensity={0.15}
        metalness={0.95}
        roughness={0.1}
        transparent
        opacity={0}
      />
    </mesh>
  )
}

const RING_COUNT = 8

export function FloatingMonoliths() {
  // A ring of monoliths around the boundary crossing.
  const monolithData = Array.from({ length: RING_COUNT }, (_, i) => {
    const angle = (i / RING_COUNT) * Math.PI * 2
    const radius = 5
    const y = -2
    return {
      position: [
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius,
      ] as [number, number, number],
      scale: [0.8, 1.2, 0.8] as [number, number, number],
      color: `hsl(${35 + i * 5}, 80%, ${55 + i * 3}%)`,
    }
  })

  return (
    <>
      {/* About section monolith */}
      <AboutMonolith />

      {/* Experience monolith ring */}
      {monolithData.map((data, i) => (
        <Monolith key={i} index={i} {...data} />
      ))}
    </>
  )
}
