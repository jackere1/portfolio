"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { makeRng, seededDrift, seededRange } from "@/lib/prng"
import { journey } from "@/hooks/use-journey"
import { heightAt } from "@/lib/heightfield"
import { CORRAL } from "@/lib/world"

// The animals, and why they are here at all: a camp at sunset in late summer
// with no herd and no dog does not read as peaceful, it reads as abandoned.
//
// They are STAGED, not simulated. Every pose is a pure function of the journey
// scalar, so scrubbing backwards is exact and nothing drifts between loads.
// And nothing ever walks on camera — animals go uncanny through motion, not
// through shape, so the flock is out on the steppe in the afternoon and bedded
// in the corral by dusk, and the transition happens across a scroll stretch
// where they are small and far away.

const FLOCK = 120

/** Where the herd is at a given progress: far out grazing, then home. */
function flockBlend(t: number): number {
  // Out on the pasture through the afternoon; brought in across the golden
  // hour, which is exactly when it happens.
  const k = (t - 0.3) / 0.14
  return k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k)
}

export function Flock() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const lastBlend = useRef(-1)

  const layout = useMemo(() => {
    const rng = makeRng("flock")
    return Array.from({ length: FLOCK }, () => {
      // Grazing: scattered wide, west and north-west, where the pasture is.
      const ga = seededRange(rng, Math.PI * 0.55, Math.PI * 1.35)
      const gr = seededRange(rng, 70, 165)
      // Bedded: packed inside the khashaa for the night.
      const ba = seededRange(rng, 0, Math.PI * 2)
      const br = Math.sqrt(rng()) * (CORRAL.radius - 0.7)
      return {
        gx: Math.cos(ga) * gr,
        gz: Math.sin(ga) * gr,
        bx: CORRAL.x + Math.cos(ba) * br,
        bz: CORRAL.z + Math.sin(ba) * br * 0.8,
        rot: seededRange(rng, 0, Math.PI * 2),
        scale: seededRange(rng, 0.86, 1.16),
        // A few are goats: leggier and darker.
        goat: rng() < 0.3,
      }
    })
  }, [])

  useFrame(() => {
    const m = ref.current
    if (!m) return
    const b = flockBlend(journey.t)
    // Only rewrite the matrices when the staging actually moved.
    if (Math.abs(b - lastBlend.current) < 0.002) return
    lastBlend.current = b

    for (let i = 0; i < layout.length; i++) {
      const a = layout[i]
      const x = a.gx + (a.bx - a.gx) * b
      const z = a.gz + (a.bz - a.gz) * b
      // Standing while grazing, settled down once they are in.
      const lie = b * 0.35
      dummy.position.set(x, heightAt(x, z) + (0.3 - lie) * a.scale, z)
      dummy.rotation.set(0, a.rot, 0)
      dummy.scale.setScalar(a.scale * (a.goat ? 0.92 : 1))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  })

  // A sheep at this distance is a pale mass with a dark head. That is all it
  // ever needs to be, and trying for more is how it starts looking like a toy.
  const geo = useMemo(() => {
    const body = new THREE.SphereGeometry(0.3, 8, 6)
    body.scale(1.35, 0.85, 0.8)
    return body
  }, [])

  return (
    <instancedMesh
      ref={ref}
      args={[geo, undefined, FLOCK]}
      castShadow
      frustumCulled={false}
    >
      <meshStandardMaterial color="#a89d88" roughness={0.95} metalness={0} />
    </instancedMesh>
  )
}

/**
 * The bankhar.
 *
 * "Нохой хор" — hold the dog — is the Mongolian equivalent of knocking, and you
 * say it whether or not you can see one. Knocking on the door is rude, and it
 * is taboo to dismount before the household has held its dog. So the dog is not
 * set dressing: it is the doorbell, and the reason a guest waits.
 *
 * It never walks. It lies by the door, rises and faces you as you come in, and
 * settles again once you have been received.
 */
export function Bankhar() {
  const group = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)

  // South-east of the door, where a dog actually lies: in sight of the way in.
  const base = useMemo(() => {
    const rng = makeRng("bankhar")
    const x = 2.6 + seededDrift(rng, 0.2)
    const z = 4.3 + seededDrift(rng, 0.25)
    return { x, z, y: heightAt(x, z) }
  }, [])

  useFrame(() => {
    const t = journey.t
    // Up and alert while the guest is approaching and being received; down
    // again once they are at the door and clearly welcome.
    const alert =
      Math.max(0, Math.min(1, (t - 0.1) / 0.06)) *
      (1 - Math.max(0, Math.min(1, (t - 0.44) / 0.08)))

    const g = group.current
    if (g) g.position.set(base.x, base.y + 0.16 + alert * 0.2, base.z)

    // The head tracks the visitor rather than the body turning — a standing
    // dog that swivels reads as a machine.
    const h = head.current
    if (h) h.rotation.y = -0.5 + alert * 0.5
  })

  return (
    <group ref={group} position={[base.x, base.y + 0.16, base.z]}>
      <mesh castShadow>
        <sphereGeometry args={[0.26, 10, 8]} />
        <meshStandardMaterial color="#2a2320" roughness={0.96} />
      </mesh>
      <group ref={head} position={[0.05, 0.16, 0.28]}>
        <mesh castShadow>
          <sphereGeometry args={[0.14, 10, 8]} />
          <meshStandardMaterial color="#2a2320" roughness={0.96} />
        </mesh>
        {/* The two tan brow spots — the mark that makes a bankhar a bankhar,
            the "four eyes" that are said to let it see spirits. */}
        {[-0.06, 0.06].map((x) => (
          <mesh key={x} position={[x, 0.06, 0.11]}>
            <sphereGeometry args={[0.032, 6, 5]} />
            <meshStandardMaterial color="#8a6134" roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
