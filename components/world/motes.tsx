"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { makeRng, seededRange } from "@/lib/prng"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { FLOOR_ACTIVE_MARGIN } from "@/lib/floors"

const TAU = Math.PI * 2
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

// Fine dust motes drifting in the low sun — the specks of pollen/dust that catch
// golden-hour light over a field. A cheap additive point cloud (rich tiers only —
// additive sprites are overdraw a software rasterizer shouldn't pay for), seeded
// so the drift is reproducible, allocation-free per frame, frozen under reduced
// motion and when the floor is off-screen.

function makeMoteTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const S = 32
  const c = document.createElement("canvas")
  c.width = c.height = S
  const ctx = c.getContext("2d")
  if (!ctx) return null
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, "rgba(255,246,222,1)")
  g.addColorStop(0.4, "rgba(255,232,180,0.5)")
  g.addColorStop(1, "rgba(255,232,180,0)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}

interface Drift {
  ax: number; ay: number; az: number
  px: number; py: number; pz: number
  sp: number
}

export function Motes({
  count,
  groundY,
  reduced,
}: {
  count: number
  groundY: number
  reduced: boolean
}) {
  const tex = useMemo(() => makeMoteTexture(), [])
  const matRef = useRef<THREE.PointsMaterial>(null)
  const data = useMemo(() => {
    const rng = makeRng("surface-motes")
    const base = new Float32Array(count * 3)
    const drift: Drift[] = []
    for (let i = 0; i < count; i++) {
      base[i * 3] = seededRange(rng, -11, 11)
      base[i * 3 + 1] = groundY + seededRange(rng, 0.25, 4.5)
      base[i * 3 + 2] = seededRange(rng, -14, 5)
      drift.push({
        ax: seededRange(rng, 0.2, 0.6),
        ay: seededRange(rng, 0.1, 0.35),
        az: seededRange(rng, 0.2, 0.6),
        px: seededRange(rng, 0, TAU),
        py: seededRange(rng, 0, TAU),
        pz: seededRange(rng, 0, TAU),
        sp: seededRange(rng, 0.1, 0.28),
      })
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3))
    return { geo, base, drift }
  }, [count, groundY])

  useFrame((state) => {
    // Fade out fast as the cab sinks below the meadow (so motes don't bleed into
    // the shaft) — always update opacity, even under reduced motion.
    const op = 0.7 * (1 - smoothstep(0.04, 0.09, useScrollStore.getState().progress))
    if (matRef.current) matRef.current.opacity = op
    if (op <= 0.001 || reduced) return
    if (Math.abs(state.camera.position.y - groundY) > FLOOR_ACTIVE_MARGIN) return
    const t = state.clock.elapsedTime
    const arr = data.geo.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      const d = data.drift[i]
      arr[i * 3] = data.base[i * 3] + Math.sin(t * d.sp + d.px) * d.ax
      arr[i * 3 + 1] = data.base[i * 3 + 1] + Math.sin(t * d.sp * 0.7 + d.py) * d.ay
      arr[i * 3 + 2] = data.base[i * 3 + 2] + Math.sin(t * d.sp * 1.3 + d.pz) * d.az
    }
    data.geo.attributes.position.needsUpdate = true
  })

  if (!tex) return null
  return (
    <points geometry={data.geo}>
      <pointsMaterial
        ref={matRef}
        size={0.1}
        map={tex}
        color="#ffe6b0"
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}
