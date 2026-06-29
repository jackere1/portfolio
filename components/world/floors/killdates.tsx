import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { makeRng, seededRange, seededDrift, clamp } from "@/lib/prng"
import type { FloorProps } from "@/lib/floors"

// One dated marker — a thin slab planted in the grid. Most stand upright (a bet
// still alive); a seeded third are toppled, lying flat on the floor (the ones
// killed on schedule). Dimensions/position carry a small seeded jitter so the
// rows read as a real, weathered field rather than a printed lattice.
interface Marker {
  x: number
  z: number
  w: number // slab width  (~0.2)
  h: number // slab height (1.0–1.6 standing)
  d: number // slab depth  (~0.1)
  toppled: boolean
  // resting yaw, so the field faces roughly +z but isn't dead-square
  yaw: number
  // direction a toppled slab fell (radians around y) and its lean
  fallDir: number
  // a rare cool-blue marker among the amber
  cool: boolean
  // seeded sway params (read once, never inside useFrame)
  swayAmp: number
  swayFreq: number
  phase: number
}

/**
 * Kill-dates — a disciplined graveyard of bets. Every project carries a date
 * written on it: the day agreed in advance to kill it if it hasn't earned its
 * life. The field is a loose grid of thin upright slabs, each crowned with a
 * faint amber cap — the date. Most stand; a seeded third lie toppled where they
 * were struck down on schedule. Somber, ordered, heavier than the rest of the
 * dive: the markers barely breathe.
 */
