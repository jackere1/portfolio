"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng, seededRange, clamp } from "@/lib/prng"
import { PbrMaterial } from "@/lib/textures"
import { FLOOR_ACTIVE_MARGIN, type FloorProps } from "@/lib/floors"

interface Block {
  x: number
  z: number
  w: number
  d: number
  h: number
  lit: boolean
  cool: boolean
}

// The benchmark's acknowledgment — the one exact response this floor gives.
// Pointer over the disc: an instant step to full, then a fast fade; it cannot
// fire again until the pointer has left. The city itself never reacts.
const MARK_BASE = 0.9
const MARK_PULSE = 1.6
const MARK_TAU = 0.25
const MARK_RADIUS = 0.5
const MARK_Z = 2.2

// Smoke rises this far from a ger's crown before it thins to nothing.
const SMOKE_RISE = 1.2
const SMOKE_PER_GER = 6
const SMOKE_GERS = 4

interface Wisp {
  gx: number
  gy: number
  gz: number
  phase: number
  speed: number
  curl: number
  curlPhase: number
  drift: number
  size: number
}

interface Twinkle {
  block: number
  period: number
  phase: number
}

/**
 * Place — the basement foundation. Raw concrete bedrock, structural and honest,
 * the part not permitted to lie; the colophon opens from here. On the slab sits
 * Ulaanbaatar at night — a low silhouette of blocks and ger roofs, the city the
 * whole descent rests on, the work that only matters here. Smoke climbs from a
 * few ger crowns; windows go dark and light again across the night. The city
 * never notices the cursor — only the survey mark answers it, once, exactly.
 */
