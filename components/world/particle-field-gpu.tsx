import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng } from "@/lib/prng"
import { regionFactor } from "@/lib/world-config"

interface Props {
  count: number
}

export function GpuParticleField({ count }: Props) {
  const pointsRef = useRef<THREE.Points>(null)
  const progress = useScrollStore((s) => s.progress)
  const reduced = useReducedMotion()

  // Seeded velocities + a fixed "lane" (angle, radius) per particle, so a
  // particle that wraps returns to a deterministic lane instead of re-rolling.
  const { velocities, lanes } = useMemo(() => {
    const rng = makeRng("particles")
    const vel = new Float32Array(count * 3)
    const lane = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      vel[i * 3] = (rng() - 0.5) * 0.005
      vel[i * 3 + 1] = 0.005 + rng() * 0.015
      vel[i * 3 + 2] = (rng() - 0.5) * 0.005
      lane[i * 2] = rng() * Math.PI * 2
      lane[i * 2 + 1] = 1 + rng() * 12
    }
    return { velocities: vel, lanes: lane }
  }, [count])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const rng = makeRng("particles-height")
    for (let i = 0; i < count; i++) {
      const angle = lanes[i * 2]
      const radius = lanes[i * 2 + 1]
      const height = (rng() - 0.5) * 40
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = height
      pos[i * 3 + 2] = Math.sin(angle) * radius
    }
    const attr = new THREE.BufferAttribute(pos, 3)
    attr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute("position", attr)
    return geo
  }, [count, lanes])

  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  useFrame(() => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes
      .position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const ix = i * 3
      const iy = i * 3 + 1
      const iz = i * 3 + 2

      // Lateral wander only above the seam (probabilistic). Below, particles
      // fall on perfectly straight, deterministic lanes.
      const region = reduced ? 0 : regionFactor(arr[iy])
      arr[ix] += velocities[ix] * region
      arr[iy] += velocities[iy] * (1 + progress)
      arr[iz] += velocities[iz] * region

      if (arr[iy] > 20) {
        arr[iy] = -20
        const angle = lanes[i * 2]
        const radius = lanes[i * 2 + 1]
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
