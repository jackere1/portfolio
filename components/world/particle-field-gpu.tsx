import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"

interface Props {
  count: number
}

export function GpuParticleField({ count }: Props) {
  const pointsRef = useRef<THREE.Points>(null)
  const progress = useScrollStore((s) => s.progress)

  const velocities = useMemo(() => {
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      vel[i * 3] = (Math.random() - 0.5) * 0.005
      vel[i * 3 + 1] = 0.005 + Math.random() * 0.015
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005
    }
    return vel
  }, [count])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 1 + Math.random() * 12
      const height = (Math.random() - 0.5) * 40
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = height
      pos[i * 3 + 2] = Math.sin(angle) * radius
    }
    const attr = new THREE.BufferAttribute(pos, 3)
    attr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute("position", attr)
    return geo
  }, [count])

  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  useFrame(() => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const ix = i * 3
      const iy = i * 3 + 1
      const iz = i * 3 + 2

      arr[ix] += velocities[ix]
      arr[iy] += velocities[iy] * (1 + progress)
      arr[iz] += velocities[iz]

      if (arr[iy] > 20) {
        arr[iy] = -20
        const angle = Math.random() * Math.PI * 2
        const radius = 1 + Math.random() * 12
        arr[ix] = Math.cos(angle) * radius
        arr[iz] = Math.sin(angle) * radius
      }
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.05}
        color="#e8a020"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
