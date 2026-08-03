"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { makeRng, seededRange } from "@/lib/prng"
import { journey } from "@/hooks/use-journey"
import { heightAt } from "@/lib/heightfield"

// The host.
//
// A camp at sunset in late summer with a lit fire, smoke rising, and not one
// living thing in frame does not read as peaceful to a Mongolian — combined
// with a shut-up ger it reads as a household in mourning, or a camp whose
// people are gone. Emptiness is the expensive mistake.
//
// So there is someone here. They are a SILHOUETTE and they stay one: a figure
// at distance, backlit, never close and never walking toward the camera.
// Anything more and they go uncanny, and a bad human is far worse than none.
//
// They appear twice, and both are the culture's own grammar:
//
//   ARRIVAL   — you call "нохой хор", hold the dog, and you WAIT. You do not
//               dismount and you do not approach until the household comes out
//               and receives you. Someone steps out of the door and that is
//               the permission.
//
//   DEPARTURE — a family member stands at the door and casts milk into the air
//               after the traveller with a tsatsal, "pouring out a white road
//               ahead" of them, until they are out of sight. The last thing
//               the visitor gets is not their own gaze; it is a blessing
//               thrown at their back.

const DROPS = 26

function windowAt(t: number, a: number, b: number, c: number, d: number) {
  const rise = Math.max(0, Math.min(1, (t - a) / Math.max(1e-4, b - a)))
  const fall = 1 - Math.max(0, Math.min(1, (t - c) / Math.max(1e-4, d - c)))
  const k = Math.min(rise, fall)
  return k * k * (3 - 2 * k)
}

export function Host() {
  const group = useRef<THREE.Group>(null)
  const armRef = useRef<THREE.Group>(null)
  const dropsRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // A pace south-east of the door, where someone stepping out would stand.
  const base = useMemo(() => {
    const x = 0.95
    const z = 3.5
    return { x, y: heightAt(x, z), z }
  }, [])

  const drops = useMemo(() => {
    const rng = makeRng("tsatsal")
    return Array.from({ length: DROPS }, () => ({
      // Cast up and outward, toward the leaving guest.
      speed: seededRange(rng, 1.6, 3.1),
      spread: seededRange(rng, -0.5, 0.5),
      lift: seededRange(rng, 1.5, 2.6),
      phase: seededRange(rng, 0, 0.55),
      size: seededRange(rng, 0.6, 1.35),
    }))
  }, [])

  useFrame(() => {
    const t = journey.t

    // Out to receive you, then back in; out again to see you off.
    const receiving = windowAt(t, 0.13, 0.18, 0.3, 0.36)
    const seeingOff = windowAt(t, 0.86, 0.9, 1.01, 1.02)
    const present = Math.max(receiving, seeingOff)

    const g = group.current
    if (g) {
      g.visible = present > 0.01
      g.scale.setScalar(present)
      g.position.set(base.x, base.y, base.z)
    }

    // The throw itself: one arc, late, and only on the way out.
    const cast = windowAt(t, 0.93, 0.955, 0.985, 1.0)
    if (armRef.current) armRef.current.rotation.x = -0.2 - cast * 1.5

    const m = dropsRef.current
    if (!m) return
    m.visible = cast > 0.02
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i]
      // A ballistic arc, driven by journey progress so it scrubs exactly.
      const local = Math.max(0, cast - d.phase)
      const vx = Math.sin(0.35 + d.spread) * d.speed
      const vz = Math.cos(0.35 + d.spread) * d.speed
      dummy.position.set(
        vx * local * 2.2,
        1.35 + d.lift * local * 2.2 - 9.0 * local * local * 2.4,
        vz * local * 2.2
      )
      dummy.scale.setScalar(0.022 * d.size * (local > 0 ? 1 : 0))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={group} position={[base.x, base.y, base.z]}>
      {/* A deel is a long coat with a sash — the silhouette is a tapered
          column, not a pair of legs, and that is most of what makes it read
          as Mongolian rather than as a generic mannequin. */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.26, 1.24, 10]} />
        <meshStandardMaterial color="#2b2a2c" roughness={0.94} />
      </mesh>
      <mesh position={[0, 1.34, 0]} castShadow>
        <sphereGeometry args={[0.115, 10, 8]} />
        <meshStandardMaterial color="#25201d" roughness={0.95} />
      </mesh>
      {/* Hat. Nobody receives a guest bare-headed. */}
      <mesh position={[0, 1.44, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.11, 10]} />
        <meshStandardMaterial color="#20201f" roughness={0.95} />
      </mesh>

      {/* The casting arm, and the tsatsal in it. */}
      <group ref={armRef} position={[0.2, 1.1, 0.06]}>
        <mesh position={[0, -0.16, 0.1]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.05, 0.52, 8]} />
          <meshStandardMaterial color="#2b2a2c" roughness={0.94} />
        </mesh>
        <mesh position={[0, -0.34, 0.28]} rotation={[0.5, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.045, 0.1, 8]} />
          <meshStandardMaterial color="#6d5a3c" roughness={0.85} />
        </mesh>
      </group>

      {/* The milk. Emissive so it catches the eye against a dark camp — it is
          the last thing in the piece and it is meant to be seen. */}
      <instancedMesh
        ref={dropsRef}
        args={[undefined, undefined, DROPS]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 5]} />
        <meshStandardMaterial
          color="#0a0a0a"
          emissive="#cfd6dd"
          emissiveIntensity={1.6}
          roughness={1}
        />
      </instancedMesh>
    </group>
  )
}
