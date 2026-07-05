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
 * Oath — the promise against self-deception. Every bet carries a date agreed in
 * advance: the day it is called dead if it hasn't earned its life. The field is
 * a loose grid of thin upright slabs, each crowned with a faint amber cap — the
 * date. Most stand; a seeded third lie toppled where they were called on
 * schedule. Somber, ordered, heavier than the rest of the dive: the markers
 * barely breathe.
 */
// A slab in the far rows, past the reach of the lamp. Same rules, less light.
interface FarMarker {
  x: number
  z: number
  w: number
  h: number
  d: number
  toppled: boolean
  yaw: number
  fallDir: number
}

export function FloorOath({ yBottom }: FloorProps) {
  const standingRef = useRef<THREE.InstancedMesh>(null)
  const toppledRef = useRef<THREE.InstancedMesh>(null)
  const capRef = useRef<THREE.InstancedMesh>(null)
  const farRef = useRef<THREE.InstancedMesh>(null)
  const farCapRef = useRef<THREE.InstancedMesh>(null)
  const mistRefs = useRef<(THREE.Mesh | null)[]>([])
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // The slabs stand ON the cell floor.
  const baseY = yBottom + 0.4

  const markers = useMemo<Marker[]>(() => {
    const rng = makeRng("floor-oath")
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

  // Far rows — three extra ranks receding to the back wall, dimmer and slightly
  // smaller: the field reads deeper than the light reaches. Same seeded 1-in-3
  // toppled rule; their own seed so the near field never re-rolls.
  const far = useMemo(() => {
    const rng = makeRng("floor-oath-far")
    const all: FarMarker[] = []
    const cols = 6
    const zRows = [-3.55, -3.75, -3.95]

    for (let r = 0; r < zRows.length; r++) {
      // half-cell stagger per rank so far slabs peek between the near ones
      const rowShift = r % 2 === 0 ? -0.3 : 0.3
      for (let c = 0; c < cols; c++) {
        const xBase = -3.5 + (c / (cols - 1)) * 7 + rowShift
        all.push({
          x: clamp(xBase + seededDrift(rng, 0.3), -3.9, 3.9),
          z: clamp(zRows[r] + seededDrift(rng, 0.05), -4, -3.45),
          w: seededRange(rng, 0.13, 0.19),
          h: seededRange(rng, 0.75, 1.25),
          d: seededRange(rng, 0.06, 0.1),
          toppled: rng() < 0.34,
          yaw: seededDrift(rng, 0.16),
          fallDir: seededRange(rng, 0, Math.PI * 2),
        })
      }
    }

    // Exactly one standing slab in the far rows carries the cool cap.
    const list = all.filter((m) => !m.toppled)
    const coolPos = list.length > 0 ? Math.floor(rng() * list.length) : -1
    return { all, standing: list, coolPos }
  }, [])

  const farColors = useMemo(() => {
    const arr = new Float32Array(far.all.length * 3)
    const standing = new THREE.Color("#8a744c")
    const toppled = new THREE.Color("#5e4e34")
    for (let i = 0; i < far.all.length; i++) {
      const col = far.all[i].toppled ? toppled : standing
      arr[i * 3] = col.r
      arr[i * 3 + 1] = col.g
      arr[i * 3 + 2] = col.b
    }
    return arr
  }, [far])

  // Ground mist — two large thin planes lying just above the floor, a very dark
  // warm veil (normal blending, near-invisible) with an extremely slow seeded
  // lateral drift. Its own seed; every amplitude clamped.
  const mists = useMemo(() => {
    const rng = makeRng("floor-oath-mist")
    const spec = [
      { lift: 0.15, w: 7.2, dpt: 4.6, opacity: 0.06, color: "#3a2a14" },
      { lift: 0.3, w: 6.2, dpt: 3.6, opacity: 0.045, color: "#2e2010" },
    ]
    return spec.map((s) => ({
      ...s,
      y: baseY + s.lift,
      zBase: seededRange(rng, -1.4, -1.0),
      yaw: seededDrift(rng, 0.08),
      ampX: clamp(seededRange(rng, 0.3, 0.4), 0, 0.4),
      ampZ: clamp(seededRange(rng, 0.08, 0.15), 0, 0.15),
      freqX: (Math.PI * 2) / seededRange(rng, 40, 60), // ~40–60s period
      freqZ: (Math.PI * 2) / seededRange(rng, 44, 60),
      phaseX: rng() * Math.PI * 2,
      phaseZ: rng() * Math.PI * 2,
    }))
  }, [baseY])

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

  // The far rows never move at all — locked, past even the barely-breathing
  // near field. Written once, like the toppled slabs.
  const writeFar = (mesh: THREE.InstancedMesh) => {
    for (let i = 0; i < far.all.length; i++) {
      const m = far.all[i]
      if (m.toppled) {
        dummy.position.set(m.x, baseY + m.d / 2, m.z)
        dummy.rotation.set(0, m.fallDir, Math.PI / 2)
      } else {
        dummy.position.set(m.x, baseY + m.h / 2, m.z)
        dummy.rotation.set(0, m.yaw, 0)
      }
      dummy.scale.set(m.w, m.h, m.d)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  const writeFarCaps = (mesh: THREE.InstancedMesh) => {
    const capH = 0.04
    for (let i = 0; i < far.standing.length; i++) {
      const m = far.standing[i]
      if (i === far.coolPos) {
        // The cool cap renders as its own mesh; collapse the amber one here.
        dummy.position.set(m.x, baseY, m.z)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(0, 0, 0)
      } else {
        dummy.position.set(m.x, baseY + m.h - capH / 2, m.z)
        dummy.rotation.set(0, m.yaw, 0)
        dummy.scale.set(m.w * 1.04, capH, m.d * 1.04)
      }
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

    // Far rows and their caps are fully static; write once as well.
    const fMesh = farRef.current
    if (fMesh && !fMesh.userData.written) {
      writeFar(fMesh)
      fMesh.userData.written = true
    }
    const fcMesh = farCapRef.current
    if (fcMesh && !fcMesh.userData.written) {
      writeFarCaps(fcMesh)
      fcMesh.userData.written = true
    }

    // Ground mist: extremely slow lateral drift, hard-clamped, frozen under
    // reduced motion. It never acknowledges the cursor — nothing here does.
    for (let i = 0; i < mists.length; i++) {
      const mesh = mistRefs.current[i]
      if (!mesh) continue
      const m = mists[i]
      const dx = reduced
        ? 0
        : clamp(Math.sin(t * m.freqX + m.phaseX) * m.ampX, -0.4, 0.4)
      const dz = reduced
        ? 0
        : clamp(Math.sin(t * m.freqZ + m.phaseZ) * m.ampZ, -0.15, 0.15)
      mesh.position.set(dx, m.y, m.zBase + dz)
    }
  })

  const coolFar = far.coolPos >= 0 ? far.standing[far.coolPos] : null

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

      {/* Far rows — the field continues past the reach of the lamp. */}
      <instancedMesh
        ref={farRef}
        args={[undefined, undefined, far.all.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[farColors, 3]}
          />
        </boxGeometry>
        <meshStandardMaterial
          vertexColors
          color="#0f0b06"
          emissive="#e8a020"
          emissiveIntensity={0.06}
          metalness={0.55}
          roughness={0.75}
        />
      </instancedMesh>

      {/* Dim date caps on the far standing slabs. */}
      <instancedMesh
        ref={farCapRef}
        args={[undefined, undefined, far.standing.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#151009"
          emissive="#e8a020"
          emissiveIntensity={0.35}
          metalness={0.6}
          roughness={0.4}
        />
      </instancedMesh>

      {/* One date in the far dark is written in cool blue. */}
      {coolFar && (
        <mesh
          position={[coolFar.x, baseY + coolFar.h - 0.02, coolFar.z]}
          rotation={[0, coolFar.yaw, 0]}
        >
          <boxGeometry args={[coolFar.w * 1.04, 0.04, coolFar.d * 1.04]} />
          <meshStandardMaterial
            color="#0a0e18"
            emissive="#4060c0"
            emissiveIntensity={0.85}
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      )}

      {/* Ground mist — a dark warm veil pooled over the floor. */}
      {mists.map((m, i) => (
        <mesh
          key={`mist-${i}`}
          ref={(el) => {
            mistRefs.current[i] = el
          }}
          position={[0, m.y, m.zBase]}
          rotation={[-Math.PI / 2, 0, m.yaw]}
        >
          <planeGeometry args={[m.w, m.dpt]} />
          <meshBasicMaterial
            color={m.color}
            transparent
            opacity={m.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
