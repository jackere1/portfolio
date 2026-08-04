"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { generateGer, gerApexY, type GerParams } from "@/lib/ger"
import { Hearth } from "./hearth"
import { journey } from "@/hooks/use-journey"
import { createSunState, writeSunState } from "@/lib/sun-arc"

// One generator, one component. Every ger in the world comes through here.
//
// What you actually see from outside is the cover, the painted door, the
// tension bands and the chimney — plus, because it is summer, the strip of
// orange khana lattice showing under the rolled-up khayaa. The frame proper is
// for the inside and for the light coming through the crown.

/** Cheap helper: fill an InstancedMesh from a matrix list, once. */
function useInstances(
  ref: React.RefObject<THREE.InstancedMesh | null>,
  matrices: THREE.Matrix4[]
) {
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < matrices.length; i++) {
      mesh.setMatrixAt(i, matrices[i])
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [ref, matrices])
}

export function Ger({
  params,
  position = [0, 0, 0],
}: {
  params: GerParams
  position?: [number, number, number]
}) {
  const build = useMemo(() => generateGer(params), [params])

  const uniRef = useRef<THREE.InstancedMesh>(null)
  const khanaRef = useRef<THREE.InstancedMesh>(null)
  const spokeRef = useRef<THREE.InstancedMesh>(null)
  const baganaRef = useRef<THREE.InstancedMesh>(null)
  const frameRef = useRef<THREE.InstancedMesh>(null)

  useInstances(uniRef, build.uni)
  useInstances(khanaRef, build.khana)
  useInstances(spokeRef, build.toonoSpokes)
  useInstances(baganaRef, build.bagana)
  useInstances(frameRef, build.doorFrame)

  // Unit geometries — all shaping is in the instance matrices.
  const pole = useMemo(() => new THREE.CylinderGeometry(0.019, 0.028, 1, 6), [])
  const lath = useMemo(() => new THREE.BoxGeometry(0.016, 1, 0.03), [])
  const spoke = useMemo(() => new THREE.CylinderGeometry(0.016, 0.016, 1, 5), [])
  const column = useMemo(() => new THREE.CylinderGeometry(0.05, 0.058, 1, 8), [])
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

  return (
    <group position={position}>
      {/* --- the cover ---------------------------------------------------- */}
      <mesh geometry={build.wallCover} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.94}
          metalness={0}
          side={THREE.DoubleSide}
          dithering
        />
      </mesh>
      <mesh geometry={build.roofCover} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.94}
          metalness={0}
          side={THREE.DoubleSide}
          dithering
        />
      </mesh>

      {/* --- the frame ----------------------------------------------------- */}
      <instancedMesh
        ref={uniRef}
        args={[pole, undefined, build.uni.length]}
        castShadow
      >
        <meshStandardMaterial color="#5e3d1f" roughness={0.88} metalness={0} />
      </instancedMesh>

      {/* The khayaa is rolled up for summer, so this is visible from outside —
          a band of orange lattice under the cover's lower edge. */}
      <instancedMesh
        ref={khanaRef}
        args={[lath, undefined, build.khana.length]}
        castShadow
      >
        <meshStandardMaterial color="#a35f24" roughness={0.82} metalness={0} />
      </instancedMesh>

      {/* --- the crown ----------------------------------------------------- */}
      <mesh geometry={build.toono} castShadow>
        <meshStandardMaterial color="#a85c1c" roughness={0.74} metalness={0} />
      </mesh>
      {/* Red-orange, NOT blue. Mongolian ger woodwork is red and reddish-
          yellow, and the toono above all: the crown is the sun and the uni are
          its rays. It should be the warmest wood in the ger, not the coolest. */}
      <instancedMesh
        ref={spokeRef}
        args={[spoke, undefined, build.toonoSpokes.length]}
      >
        <meshStandardMaterial color="#b4671f" roughness={0.72} metalness={0} />
      </instancedMesh>

      <instancedMesh
        ref={baganaRef}
        args={[column, undefined, build.bagana.length]}
      >
        <meshStandardMaterial color="#a35f24" roughness={0.8} metalness={0} />
      </instancedMesh>

      {/* --- the door: wooden, painted, low ------------------------------- */}
      <instancedMesh
        ref={frameRef}
        args={[box, undefined, build.doorFrame.length]}
        castShadow
      >
        <meshStandardMaterial color="#8f4f1c" roughness={0.78} metalness={0} />
      </instancedMesh>
      <DoorLeaves build={build} />

      {/* --- the urkh: the felt over the crown ------------------------------ */}
      <Urkh build={build} />

      {/* --- the khayaa: the wall skirt ------------------------------------- */}
      <Khayaa params={params} />

      {/* --- tension bands -------------------------------------------------- */}
      {build.bands.map((b, i) => (
        <mesh key={i} position={[0, b.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[b.radius, 0.012, 6, 48]} />
          <meshStandardMaterial
            color="#6d6355"
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      ))}

      {/* --- roof ropes, weighted with stones ------------------------------- */}
      {build.ropeStones.map((s, i) => (
        <mesh key={i} position={s} castShadow>
          <dodecahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial
            color="#4a4640"
            roughness={0.95}
            metalness={0}
          />
        </mesh>
      ))}

      <Hearth
        position={[0, 0, 0]}
        toonoY={gerApexY(params)}
        toonoRadius={params.toonoRadius}
        chimneyTop={build.chimney.base.y + build.chimney.height}
      />

    </group>
  )
}

