"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { SUN_DIR } from "@/lib/surface-light"

// A defined, glowing sun disc — a warm radial sprite billboarded at the sun's
// direction, riding the camera so it holds its place in the sky. Bright enough for
// the bloom pass to bloom it into a soft halo. Additive over the sky; occluded by
// the grass in the foreground (depth-tested), so it reads as the light source the
// whole scene is lit by, not a decal.

function makeSunTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const S = 160
  const c = document.createElement("canvas")
  c.width = c.height = S
  const ctx = c.getContext("2d")
  if (!ctx) return null
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, "rgba(255,251,240,1)")
  g.addColorStop(0.1, "rgba(255,243,208,0.98)")
  g.addColorStop(0.22, "rgba(255,215,150,0.7)")
  g.addColorStop(0.45, "rgba(255,185,115,0.25)")
  g.addColorStop(0.72, "rgba(255,168,100,0.07)")
  g.addColorStop(1, "rgba(255,160,95,0)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

const DIST = 72 // in front of the mist so the disc reads clearly

export function Sun() {
  const { camera } = useThree()
  const ref = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const tex = useMemo(() => makeSunTexture(), [])
  const dir = useMemo(() => SUN_DIR.clone(), [])

  useFrame(() => {
    const m = ref.current
    if (!m) return
    m.position.set(
      camera.position.x + dir.x * DIST,
      camera.position.y + dir.y * DIST,
      camera.position.z + dir.z * DIST
    )
    m.quaternion.copy(camera.quaternion) // billboard
    if (matRef.current) {
      matRef.current.opacity =
        1 - smoothstep(0.05, 0.11, useScrollStore.getState().progress)
    }
  })

  if (!tex) return null
  return (
    <mesh ref={ref} renderOrder={1}>
      <planeGeometry args={[26, 26]} />
      <meshBasicMaterial
        ref={matRef}
        map={tex}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  )
}
