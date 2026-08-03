"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { makeRng, seededDrift, seededRange } from "@/lib/prng"
import { journey } from "@/hooks/use-journey"
import { createSunState, writeSunState } from "@/lib/sun-arc"
import { heightAt } from "@/lib/heightfield"
import {
  CORRAL,
  GER_RADIUS,
  GER_ROOF_PITCH_DEG,
  GER_WALL_HEIGHT,
} from "@/lib/world"

// The working camp.
//
// One lone pristine ger is a postcard. What makes it a home is the clutter: the
// fuel, the water, the milk cans, the corral, the panel on its stand. And none
// of it is a compromise on authenticity — 70 to 90% of herder households have a
// solar panel, and leaving it out to keep the scene "timeless" is the
// romanticizing-tourist error.
//
// The spine sits EAST, because that is the women's side, where water, milk,
// fuel and cooking gear actually live. The tack sits west.

const ROOF_TAN = Math.tan((GER_ROOF_PITCH_DEG * Math.PI) / 180)

/** Ground the object on the heightfield; inside the ger the floor is flat. */
function groundY(x: number, z: number): number {
  return Math.hypot(x, z) < GER_RADIUS - 0.15 ? 0 : heightAt(x, z)
}

function place(x: number, z: number, lift = 0): [number, number, number] {
  return [x, groundY(x, z) + lift, z]
}

