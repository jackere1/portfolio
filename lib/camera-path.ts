import * as THREE from "three"

export interface CameraKeyframe {
  position: THREE.Vector3
  lookAt: THREE.Vector3
  fov: number
}

/**
 * Camera keyframes, one per room, descending through the field.
 * Y is the primary descent axis. The seam sits at world y = SEAM_Y (-8); the
 * Boundary keyframe (index 1) places the camera AT the seam and looks straight
 * at it, so the world seam crosses the screen-fixed held line exactly there.
 */
export const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  // Gate: high above, looking down the shaft — the drift region.
  {
    position: new THREE.Vector3(0, 9, 9),
    lookAt: new THREE.Vector3(0, 1, 0),
    fov: 62,
  },
  // Boundary: AT the seam (y = -8). The crossing.
  {
    position: new THREE.Vector3(3.5, -8, 7),
    lookAt: new THREE.Vector3(0, -8, 0),
    fov: 56,
  },
  // Language: into the locked region.
  {
    position: new THREE.Vector3(5, -11.5, 5.5),
    lookAt: new THREE.Vector3(0, -11.5, 0.5),
    fov: 54,
  },
  // Music.
  {
    position: new THREE.Vector3(-4.5, -14.5, 6),
    lookAt: new THREE.Vector3(0, -14.5, 0),
    fov: 58,
  },
  // Reflex.
  {
    position: new THREE.Vector3(4.5, -17.5, 5),
    lookAt: new THREE.Vector3(0, -17.5, 0),
    fov: 54,
  },
  // Kill-dates.
  {
    position: new THREE.Vector3(-3.5, -20.5, 6),
    lookAt: new THREE.Vector3(0, -20.5, 0),
    fov: 57,
  },
  // Place: at floor level, looking outward into the night.
  {
    position: new THREE.Vector3(0, -24, 5.5),
    lookAt: new THREE.Vector3(0, -22.5, -2),
    fov: 56,
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
