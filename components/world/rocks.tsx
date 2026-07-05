"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import { makeRng, seededRange } from "@/lib/prng"

// Real CC0 PBR boulders (Poly Haven, public/models/boulder_01) scattered as
// instanced foreground rocks — one draw call for the lot. The single mesh's
// geometry + material are pulled from the glTF and reused across instances,
// each seeded a different size/rotation and stood on the terrain.
const ROCK_URL = "/models/boulder_01/boulder_01_1k.gltf"
useGLTF.preload(ROCK_URL)

export interface RockBounds {
  xMin: number
  xMax: number
  zMin: number
  zMax: number
}

export function Rocks({
  seed,
  count,
  bounds,
  heightAt,
}: {
  seed: string
  count: number
  bounds: RockBounds
  heightAt: (x: number, z: number) => number
}) {
  const { scene } = useGLTF(ROCK_URL)
  const ref = useRef<THREE.InstancedMesh>(null)

  const { geometry, material, norm, minY } = useMemo(() => {
    let g: THREE.BufferGeometry | null = null
    let m: THREE.Material | null = null
    scene.traverse((o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        g = mesh.geometry
        m = mesh.material as THREE.Material
      }
    })
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    // Normalise so a scale-1 boulder is ~0.9 world units across.
    const n = 0.9 / (Math.max(size.x, size.y, size.z) || 1)
    return { geometry: g, material: m, norm: n, minY: box.min.y }
  }, [scene])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rng = makeRng(`rocks-${seed}`)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const x = seededRange(rng, bounds.xMin, bounds.xMax)
      const z = seededRange(rng, bounds.zMin, bounds.zMax)
      const s = norm * seededRange(rng, 0.45, 1.5)
      dummy.position.set(x, heightAt(x, z) - minY * s, z)
      dummy.rotation.set(
        seededRange(rng, -0.12, 0.12),
        seededRange(rng, 0, Math.PI * 2),
        seededRange(rng, -0.12, 0.12)
      )
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [geometry, count, bounds, heightAt, norm, minY, seed])

  if (!geometry || !material) return null
  return (
    <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />
  )
}
