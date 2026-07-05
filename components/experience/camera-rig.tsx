import { useFrame, useThree } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"
import {
  useScrollStore,
  SECTION_RANGES,
  type SectionName,
} from "@/hooks/use-scroll-store"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { Y_SURFACE, Y_BEDROCK } from "@/lib/world-config"

// The deepest stratum — the fallback when progress sits at exactly 1.0, past
// every half-open [start, end) range.
const SECTION_NAMES = Object.keys(SECTION_RANGES) as SectionName[]
const LAST_SECTION = SECTION_NAMES[SECTION_NAMES.length - 1]

/**
 * The dive. The camera descends a single vertical axis — scroll lowers you, the
 * medium rises past. No swooping path: you're sealed in a capsule looking out,
 * with only a small parallax as you shift your weight.
 */
export function CameraRig() {
  const { camera } = useThree()
  const reduced = useReducedMotion()
  const mouseRef = useRef({ x: 0, y: 0 })
  const lookRef = useRef(new THREE.Vector3(0, Y_SURFACE - 3, 0))
  const setVelocity = useScrollStore((s) => s.setVelocity)
  const setActiveSection = useScrollStore((s) => s.setActiveSection)
  const setLoaded = useScrollStore((s) => s.setLoaded)
  const hasLoaded = useRef(false)
  const prevProgress = useRef(0)

  useFrame((state) => {
    // Small "look around the viewport" parallax — off under reduced motion.
    const targetX = reduced ? 0 : state.pointer.x * 0.35
    const targetY = reduced ? 0 : state.pointer.y * 0.22
    mouseRef.current.x = THREE.MathUtils.lerp(mouseRef.current.x, targetX, 0.05)
    mouseRef.current.y = THREE.MathUtils.lerp(mouseRef.current.y, targetY, 0.05)

    const progress = useScrollStore.getState().progress
    const velocity = Math.abs(progress - prevProgress.current)
    prevProgress.current = progress
    setVelocity(velocity)

    for (const [name, [start, end]] of Object.entries(SECTION_RANGES)) {
      if (progress >= start && progress < end) {
        setActiveSection(name as SectionName)
        break
      }
    }
    if (progress >= SECTION_RANGES[LAST_SECTION][0]) setActiveSection(LAST_SECTION)

    if (!hasLoaded.current) {
      hasLoaded.current = true
      setLoaded(true)
    }

    // Straight vertical descent: only Y tracks scroll.
    const camY = THREE.MathUtils.lerp(Y_SURFACE, Y_BEDROCK, progress)
    const target = new THREE.Vector3(
      mouseRef.current.x,
      camY + mouseRef.current.y,
      7
    )
    camera.position.lerp(target, 0.1)

    // At the surface, look out toward the horizon — the low sun sits in the sky
    // there. As you descend, tilt down into the shaft toward the dive.
    const ss = Math.min(1, Math.max(0, progress / 0.13))
    const lookDrop = 1.0 + 2.0 * (ss * ss * (3 - 2 * ss))
    lookRef.current.lerp(new THREE.Vector3(0, camY - lookDrop, 0), 0.1)
    camera.lookAt(lookRef.current)
  })

  return null
}