// --- argal: the dried dung fuel stack ---------------------------------------
// The hearth's supply chain, made visible. Its presence quietly explains the
// fire and the smoke the whole journey orbits.
function ArgalStack() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const matrices = useMemo(() => {
    const rng = makeRng("camp-argal")
    const out: THREE.Matrix4[] = []
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    // A low wall of stacked discs, roughly a metre and a half long.
    for (let row = 0; row < 7; row++) {
      const y = 0.055 + row * 0.085
      const perRow = 9 - Math.floor(row / 2)
      for (let i = 0; i < perRow; i++) {
        const t = (i / Math.max(1, perRow - 1)) * 2 - 1
        p.set(
          4.75 + seededDrift(rng, 0.06),
          y,
          -1.75 + t * 0.72 + seededDrift(rng, 0.05)
        )
        e.set(
          seededDrift(rng, 0.35),
          seededRange(rng, 0, Math.PI * 2),
          seededDrift(rng, 0.3)
        )
        q.setFromEuler(e)
        const r = seededRange(rng, 0.85, 1.2)
        s.set(r, seededRange(rng, 0.7, 1.05), r)
        out.push(new THREE.Matrix4().compose(p, q, s))
      }
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    matrices.forEach((mat, i) => m.setMatrixAt(i, mat))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [matrices])

  const geo = useMemo(
    () => new THREE.CylinderGeometry(0.11, 0.115, 0.055, 9),
    []
  )

  return (
    <group position={place(0, 0)}>
      <instancedMesh
        ref={ref}
        args={[geo, undefined, matrices.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#4a3b2a" roughness={0.98} metalness={0} />
      </instancedMesh>
    </group>
  )
}

// --- the solar panel --------------------------------------------------------
function SolarPanel() {
  const glassRef = useRef<THREE.MeshStandardMaterial>(null)
  const sun = useMemo(() => createSunState(), [])

  useFrame(() => {
    writeSunState(sun, journey.t)
    const m = glassRef.current
    if (!m) return
    // The stop-04 beat: the panel is still angled at a sun that has gone, and
    // its glass keeps the last warm light in the sky like a framed photograph
    // while everything around it has already turned blue. Without an
    // environment map this stands in for the reflection — which is honest
    // enough, since a reflection is exactly what it is.
    const hold = Math.max(
      0,
      Math.min(1, (sun.elevationDeg + 9) / 11)
    )
    m.emissive.setRGB(
      sun.fogColor.r * 1.5,
      sun.fogColor.g * 1.15,
      sun.fogColor.b * 0.95
    )
    m.emissiveIntensity = hold * 0.85
  })

  const [px, py, pz] = place(4.2, -0.35)

  return (
    <group position={[px, py, pz]} rotation={[0, -0.35, 0]}>
      {/* A-frame stand, facing south at a working tilt. */}
      {[-0.34, 0.34].map((x) => (
        <mesh key={x} position={[x, 0.24, -0.16]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.035, 0.56, 0.035]} />
          <meshStandardMaterial color="#5a5348" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0.02]} rotation={[-0.62, 0, 0]} castShadow>
        <boxGeometry args={[0.82, 0.545, 0.028]} />
        <meshStandardMaterial color="#3a3d44" roughness={0.5} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.428, 0.036]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[0.76, 0.5, 0.006]} />
        <meshStandardMaterial
          ref={glassRef}
          color="#0d1420"
          roughness={0.18}
          metalness={0.15}
          emissiveIntensity={0}
        />
      </mesh>
      {/* The cable, running down and away under the khayaa. */}
      <mesh position={[-0.2, 0.02, 0.5]} rotation={[Math.PI / 2, 0, 0.5]}>
        <cylinderGeometry args={[0.011, 0.011, 2.6, 5]} />
        <meshStandardMaterial color="#15161a" roughness={0.9} />
      </mesh>
    </group>
  )
}

// --- water, milk, washing ---------------------------------------------------
function Vessels() {
  const rng = useMemo(() => makeRng("camp-vessels"), [])
  const cans = useMemo(() => {
    const out: { p: [number, number, number]; r: number }[] = []
    for (let i = 0; i < 3; i++) {
      const x = 3.15 + seededDrift(rng, 0.22)
      const z = 1.25 + i * 0.34 + seededDrift(rng, 0.12)
      out.push({ p: place(x, z, 0.145), r: seededRange(rng, 0, Math.PI) })
    }
    return out
  }, [rng])

  const milk = useMemo(() => {
    const out: { p: [number, number, number]; r: number }[] = []
    for (let i = 0; i < 2; i++) {
      const x = 4.0 + i * 0.42 + seededDrift(rng, 0.1)
      const z = 0.15 + seededDrift(rng, 0.18)
      out.push({ p: place(x, z, 0.23), r: seededRange(rng, 0, Math.PI) })
    }
    return out
  }, [rng])

  return (
    <>
      {/* The blue HDPE jerrycan is the single most ubiquitous object of steppe
          life, and its slightly translucent plastic is a distinctive read. */}
      {cans.map((c, i) => (
        <mesh key={i} position={c.p} rotation={[0, c.r, 0]} castShadow>
          <boxGeometry args={[0.2, 0.29, 0.16]} />
          <meshStandardMaterial
            color="#1c4f8a"
            roughness={0.42}
            metalness={0}
          />
        </mesh>
      ))}
      {milk.map((c, i) => (
        <mesh key={i} position={c.p} rotation={[0, c.r, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.17, 0.46, 12]} />
          <meshStandardMaterial
            color="#8e9095"
            roughness={0.44}
            metalness={0.72}
          />
        </mesh>
      ))}
      {/* Enamel basin, upturned to drain. */}
      <mesh position={place(3.5, 2.15, 0.055)} rotation={[Math.PI, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.19, 0.11, 16]} />
        <meshStandardMaterial color="#9a9a93" roughness={0.55} metalness={0.25} />
      </mesh>
    </>
  )
}

// --- aaruul drying on the roof ----------------------------------------------
function AaruulTray() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const matrices = useMemo(() => {
    const rng = makeRng("camp-aaruul")
    const out: THREE.Matrix4[] = []
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    for (let i = 0; i < 34; i++) {
      p.set(seededDrift(rng, 0.24), 0.014, seededDrift(rng, 0.17))
      e.set(0, seededRange(rng, 0, Math.PI), 0)
      q.setFromEuler(e)
      const r = seededRange(rng, 0.7, 1.25)
      s.set(r, seededRange(rng, 0.5, 0.9), r)
      out.push(new THREE.Matrix4().compose(p, q, s))
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    matrices.forEach((mat, i) => m.setMatrixAt(i, mat))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [matrices])

  const curd = useMemo(() => new THREE.BoxGeometry(0.05, 0.02, 0.05), [])

  // On the south-east roof slope, right where stop 05 puts the camera under it.
  const r = 1.85
  const bearing = (152 * Math.PI) / 180
  const x = Math.sin(bearing) * r
  const z = Math.cos(bearing) * r
  const y = GER_WALL_HEIGHT + (GER_RADIUS - r) * ROOF_TAN

  return (
    <group position={[x, y + 0.02, z]} rotation={[-0.35, -bearing, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.02, 0.44]} />
        <meshStandardMaterial color="#6d5f4a" roughness={0.92} />
      </mesh>
      <instancedMesh ref={ref} args={[curd, undefined, matrices.length]} castShadow>
        {/* Not white — felt-bone is the ceiling, here as everywhere. */}
        <meshStandardMaterial color="#b9b3a2" roughness={0.85} />
      </instancedMesh>
    </group>
  )
}

// --- the uyaa rail and the tack, on the men's side --------------------------
function Uyaa() {
  return (
    <group>
      {[-0.9, 0.9].map((dz) => (
        <mesh key={dz} position={place(-4.5, dz, 0.55)} castShadow>
          <cylinderGeometry args={[0.055, 0.065, 1.1, 8]} />
          <meshStandardMaterial color="#5b4b39" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={place(-4.5, 0, 1.02)} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.9, 8]} />
        <meshStandardMaterial color="#6a5842" roughness={0.88} />
      </mesh>
      {/* The saddle carries the camp's only metallic glints, which the
          firelight finds later through the open door. */}
      <group position={place(-4.5, 0.15, 1.16)} rotation={[0, 0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.16, 0.46]} />
          <meshStandardMaterial color="#6b4a2c" roughness={0.62} />
        </mesh>
        {[-0.12, 0.12].map((dz) => (
          <mesh key={dz} position={[0, 0.11, dz]} castShadow>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial
              color="#b08b3e"
              roughness={0.3}
              metalness={0.85}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// --- the khashaa: the only fence in the world -------------------------------
// Crookedness IS the material truth here: every post leans differently. It is
// also the only enclosure anywhere, which keeps the steppe's defining
// fencelessness intact everywhere else.
function Khashaa() {
  const postRef = useRef<THREE.InstancedMesh>(null)
  const railRef = useRef<THREE.InstancedMesh>(null)

  const { posts, rails } = useMemo(() => {
    const rng = makeRng("camp-khashaa")
    const posts: THREE.Matrix4[] = []
    const rails: THREE.Matrix4[] = []
    const N = 34
    const pts: { x: number; z: number; h: number }[] = []

    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const r = CORRAL.radius * seededRange(rng, 0.9, 1.1)
      const x = CORRAL.x + Math.cos(a) * r
      const z = CORRAL.z + Math.sin(a) * r * 0.8
      pts.push({ x, z, h: seededRange(rng, 1.0, 1.35) })
    }

    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()

    for (const pt of pts) {
      const gy = heightAt(pt.x, pt.z)
      p.set(pt.x, gy + pt.h / 2, pt.z)
      e.set(seededDrift(rng, 0.14), seededRange(rng, 0, 3), seededDrift(rng, 0.14))
      q.setFromEuler(e)
      s.set(1, pt.h, 1)
      posts.push(new THREE.Matrix4().compose(p, q, s))
    }

    // Two rough rails run post to post, sagging a little between them.
    const UP = new THREE.Vector3(0, 1, 0)
    const dir = new THREE.Vector3()
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      for (const frac of [0.42, 0.78]) {
        const ay = heightAt(a.x, a.z) + a.h * frac
        const by = heightAt(b.x, b.z) + b.h * frac
        dir.set(b.x - a.x, by - ay, b.z - a.z)
        const len = dir.length()
        dir.normalize()
        q.setFromUnitVectors(UP, dir)
        p.set((a.x + b.x) / 2, (ay + by) / 2 - 0.03, (a.z + b.z) / 2)
        s.set(1, len, 1)
        rails.push(new THREE.Matrix4().compose(p, q, s))
      }
    }

    return { posts, rails }
  }, [])

  useLayoutEffect(() => {
    if (postRef.current) {
      posts.forEach((m, i) => postRef.current!.setMatrixAt(i, m))
      postRef.current.instanceMatrix.needsUpdate = true
      postRef.current.computeBoundingSphere()
    }
    if (railRef.current) {
      rails.forEach((m, i) => railRef.current!.setMatrixAt(i, m))
      railRef.current.instanceMatrix.needsUpdate = true
      railRef.current.computeBoundingSphere()
    }
  }, [posts, rails])

  const postGeo = useMemo(
    () => new THREE.CylinderGeometry(0.045, 0.06, 1, 6),
    []
  )
  const railGeo = useMemo(() => new THREE.BoxGeometry(0.05, 1, 0.035), [])

  return (
    <>
      <instancedMesh
        ref={postRef}
        args={[postGeo, undefined, posts.length]}
        castShadow
      >
        <meshStandardMaterial color="#584a3b" roughness={0.94} />
      </instancedMesh>
      <instancedMesh ref={railRef} args={[railGeo, undefined, rails.length]} castShadow>
        <meshStandardMaterial color="#61533f" roughness={0.94} />
      </instancedMesh>
    </>
  )
}

export function Camp() {
  return (
    <>
      <ArgalStack />
      <SolarPanel />
      <Vessels />
      <AaruulTray />
      <Uyaa />
      <Khashaa />
    </>
  )
}