export function FloorKilldates({ yBottom }: FloorProps) {
  const standingRef = useRef<THREE.InstancedMesh>(null)
  const toppledRef = useRef<THREE.InstancedMesh>(null)
  const capRef = useRef<THREE.InstancedMesh>(null)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // The slabs stand ON the cell floor.
  const baseY = yBottom + 0.4

  const markers = useMemo<Marker[]>(() => {
    const rng = makeRng("floor-killdates")
    const out: Marker[] = []

    // A loose grid: 6 across x, 4 deep in z. Kept within the contract bounds
    // (x,z ∈ [-4,4], z ∈ [-4,1.5]) with seeded per-cell jitter so the rows
    // breathe — graves never sit on a perfect lattice.
    const cols = 6
    const rows = 4
    const xMin = -3.6
    const xMax = 3.6
    const zMin = -3.6
    const zMax = 1.0

    for (let r = 0; r < rows; r++) {
      const zBase = zMin + (r / (rows - 1)) * (zMax - zMin)
      for (let c = 0; c < cols; c++) {
        const xBase = xMin + (c / (cols - 1)) * (xMax - xMin)
        const x = clamp(xBase + seededDrift(rng, 0.28), -3.9, 3.9)
        const z = clamp(zBase + seededDrift(rng, 0.22), -3.9, 1.4)

        // ~1 in 3 toppled — struck down on schedule.
        const toppled = rng() < 0.34

        out.push({
          x,
          z,
          w: seededRange(rng, 0.18, 0.24),
          h: seededRange(rng, 1.0, 1.6),
          d: seededRange(rng, 0.08, 0.12),
          toppled,
          yaw: seededDrift(rng, 0.14),
          fallDir: seededRange(rng, 0, Math.PI * 2),
          cool: rng() < 0.08, // rare cool-blue marker
          swayAmp: seededRange(rng, 0.004, 0.012),
          swayFreq: seededRange(rng, 0.18, 0.34),
          phase: rng() * Math.PI * 2,
        })
      }
    }
    return out
  }, [])

  // Split into standing vs toppled so each instanced mesh has a clean count.
  const standing = useMemo(() => markers.filter((m) => !m.toppled), [markers])
  const toppled = useMemo(() => markers.filter((m) => m.toppled), [markers])

  // Per-instance tint for the standing slabs: mostly amber, a rare cool blue.
  // Vertex colors multiply the material base, so amber markers stay near (1,1,1)
  // and the material's amber/emissive carries them; cool markers are pushed blue.
  const standingColors = useMemo(() => {
    const arr = new Float32Array(standing.length * 3)
    const amber = new THREE.Color("#caa46a")
    const cool = new THREE.Color("#6f8ce0")
    for (let i = 0; i < standing.length; i++) {
      const col = standing[i].cool ? cool : amber
      arr[i * 3] = col.r
      arr[i * 3 + 1] = col.g
      arr[i * 3 + 2] = col.b
    }
    return arr
  }, [standing])

  const toppledColors = useMemo(() => {
    const arr = new Float32Array(toppled.length * 3)
    const amber = new THREE.Color("#9a8050")
    const cool = new THREE.Color("#56709c")
    for (let i = 0; i < toppled.length; i++) {
      const col = toppled[i].cool ? cool : amber
      arr[i * 3] = col.r
      arr[i * 3 + 1] = col.g
      arr[i * 3 + 2] = col.b
    }
    return arr
  }, [toppled])

  // The "date" caps glow brighter on standing slabs only — the bright top edge.
  const capColors = useMemo(() => {
    const arr = new Float32Array(standing.length * 3)
    const amber = new THREE.Color("#f0b452")
    const cool = new THREE.Color("#9fb8f0")
    for (let i = 0; i < standing.length; i++) {
      const col = standing[i].cool ? cool : amber
      arr[i * 3] = col.r
      arr[i * 3 + 1] = col.g
      arr[i * 3 + 2] = col.b
    }
    return arr
  }, [standing])

  // Toppled slabs are static; write their matrices once after mount.
  const writeToppled = (mesh: THREE.InstancedMesh) => {
    for (let i = 0; i < toppled.length; i++) {
      const m = toppled[i]
      // A fallen slab lies flat: tipped 90° in its fall direction, so its long
      // axis rests along the floor. Lift to half its (now horizontal) depth.
      dummy.position.set(m.x, baseY + m.d / 2, m.z)
      dummy.rotation.set(0, m.fallDir, Math.PI / 2)
      dummy.scale.set(m.w, m.h, m.d)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime

    // Standing slabs: planted, with only a near-imperceptible sway — the field
    // is solemn and still, the markers barely breathe.
    const sMesh = standingRef.current
    const cMesh = capRef.current
    if (sMesh) {
      for (let i = 0; i < standing.length; i++) {
        const m = standing[i]
        const sway = reduced
          ? 0
          : clamp(Math.sin(t * m.swayFreq + m.phase) * m.swayAmp, -0.02, 0.02)
        dummy.position.set(m.x, baseY + m.h / 2, m.z)
        dummy.rotation.set(0, m.yaw, sway)
        dummy.scale.set(m.w, m.h, m.d)
        dummy.updateMatrix()
        sMesh.setMatrixAt(i, dummy.matrix)

        // Cap sits at the slab top, riding the same sway. A thin bright slice —
        // the date written on the stone.
        if (cMesh) {
          const capH = 0.05
          // top of the slab, offset along the swayed up-axis
          const topY = baseY + m.h - capH / 2
          dummy.position.set(
            m.x + Math.sin(sway) * (m.h / 2),
            topY,
            m.z
          )
          dummy.rotation.set(0, m.yaw, sway)
          dummy.scale.set(m.w * 1.04, capH, m.d * 1.04)
          dummy.updateMatrix()
          cMesh.setMatrixAt(i, dummy.matrix)
        }
      }
      sMesh.instanceMatrix.needsUpdate = true
      if (cMesh) cMesh.instanceMatrix.needsUpdate = true
    }

    // Toppled slabs never move; write once when the mesh first appears.
    const tMesh = toppledRef.current
    if (tMesh && !tMesh.userData.written) {
      writeToppled(tMesh)
      tMesh.userData.written = true
    }
  })

  return (
    <group>
      {/* Standing markers — upright dark amber-edged slabs. */}
      <instancedMesh
        ref={standingRef}
        args={[undefined, undefined, standing.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[standingColors, 3]}
          />
        </boxGeometry>
        <meshStandardMaterial
          vertexColors
          color="#15100a"
          emissive="#e8a020"
          emissiveIntensity={0.16}
          metalness={0.6}
          roughness={0.62}
        />
      </instancedMesh>

      {/* The bright "date" caps crowning each standing slab. */}
      <instancedMesh
        ref={capRef}
        args={[undefined, undefined, standing.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[capColors, 3]}
          />
        </boxGeometry>
        <meshStandardMaterial
          vertexColors
          color="#1a1208"
          emissive="#e8a020"
          emissiveIntensity={0.9}
          metalness={0.6}
          roughness={0.4}
        />
      </instancedMesh>

      {/* Toppled markers — struck down on schedule, lying flat and dim. */}
      <instancedMesh
        ref={toppledRef}
        args={[undefined, undefined, toppled.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[toppledColors, 3]}
          />
        </boxGeometry>
        <meshStandardMaterial
          vertexColors
          color="#120d07"
          emissive="#e8a020"
          emissiveIntensity={0.08}
          metalness={0.55}
          roughness={0.7}
        />
      </instancedMesh>
    </group>
  )
}
