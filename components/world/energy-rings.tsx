import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"

interface RingProps {
  radius: number
  speed: number
  yOffset: number
  tilt: [number, number, number]
  color: string
}

function EnergyRing({ radius, speed, yOffset, tilt, color }: RingProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const progress = useScrollStore((s) => s.progress)

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime

    const dynamicSpeed = speed * (1 + progress * 2)
    meshRef.current.rotation.z = time * dynamicSpeed
    meshRef.current.rotation.x = tilt[0] + Math.sin(time * 0.3) * 0.1
    meshRef.current.rotation.y = tilt[1] + time * dynamicSpeed * 0.3
  })

  return (
    <group position={[0, yOffset, 0]}>
      <mesh ref={meshRef}>
        <torusGeometry args={[radius, 0.025, 8, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </group>
  )
}

export function EnergyRings() {
  return (
    <>
      <EnergyRing
        radius={3}
        speed={0.15}
        yOffset={2}
        tilt={[Math.PI / 4, 0, 0]}
        color="#e8a020"
      />
      <EnergyRing
        radius={4}
        speed={-0.1}
        yOffset={0}
        tilt={[Math.PI / 3, Math.PI / 6, 0]}
        color="#c87818"
      />
      <EnergyRing
        radius={5}
        speed={0.07}
        yOffset={-2}
        tilt={[Math.PI / 5, -Math.PI / 4, 0]}
        color="#e8b040"
      />
    </>
  )
}
