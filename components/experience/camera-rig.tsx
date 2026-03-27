import { useFrame, useThree } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"
import { interpolateCamera } from "@/lib/camera-path"
import {
  useScrollStore,
  SECTION_RANGES,
  type SectionName,
} from "@/hooks/use-scroll-store"

export function CameraRig() {
  const { camera } = useThree()
  const mouseRef = useRef({ x: 0, y: 0 })
  const setVelocity = useScrollStore((s) => s.setVelocity)
  const setActiveSection = useScrollStore((s) => s.setActiveSection)
  const setLoaded = useScrollStore((s) => s.setLoaded)
  const hasLoaded = useRef(false)
  const prevProgress = useRef(0)

  // Track mouse for parallax
  useFrame((state) => {
    const pointer = state.pointer
    mouseRef.current.x = THREE.MathUtils.lerp(
      mouseRef.current.x,
      pointer.x * 0.3,
      0.05
    )
    mouseRef.current.y = THREE.MathUtils.lerp(
      mouseRef.current.y,
      pointer.y * 0.2,
      0.05
    )
  })

  useFrame(() => {
    const progress = useScrollStore.getState().progress
    const velocity = Math.abs(progress - prevProgress.current)
    prevProgress.current = progress

    // Update store
    setVelocity(velocity)

    // Determine active section
    for (const [name, [start, end]] of Object.entries(SECTION_RANGES)) {
      if (progress >= start && progress < end) {
        setActiveSection(name as SectionName)
        break
      }
    }
    if (progress >= 0.9) setActiveSection("contact")

    // Mark as loaded after first frame
    if (!hasLoaded.current) {
      hasLoaded.current = true
      setLoaded(true)
    }

    // Interpolate camera along the path
    const keyframe = interpolateCamera(progress)

    // Add mouse parallax offset
    const parallaxOffset = new THREE.Vector3(
      mouseRef.current.x,
      mouseRef.current.y,
      0
    )

    // Smoothly lerp camera position
    camera.position.lerp(
      keyframe.position.clone().add(parallaxOffset),
      0.1
    )

    // Smoothly look at target
    const lookTarget = keyframe.lookAt.clone()
    const currentLook = new THREE.Vector3()
    camera.getWorldDirection(currentLook)
    currentLook.multiplyScalar(10).add(camera.position)

    const newLook = new THREE.Vector3().lerpVectors(currentLook, lookTarget, 0.1)
    camera.lookAt(newLook)

    // Adjust FOV
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, keyframe.fov, 0.08)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
