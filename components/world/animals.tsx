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

/** The way home: north of the camp, never through it. */
const RETURN_WAY = { x: -2, z: -46 }

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
      // TWO segments, via a waypoint north of the camp. A straight lerp from
      // the pasture to the corral walks the entire flock through the middle of
      // the camp and past the camera, which is both wrong and absurd — a herd
      // comes home along the ground it always uses, not through the front yard.
      let x: number
      let z: number
      if (b < 0.55) {
        const k = b / 0.55
        x = a.gx + (RETURN_WAY.x - a.gx) * k
        z = a.gz + (RETURN_WAY.z - a.gz) * k
      } else {
        const k = (b - 0.55) / 0.45
        x = RETURN_WAY.x + (a.bx - RETURN_WAY.x) * k
        z = RETURN_WAY.z + (a.bz - RETURN_WAY.z) * k
      }
      // Standing while grazing, settled down once they are in. The body's
      // centre must sit a HALF-HEIGHT above the ground — placing it at ground
      // level buries half the animal and leaves a field of pale domes.
      const lie = b * 0.12
      dummy.position.set(x, heightAt(x, z) + (0.26 - lie) * a.scale, z)
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

// --- the зэл ----------------------------------------------------------------
//
// A pegged line with the foals tied along it, and the mares standing loose
// nearby. This is the single clearest thing that says LATE SUMMER at a camp:
// foals are tethered from the tiger day of summer precisely so the mares stay
// close enough to be milked, and airag is only possible from July into late
// September. A summer camp in August with no зэл and no khokhuur is a camp with
// its season removed.
//
// It sits in front of the ger, to the south-west, where a host standing at the
// door can see the horses — which is the whole point of putting them there.

const ZEL_FROM = { x: -9.5, z: 7.0 }
const ZEL_TO = { x: -1.5, z: 10.2 }
const FOALS = 5
const MARES = 3

/** A horse, standing. Never walking — the same rule as the flock, for the same
 *  reason: shape survives scrutiny at this distance, motion does not. */
function Horse({
  x,
  z,
  yaw,
  scale = 1,
  coat = "#5a4432",
}: {
  x: number
  z: number
  yaw: number
  scale?: number
  coat?: string
}) {
  const y = heightAt(x, z)
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={scale}>
      {/* barrel */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <sphereGeometry args={[0.42, 10, 8]} />
        <meshStandardMaterial color={coat} roughness={0.9} />
      </mesh>
      {/* neck and head, carried low the way a grazing horse holds them */}
      <mesh position={[0, 1.16, 0.5]} rotation={[0.75, 0, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.16, 0.6, 8]} />
        <meshStandardMaterial color={coat} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.94, 0.82]} rotation={[1.15, 0, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.26, 4, 8]} />
        <meshStandardMaterial color={coat} roughness={0.9} />
      </mesh>
      {[
        [-0.2, 0.28],
        [0.2, 0.28],
        [-0.2, -0.28],
        [0.2, -0.28],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.5, lz]} castShadow>
          <cylinderGeometry args={[0.055, 0.045, 1.0, 6]} />
          <meshStandardMaterial color={coat} roughness={0.92} />
        </mesh>
      ))}
      {/* tail */}
      <mesh position={[0, 1.02, -0.44]} rotation={[-0.35, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.02, 0.62, 6]} />
        <meshStandardMaterial color="#2e2620" roughness={0.95} />
      </mesh>
    </group>
  )
}

export function Zel() {
  const rng = useMemo(() => makeRng("zel"), [])

  const line = useMemo(() => {
    const dx = ZEL_TO.x - ZEL_FROM.x
    const dz = ZEL_TO.z - ZEL_FROM.z
    const len = Math.hypot(dx, dz)
    const mid = {
      x: (ZEL_FROM.x + ZEL_TO.x) / 2,
      z: (ZEL_FROM.z + ZEL_TO.z) / 2,
    }
    return { len, yaw: Math.atan2(dx, dz), mid }
  }, [])

  const foals = useMemo(
    () =>
      Array.from({ length: FOALS }, (_, i) => {
        const k = (i + 0.5) / FOALS
        // Alternating sides of the rope, as they actually stand.
        const side = i % 2 === 0 ? 1 : -1
        const x =
          ZEL_FROM.x + (ZEL_TO.x - ZEL_FROM.x) * k + side * 0.55 + seededDrift(rng, 0.18)
        const z =
          ZEL_FROM.z + (ZEL_TO.z - ZEL_FROM.z) * k + side * 0.25 + seededDrift(rng, 0.18)
        return {
          x,
          z,
          yaw: line.yaw + (side > 0 ? 1.5 : -1.5) + seededDrift(rng, 0.35),
          scale: seededRange(rng, 0.62, 0.74),
          coat: ["#6b5340", "#4a3a2c", "#7a6248"][i % 3],
        }
      }),
    [rng, line.yaw]
  )

  const mares = useMemo(
    () =>
      Array.from({ length: MARES }, () => {
        const a = seededRange(rng, -0.9, 0.9)
        const r = seededRange(rng, 5.5, 11)
        return {
          x: line.mid.x + Math.sin(a + line.yaw) * r,
          z: line.mid.z + Math.cos(a + line.yaw) * r * 0.7,
          yaw: seededRange(rng, 0, Math.PI * 2),
          scale: seededRange(rng, 0.98, 1.1),
          coat: ["#4f3d2e", "#63503c", "#3b3128"][Math.floor(rng() * 3)],
        }
      }),
    [rng, line.mid.x, line.mid.z, line.yaw]
  )

  return (
    <group>
      {/* The two pegs and the rope between them, low and taut. */}
      {[ZEL_FROM, ZEL_TO].map((p, i) => (
        <mesh
          key={i}
          position={[p.x, heightAt(p.x, p.z) + 0.16, p.z]}
          castShadow
        >
          <cylinderGeometry args={[0.045, 0.055, 0.34, 6]} />
          <meshStandardMaterial color="#4f4234" roughness={0.94} />
        </mesh>
      ))}
      <mesh
        position={[
          line.mid.x,
          heightAt(line.mid.x, line.mid.z) + 0.24,
          line.mid.z,
        ]}
        rotation={[Math.PI / 2, 0, -line.yaw]}
        castShadow
      >
        <cylinderGeometry args={[0.016, 0.016, line.len, 5]} />
        <meshStandardMaterial color="#6d6152" roughness={0.95} />
      </mesh>

      {foals.map((f, i) => (
        <Horse key={`f${i}`} {...f} />
      ))}
      {mares.map((m, i) => (
        <Horse key={`m${i}`} {...m} />
      ))}
    </group>
  )
}
