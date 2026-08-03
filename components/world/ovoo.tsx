"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { makeRng, seededDrift, seededRange } from "@/lib/prng"
import { journey } from "@/hooks/use-journey"
import { heightAt } from "@/lib/heightfield"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

// The ovoo.
//
// A cairn on a rise or a pass where a track crosses is the most reliable object
// in the Mongolian landscape, and you do not pass one without stopping: you
// walk around it three times CLOCKWISE — нар зөв, sun-wise — and add three
// stones picked up at the foot of the hill.
//
// Clockwise is not a stylistic detail. Counter-clockwise (нар буруу) is the
// direction of death rites, and it is the same rule that governs the way the
// route rounds the camp and the way the urkh is pulled across the crown.
//
// The khadag are Tengri blue, and they are the ONLY blue in this world besides
// the sky itself. That is the entire cool-colour budget, spent here.

const STONES = 90
const KHADAG = 9

/** On a rise west-south-west of the camp, out where the land opens — visible
 *  across the whole approach as a dark notch on the skyline. */
const SITE = { x: -82, z: 69 }

export function Ovoo() {
  const stoneRef = useRef<THREE.InstancedMesh>(null)
  const clothRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const reduced = useReducedMotion()
  const clock = useRef(0)

  const groundY = useMemo(() => heightAt(SITE.x, SITE.z), [])

  const stones = useMemo(() => {
    const rng = makeRng("ovoo-stones")
    const out: THREE.Matrix4[] = []
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    for (let i = 0; i < STONES; i++) {
      // A cone: wide at the foot, narrowing to the stick crown.
      const h = Math.pow(rng(), 0.7)
      const r = (1 - h) * 1.5 * seededRange(rng, 0.55, 1.05)
      const a = seededRange(rng, 0, Math.PI * 2)
      p.set(Math.cos(a) * r, 0.1 + h * 1.5, Math.sin(a) * r)
      e.set(
        seededRange(rng, 0, Math.PI),
        seededRange(rng, 0, Math.PI),
        seededRange(rng, 0, Math.PI)
      )
      q.setFromEuler(e)
      const sc = seededRange(rng, 0.12, 0.26)
      s.set(sc, sc * seededRange(rng, 0.6, 1.0), sc)
      out.push(new THREE.Matrix4().compose(p, q, s))
    }
    return out
  }, [])

  const cloths = useMemo(() => {
    const rng = makeRng("ovoo-khadag")
    return Array.from({ length: KHADAG }, () => ({
      a: seededRange(rng, 0, Math.PI * 2),
      r: seededRange(rng, 0.15, 0.55),
      y: seededRange(rng, 1.65, 2.5),
      len: seededRange(rng, 0.5, 1.05),
      phase: seededRange(rng, 0, 6.28),
    }))
  }, [])

  useLayoutEffect(() => {
    const m = stoneRef.current
    if (!m) return
    stones.forEach((mat, i) => m.setMatrixAt(i, mat))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [stones])

  useFrame((_, delta) => {
    if (!reduced) clock.current += Math.min(delta, 1 / 20)
    const m = clothRef.current
    if (!m) return
    for (let i = 0; i < cloths.length; i++) {
      const c = cloths[i]
      // Silk on a pass never hangs still. Clamped, and frozen under reduced
      // motion like everything else here.
      const flap = reduced
        ? 0
        : Math.sin(clock.current * 2.1 + c.phase) * 0.22 +
          Math.sin(clock.current * 4.7 + c.phase * 1.7) * 0.08
      dummy.position.set(
        Math.cos(c.a) * c.r + flap * 0.35,
        c.y - c.len * 0.5,
        Math.sin(c.a) * c.r
      )
      dummy.rotation.set(0, c.a, flap)
      dummy.scale.set(0.1, c.len, 1)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  const stoneGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), [])
  const clothGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), [])

  return (
    <group position={[SITE.x, groundY, SITE.z]}>
      <instancedMesh
        ref={stoneRef}
        args={[stoneGeo, undefined, STONES]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#57534b" roughness={0.97} metalness={0} />
      </instancedMesh>

      {/* The stick crown, leaning in out of the top of the pile. */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.16, 2.05, Math.sin(a) * 0.16]}
            rotation={[Math.cos(a) * 0.16, 0, -Math.sin(a) * 0.16]}
            castShadow
          >
            <cylinderGeometry args={[0.02, 0.032, 1.35, 5]} />
            <meshStandardMaterial color="#4d4239" roughness={0.95} />
          </mesh>
        )
      })}

      <instancedMesh
        ref={clothRef}
        args={[clothGeo, undefined, KHADAG]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#3d6ea6"
          roughness={0.82}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  )
}
