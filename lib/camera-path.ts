import * as THREE from "three"

export interface CameraKeyframe {
  position: THREE.Vector3
  lookAt: THREE.Vector3
  fov: number
}

/**
 * Camera keyframes for each section.
 * Positions define the camera path as it descends through the machine room.
 * Y-axis is the primary descent axis.
 */
export const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  // Hero: Looking down into the shaft from above
  {
    position: new THREE.Vector3(0, 12, 8),
    lookAt: new THREE.Vector3(0, 0, 0),
    fov: 60,
  },
  // About: Descended, facing the monolith
  {
    position: new THREE.Vector3(4, 4, 6),
    lookAt: new THREE.Vector3(0, 3, 0),
    fov: 55,
  },
  // Experience: Mid-level, orbiting the ring of monoliths
  {
    position: new THREE.Vector3(6, -2, 4),
    lookAt: new THREE.Vector3(0, -2, 0),
    fov: 55,
  },
  // Projects: Wider chamber, pulled back
  {
    position: new THREE.Vector3(-3, -10, 7),
    lookAt: new THREE.Vector3(0, -10, 0),
    fov: 60,
  },
  // Skills: Near the floor, looking at the grid
  {
    position: new THREE.Vector3(0, -18, 6),
    lookAt: new THREE.Vector3(0, -18, 0),
    fov: 58,
  },
  // Contact: At floor level, looking outward
  {
    position: new THREE.Vector3(0, -24, 5),
    lookAt: new THREE.Vector3(0, -20, -2),
    fov: 55,
  },
]

/** Interpolate between camera keyframes based on scroll progress (0-1) */
export function interpolateCamera(
  progress: number
): CameraKeyframe {
  const totalSegments = CAMERA_KEYFRAMES.length - 1
  const scaled = progress * totalSegments
  const index = Math.min(Math.floor(scaled), totalSegments - 1)
  const t = scaled - index

  const a = CAMERA_KEYFRAMES[index]
  const b = CAMERA_KEYFRAMES[index + 1]

  // Smooth step for nicer easing
  const smooth = t * t * (3 - 2 * t)

  return {
    position: new THREE.Vector3().lerpVectors(a.position, b.position, smooth),
    lookAt: new THREE.Vector3().lerpVectors(a.lookAt, b.lookAt, smooth),
    fov: THREE.MathUtils.lerp(a.fov, b.fov, smooth),
  }
}