export function FloorPlace({ yTop, yBottom, yCenter }: FloorProps) {
  const reduced = useReducedMotion()
  const smokeRef = useRef<THREE.InstancedMesh>(null)
  const markMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const twinkleRefs = useRef<(THREE.Mesh | null)[]>([])
  const twinkleState = useRef<boolean[]>([])
  const overMark = useRef(false)
  const pulse = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const floorY = yBottom
  const ceilY = yTop
  const colH = ceilY - floorY

  // Pointer projection scratch — preallocated, reused every frame.
  const markPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), -MARK_Z),
    []
  )
  const markPoint = useMemo(() => new THREE.Vector3(), [])

  const blocks = useMemo<Block[]>(() => {
    const rng = makeRng("floor-place")
    return Array.from({ length: 40 }, () => ({
      x: seededRange(rng, -3.6, 3.6),
      z: seededRange(rng, -3.8, 0.6),
      w: seededRange(rng, 0.26, 0.7),
      d: seededRange(rng, 0.26, 0.7),
      h: seededRange(rng, 0.4, 2.1),
      lit: rng() > 0.45,
      cool: rng() > 0.72,
    }))
  }, [])

  const gers = useMemo(() => {
    const rng = makeRng("floor-place-ger")
    return Array.from({ length: 9 }, () => ({
      x: seededRange(rng, -3.6, 3.6),
      z: seededRange(rng, -0.2, 1.4),
      r: seededRange(rng, 0.2, 0.36),
    }))
  }, [])

  const cityBase = floorY + 0.02

  // Smoke — thin wisps over a few stoves. The gers nearest the city's right
  // half carry it (the level text holds the left), each wisp cycling root →
  // thin air on its own seeded pace. Every drift is clamped.
  const wisps = useMemo<Wisp[]>(() => {
    const rng = makeRng("floor-place-smoke")
    const smoking = [...gers].sort((a, b) => b.x - a.x).slice(0, SMOKE_GERS)
    const out: Wisp[] = []
    for (const g of smoking) {
      for (let i = 0; i < SMOKE_PER_GER; i++) {
        out.push({
          gx: g.x,
          gy: cityBase + g.r * 0.75,
          gz: g.z,
          phase: seededRange(rng, 0, 1),
          speed: seededRange(rng, 0.028, 0.05),
          curl: seededRange(rng, 0.08, 0.18),
          curlPhase: seededRange(rng, 0, Math.PI * 2),
          drift: seededRange(rng, -0.1, 0.1),
          size: seededRange(rng, 0.1, 0.17),
        })
      }
    }
    return out
  }, [gers, cityBase])

  // A soft round falloff so a wisp is a breath, not a quad.
  const smokeTex = useMemo(() => {
    if (typeof document === "undefined") return null
    const c = document.createElement("canvas")
    c.width = 64
    c.height = 64
    const ctx = c.getContext("2d")
    if (!ctx) return null
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
    g.addColorStop(0, "rgba(196, 176, 144, 0.5)")
    g.addColorStop(0.6, "rgba(180, 160, 130, 0.18)")
    g.addColorStop(1, "rgba(180, 160, 130, 0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])

  // Windows that go dark and light again — a seeded dozen of the lit blocks,
  // each on its own minutes-long cycle. State flips are the only writes.
  const twinkles = useMemo<Twinkle[]>(() => {
    const rng = makeRng("floor-place-twinkle")
    const litIdx = blocks.map((b, i) => (b.lit ? i : -1)).filter((i) => i >= 0)
    const picked = new Set<number>()
    while (picked.size < Math.min(10, litIdx.length)) {
      picked.add(litIdx[Math.floor(rng() * litIdx.length)])
    }
    return [...picked].map((block) => ({
      block,
      period: seededRange(rng, 60, 180),
      phase: seededRange(rng, 0, 180),
    }))
  }, [blocks])
  const twinkleFor = useMemo(() => {
    const m = new Map<number, number>()
    twinkles.forEach((tw, i) => m.set(tw.block, i))
    return m
  }, [twinkles])

  // Write each wisp's resting pose once (and hold it there under reduced motion).
  useEffect(() => {
    if (!smokeRef.current) return
    for (let i = 0; i < wisps.length; i++) {
      const w = wisps[i]
      dummy.position.set(w.gx, w.gy + w.phase * SMOKE_RISE, w.gz)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(w.size)
      dummy.updateMatrix()
      smokeRef.current.setMatrixAt(i, dummy.matrix)
    }
    smokeRef.current.instanceMatrix.needsUpdate = true
  }, [wisps, dummy])

  useFrame((state, delta) => {
    if (Math.abs(state.camera.position.y - yCenter) > FLOOR_ACTIVE_MARGIN) return
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.1)

    // The survey mark's single exact answer. Below the seam nothing eases:
    // the pulse steps to full the frame the pointer crosses onto the disc.
    if (!reduced) {
      state.raycaster.setFromCamera(state.pointer, state.camera)
      const hit = state.raycaster.ray.intersectPlane(markPlane, markPoint)
      const inside =
        hit !== null &&
        markPoint.y >= yBottom &&
        markPoint.y <= yTop &&
        Math.hypot(markPoint.x, markPoint.y - (floorY + 0.03)) < MARK_RADIUS
      if (inside && !overMark.current) pulse.current = 1
      overMark.current = inside
      pulse.current *= Math.exp(-dt / MARK_TAU)
    } else {
      pulse.current = 0
      overMark.current = false
    }
    if (markMatRef.current) {
      markMatRef.current.emissiveIntensity =
        MARK_BASE + pulse.current * MARK_PULSE
    }

    // Smoke climbs, curls a clamped hair sideways, thins to nothing, returns.
    if (smokeRef.current && !reduced) {
      for (let i = 0; i < wisps.length; i++) {
        const w = wisps[i]
        const u = (w.phase + t * w.speed) % 1
        const sway = clamp(
          Math.sin(u * Math.PI * 2 + w.curlPhase) * w.curl + w.drift * u,
          -0.3,
          0.3
        )
        const fade = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25
        dummy.position.set(w.gx + sway, w.gy + u * SMOKE_RISE, w.gz)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.setScalar(w.size * (0.6 + u * 0.9) * Math.max(fade, 0.001))
        dummy.updateMatrix()
        smokeRef.current.setMatrixAt(i, dummy.matrix)
      }
      smokeRef.current.instanceMatrix.needsUpdate = true
    }

    // Window cycles — visibility flips only on the frame a state changes.
    // Under reduced motion the night holds still with every window lit.
    for (let i = 0; i < twinkles.length; i++) {
      const tw = twinkles[i]
      const on = reduced || ((t + tw.phase) % tw.period) / tw.period < 0.72
      if (twinkleState.current[i] !== on) {
        twinkleState.current[i] = on
        const mesh = twinkleRefs.current[i]
        if (mesh) mesh.visible = on
      }
    }
  })

  return (
    <group>
      {/* The concrete foundation slab — the hero surface. */}
      <mesh position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <PbrMaterial
          name="concrete-foundation"
          repeat={[3, 3]}
          anisotropy={8}
          flatColor="#3a3a3e"
          flatRoughness={0.95}
        />
      </mesh>

      {/* Structural columns — poured concrete, floor to ceiling. */}
      {(
        [
          [-3.6, -3.6],
          [3.6, -3.6],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={`col${i}`} position={[x, floorY + colH / 2, z]}>
          <boxGeometry args={[0.55, colH, 0.55]} />
          <PbrMaterial
            name="concrete-foundation"
            repeat={[1, Math.max(1, Math.round(colH / 3))]}
            flatColor="#35353a"
            flatRoughness={0.95}
          />
        </mesh>
      ))}

      {/* The city on the bedrock — blocks with scattered window lights. */}
      {blocks.map((b, i) => (
        <group key={`b${i}`} position={[b.x, cityBase + b.h / 2, b.z]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              color="#0e0a06"
              emissive="#e8a020"
              emissiveIntensity={b.lit ? 0.16 : 0.05}
              metalness={0.4}
              roughness={0.75}
            />
          </mesh>
          {b.lit && (
            <mesh
              position={[0, b.h * 0.1, b.d / 2 + 0.002]}
              ref={
                twinkleFor.has(i)
                  ? (el: THREE.Mesh | null) => {
                      twinkleRefs.current[twinkleFor.get(i) as number] = el
                    }
                  : undefined
              }
            >
              <planeGeometry args={[b.w * 0.5, 0.12]} />
              <meshBasicMaterial
                color={b.cool ? "#9fb8f0" : "#f0b452"}
                transparent
                opacity={0.85}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Ger roofs — low domes among the blocks. */}
      {gers.map((g, i) => (
        <mesh key={`g${i}`} position={[g.x, cityBase + g.r * 0.4, g.z]}>
          <coneGeometry args={[g.r, g.r * 0.7, 8]} />
          <meshStandardMaterial
            color="#15100a"
            emissive="#e8a020"
            emissiveIntensity={0.1}
            metalness={0.3}
            roughness={0.85}
          />
        </mesh>
      ))}

      {/* Stove smoke — thin seeded wisps over a few ger crowns. */}
      {smokeTex !== null && wisps.length > 0 && (
        <instancedMesh
          ref={smokeRef}
          args={[undefined, undefined, wisps.length]}
          frustumCulled={false}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={smokeTex}
            color="#8a7a5c"
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </instancedMesh>
      )}

      {/* The survey benchmark — the immovable mark on bedrock, front and centre.
          The exact coordinate is stated in the colophon; here it is only the disc. */}
      <group position={[0, floorY + 0.03, 2.2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.05, 32]} />
          <meshStandardMaterial
            color="#b9892f"
            emissive="#e8a020"
            emissiveIntensity={0.12}
            metalness={0.9}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.34, 0.02, 8, 32]} />
          <meshStandardMaterial color="#e8a020" emissive="#e8a020" emissiveIntensity={0.5} />
        </mesh>
        {/* The mark itself — cool blue, the boundary note. It answers the
            pointer once, exactly, and the city around it never does. */}
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial
            ref={markMatRef}
            color="#4060c0"
            emissive="#4060c0"
            emissiveIntensity={MARK_BASE}
          />
        </mesh>
      </group>
    </group>
  )
}
