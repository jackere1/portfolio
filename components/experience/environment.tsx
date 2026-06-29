"use client"

import { useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"

/**
 * The water. A dim ambient, a faint surface light from above, and a dive lamp
 * that rides with the capsule and lights the nearby medium. As you sink the fog
 * tightens and the light fades — pressure and dark build with depth.
 */
export function Environment() {
  const progress = useScrollStore((s) => s.progress)
  const { camera } = useThree()
  const lampRef = useRef<THREE.PointLight>(null)

  useFrame(() => {
    if (lampRef.current) {
      lampRef.current.position.set(
        camera.position.x,
        camera.position.y - 1,
        camera.position.z - 2
      )
    }
  })

  const p = progress
  const fogNear = 6 - p * 2
  const fogFar = 44 - p * 28
  const ambient = 0.14 * (1 - p * 0.5)
  const key = 0.42 * (1 - p * 0.45)

  return (
    <>
      <ambientLight intensity={ambient} color="#c8a050" />
      <directionalLight position={[5, 20, 5]} intensity={key} color="#e8b040" />
      <directionalLight position={[-5, -10, 5]} intensity={0.14} color="#4060c0" />

      {/* The dive lamp — rides just ahead of the capsule. */}
      <pointLight
        ref={lampRef}
        intensity={3.2}
        distance={16}
        decay={2}
        color="#e8a020"
      />

      <fog attach="fog" args={["#0a0a14", fogNear, fogFar]} />
    </>
  )
}