/**
 * The urkh (өрх) — the square of felt that covers the toono.
 *
 * It lies folded back over the north slope through the day to let the sun in,
 * and is drawn across the crown after dark. That is ordinary daily practice,
 * and it is also the reason this site's journey ends outdoors: a ger whose
 * crown is left open to the stars reads as a poor one.
 */
function Urkh({ build }: { build: ReturnType<typeof generateGer> }) {
  const ref = useRef<THREE.Mesh>(null)
  const sun = useMemo(() => createSunState(), [])
  const { size, folded, drawn } = build.urkh

  useFrame(() => {
    writeSunState(sun, journey.t)
    const m = ref.current
    if (!m) return
    const k = sun.urkh
    m.position.lerpVectors(folded, drawn, k)
    // Folded double over the roof by day; flat across the crown by night.
    m.scale.set(1, 1, 0.5 + 0.5 * k)
    m.rotation.x = -Math.PI / 2 + (1 - k) * 0.36
  })

  return (
    <mesh ref={ref} castShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        color="#6e6455"
        roughness={0.97}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/**
 * The door leaves, hinged.
 *
 * A summer ger very often stands with its wooden door hooked open and only the
 * felt flap hanging — the door faces south, and the afternoon sun comes
 * straight in. It is shut when the cold does. Both states are driven off the
 * same sun elevation that draws the urkh and rolls the khayaa down, so the
 * whole house closes as one thing while the guest is inside.
 */
function DoorLeaves({ build }: { build: ReturnType<typeof generateGer> }) {
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const sun = useMemo(() => createSunState(), [])
  const half = build.doorWidth / 2

  useFrame(() => {
    writeSunState(sun, journey.t)
    // Shut is 0; a leaf swung back against the wall is about 105 degrees.
    const open = (1 - sun.urkh) * 1.83
    if (left.current) left.current.rotation.y = open
    if (right.current) right.current.rotation.y = -open
  })

  return (
    <group position={[0, build.doorHeight / 2 + 0.06, build.doorZ]}>
      {[
        { ref: left, hinge: -half },
        { ref: right, hinge: half },
      ].map((d, i) => (
        <group key={i} position={[d.hinge, 0, 0]} ref={d.ref}>
          <mesh
            position={[(i === 0 ? 1 : -1) * half * 0.5, 0, 0.02]}
            castShadow
          >
            <boxGeometry args={[half - 0.012, build.doorHeight - 0.12, 0.045]} />
            <meshStandardMaterial
              color="#c06a1e"
              roughness={0.7}
              metalness={0}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * The khayaa (хаяа) — the skirt of the wall cover.
 *
 * Rolled UP through the summer heat to let air under the wall, which is why
 * the orange lattice shows at the base all afternoon, and rolled DOWN when the
 * temperature drops — and in August at this latitude and altitude it drops
 * hard after sunset. Along with the urkh being drawn and the door being shut,
 * this is the ger closing itself for the night, and it is the reason stop 08
 * walks back out into a sealed home.
 *
 * Modelled as its own strip rather than by rebuilding the cover: the khayaa IS
 * a separate piece of felt in life, and rebuilding a lathe every frame to
 * animate one is the wrong kind of expensive.
 */
function Khayaa({ params }: { params: GerParams }) {
  const ref = useRef<THREE.Mesh>(null)
  const sun = useMemo(() => createSunState(), [])
  const roll = params.khayaaRoll

  useFrame(() => {
    writeSunState(sun, journey.t)
    const m = ref.current
    if (!m) return
    // sun.khayaaRoll runs from `roll` (up, hot) to 0 (down, cold).
    const openness = Math.max(0, Math.min(1, sun.khayaaRoll / roll))
    // Down: full height, hanging to the ground. Up: bunched into a roll.
    const h = 1 - openness * 0.82
    m.scale.set(1, h, 1)
    m.position.y = roll - (roll * h) / 2 + 0.002
    m.visible = h > 0.06
  })

  return (
    <mesh ref={ref} position={[0, roll / 2, 0]} castShadow>
      <cylinderGeometry
        args={[
          params.radius + 0.045,
          params.radius + 0.045,
          roll,
          64,
          1,
          true,
          Math.asin(0.39 / params.radius) + 0.03,
          Math.PI * 2 - (Math.asin(0.39 / params.radius) + 0.03) * 2,
        ]}
      />
      <meshStandardMaterial
        color="#4a4136"
        roughness={0.97}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
