"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { generateGer, gerApexY, type GerParams } from "@/lib/ger"
import { Hearth } from "./hearth"

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
  const leafRef = useRef<THREE.InstancedMesh>(null)

  useInstances(uniRef, build.uni)
  useInstances(khanaRef, build.khana)
  useInstances(spokeRef, build.toonoSpokes)
  useInstances(baganaRef, build.bagana)
  useInstances(frameRef, build.doorFrame)
  useInstances(leafRef, build.doorLeaf)

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
        <meshStandardMaterial color="#8a5a2c" roughness={0.86} metalness={0} />
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
        <meshStandardMaterial color="#b0641f" roughness={0.74} metalness={0} />
      </mesh>
      {/* The one painted-blue element on the whole structure. */}
      <instancedMesh
        ref={spokeRef}
        args={[spoke, undefined, build.toonoSpokes.length]}
      >
        <meshStandardMaterial color="#3f6ea8" roughness={0.7} metalness={0} />
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
      <instancedMesh
        ref={leafRef}
        args={[box, undefined, build.doorLeaf.length]}
        castShadow
      >
        <meshStandardMaterial color="#c06a1e" roughness={0.7} metalness={0} />
      </instancedMesh>

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

      {/* --- the yandan: the stove's chimney, out through the crown --------- */}
      <mesh
        position={[
          build.chimney.base.x,
          build.chimney.base.y + build.chimney.height / 2,
          build.chimney.base.z,
        ]}
        castShadow
      >
        <cylinderGeometry args={[0.055, 0.06, build.chimney.height, 10]} />
        <meshStandardMaterial
          color="#3b3a38"
          roughness={0.62}
          metalness={0.55}
        />
      </mesh>
    </group>
  )
}
