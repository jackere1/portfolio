"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js"
import * as THREE from "three"

// A real horse mesh (glTF) grazing the steppe — a proper silhouette in place of
// the old boxes. Loaded once and deep-cloned per animal (each gets its own coat
// tint), auto-normalised to the scene's scale, and stood on the ground. It keeps
// the seeded graze drift + faint bob from before; the model carries the shape.
const HORSE_URL = "/models/horse.glb"
useGLTF.preload(HORSE_URL)

// Target length in world units for a scale-1 horse (the model ships huge).
const TARGET_LEN = 1.7
// The model faces +z; the herd faces along ±x, so turn it a quarter.
const BASE_YAW = Math.PI / 2

export interface HorsePlacement {
  x: number
  z: number
  gy: number
  dir: number
  scale: number
  tone: string
  driftAmp: number
  driftFreq: number
  driftPhase: number
  bobPhase: number
}

export function GrazingHorse({
  m,
  reduced,
  shadowTex,
}: {
  m: HorsePlacement
  reduced: boolean
  shadowTex: THREE.Texture | null
}) {
  const { scene, animations } = useGLTF(HORSE_URL)
  const groupRef = useRef<THREE.Group>(null)

  // Deep-clone the model for this horse, tint its coat, and work out the scale
  // and ground offset from its own bounding box (model units are unknown).
  const { model, norm, footOffset } = useMemo(() => {
    const c = skeletonClone(scene)
    const tone = new THREE.Color(m.tone)
    c.traverse((o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        const src = mesh.material as THREE.MeshStandardMaterial
        const mat = (Array.isArray(src) ? src[0] : src).clone() as THREE.MeshStandardMaterial
        mat.color.copy(tone)
        mat.metalness = 0
        mat.roughness = 0.85
        mesh.material = mat
        mesh.frustumCulled = false
      }
    })
    const box = new THREE.Box3().setFromObject(c)
    const size = new THREE.Vector3()
    box.getSize(size)
    const len = Math.max(size.x, size.z) || 1
    const n = TARGET_LEN / len
    return { model: c, norm: n, footOffset: -box.min.y * (TARGET_LEN / len) }
  }, [scene, m.tone])

  // Morph-target animation is blended on the GPU — near-free — so the herd can
  // move without touching the frame budget. Play it in slow motion: a graceful,
  // dreamlike stride rather than a frantic gallop, in keeping with the calm.
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])
  useEffect(() => {
    const clip = animations[0]
    if (!clip) return
    const action = mixer.clipAction(clip)
    action.play()
    return () => {
      mixer.stopAllAction()
    }
  }, [mixer, animations])

  useFrame((state, delta) => {
    if (!reduced) mixer.update(Math.min(delta, 0.1) * 0.45)
    const g = groupRef.current
    if (!g) return
    const t = state.clock.elapsedTime
    const drift = reduced ? 0 : Math.sin(t * m.driftFreq + m.driftPhase) * m.driftAmp
    g.position.set(m.x + drift, m.gy, m.z)
  })

  return (
    <group
      ref={groupRef}
      position={[m.x, m.gy, m.z]}
      rotation={[0, m.dir < 0 ? BASE_YAW + Math.PI : BASE_YAW, 0]}
      scale={m.scale}
    >
      {shadowTex && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.9, 1.0]} />
          <meshBasicMaterial map={shadowTex} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
      <primitive object={model} position={[0, footOffset, 0]} scale={norm} />
    </group>
  )
}
