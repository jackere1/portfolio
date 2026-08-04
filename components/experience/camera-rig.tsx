"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { journey } from "@/hooks/use-journey"
import { STOPS, type Stop } from "@/lib/stops"
import { heightAt } from "@/lib/heightfield"
import { GER_RADIUS } from "@/lib/world"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

// Two layers, always.
//
//   1. A dolly that follows the authored route, driven ONLY by scroll. The
//      camera never moves on its own — one-to-one with the gesture, constant
//      FOV, zero roll, stable horizon. That is the whole anti-nausea contract.
//   2. A clamped, eased pointer offset on top, which widens where the journey
//      is holding still and eases back to the authored frame when idle.

/** Pointer, in normalised [-1, 1]. Module-level so the listener never
 *  re-renders anything. */
const pointer = { x: 0, y: 0, active: false, idle: 0 }

/**
 * Device orientation, normalised the same way the pointer is.
 *
 * On a phone the gyro IS the pointer: it feeds the same clamped, eased offset
 * layer, so every guarantee the rig makes still holds — the authored pose is
 * still the only thing scroll moves, the offset is still bounded by the stop's
 * own yaw and pitch ranges, and the horizon still cannot roll.
 *
 * The first reading becomes the neutral. People hold a phone at whatever angle
 * they hold it, and treating raw beta as an absolute pitch would start most
 * visitors staring at the ground.
 */
const tilt = { x: 0, y: 0, active: false, baseBeta: 0, baseGamma: 0, has: false }

/** iOS 13+ gates DeviceOrientationEvent behind a user gesture. Called from the
 *  entry click, which is already being spent on the AudioContext. */
export async function requestTiltPermission(): Promise<boolean> {
  const DOE = (
    window as unknown as {
      DeviceOrientationEvent?: {
        requestPermission?: () => Promise<"granted" | "denied">
      }
    }
  ).DeviceOrientationEvent
  if (!DOE) return false
  if (typeof DOE.requestPermission !== "function") return true
  try {
    return (await DOE.requestPermission()) === "granted"
  } catch {
    return false
  }
}

function smootherstep(k: number): number {
  const c = Math.max(0, Math.min(1, k))
  return c * c * c * (c * (c * 6 - 15) + 10)
}

/** Shortest-path interpolation between two compass bearings. */
function lerpBearing(a: number, b: number, k: number): number {
  let d = ((b - a + 540) % 360) - 180
  return a + d * k
}

/** Inside the ger the floor is flat and level; outside it is the heightfield. */
function groundAt(x: number, z: number): number {
  const inside = Math.hypot(x, z) < GER_RADIUS - 0.15
  return inside ? 0 : heightAt(x, z)
}

interface Pose {
  x: number
  z: number
  eye: number
  bearing: number
  pitch: number
  yawRange: number
  pitchRange: number
}

function writePose(out: Pose, t: number): void {
  // Before the first stop and after the last, hold the terminal composition.
  if (t <= STOPS[0].t) {
    assign(out, STOPS[0])
    return
  }
  const last = STOPS[STOPS.length - 1]
  if (t >= last.t) {
    assign(out, last)
    return
  }

  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i].t) {
      const a = STOPS[i - 1]
      const b = STOPS[i]
      let raw = (t - a.t) / (b.t - a.t)
      // A dwell holds the pose at the start of the segment, then covers the
      // whole distance in what is left. Scroll keeps responding throughout.
      if (a.dwell) {
        raw = raw <= a.dwell ? 0 : (raw - a.dwell) / (1 - a.dwell)
      }
      const k = smootherstep(raw)
      out.x = a.x + (b.x - a.x) * k
      out.z = a.z + (b.z - a.z) * k
      out.eye = a.eye + (b.eye - a.eye) * k
      out.bearing = lerpBearing(a.bearing, b.bearing, k)
      out.pitch = a.pitch + (b.pitch - a.pitch) * k
      // Free-look tightens while travelling and opens back up at a stop.
      const atRest = 1 - Math.sin(Math.PI * k)
      out.yawRange = (a.yawRange + (b.yawRange - a.yawRange) * k) * (0.55 + 0.45 * atRest)
      out.pitchRange =
        (a.pitchRange + (b.pitchRange - a.pitchRange) * k) * (0.55 + 0.45 * atRest)
      return
    }
  }
}

function assign(out: Pose, s: Stop): void {
  out.x = s.x
  out.z = s.z
  out.eye = s.eye
  out.bearing = s.bearing
  out.pitch = s.pitch
  out.yawRange = s.yawRange
  out.pitchRange = s.pitchRange
}

/**
 * Vertical FOV that keeps a usable HORIZONTAL view in portrait.
 *
 * three's `fov` is vertical, so a tall narrow screen silently crops the world
 * sideways: at 390x844 a 60 degree vertical lens leaves about 30 degrees
 * horizontally, which turns an enormous landscape into a keyhole. Widening the
 * vertical lens buys the horizontal back, but only up to a point — past about
 * 78 degrees the edge distortion costs more than the view gains, and portrait
 * is simply a narrow window.
 *
 * This does NOT break the constant-FOV rule. That rule is about the lens not
 * changing DURING the journey, which would read as a zoom the visitor did not
 * ask for. Fitting the lens to the viewport once is a different thing.
 */
function fovForAspect(aspect: number): number {
  if (aspect >= 1.35) return 60
  const k = Math.max(0, Math.min(1, (1.35 - aspect) / 0.85))
  return 60 + k * 18
}

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const reduced = useReducedMotion()

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (!cam.isPerspectiveCamera) return
    const want = fovForAspect(size.width / Math.max(1, size.height))
    if (Math.abs(cam.fov - want) > 0.01) {
      cam.fov = want
      cam.updateProjectionMatrix()
    }
  }, [camera, size.width, size.height])

  const pose = useMemo<Pose>(
    () => ({
      x: 0,
      z: 0,
      eye: 1.65,
      bearing: 0,
      pitch: 0,
      yawRange: 20,
      pitchRange: 12,
    }),
    []
  )
  const look = useRef({ yaw: 0, pitch: 0 })
  const target = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
      pointer.active = true
      pointer.idle = 0
    }
    const onLeave = () => {
      pointer.active = false
    }
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return
      // Portrait: gamma is the left-right roll of the handset, beta the
      // front-back. In landscape the two swap and one of them inverts.
      const landscape = Math.abs(window.orientation ?? 0) === 90
      const flip = (window.orientation ?? 0) === -90 ? -1 : 1
      const rawYaw = landscape ? e.beta * flip : e.gamma
      const rawPitch = landscape ? -e.gamma * flip : e.beta

      if (!tilt.has) {
        tilt.baseGamma = rawYaw
        tilt.baseBeta = rawPitch
        tilt.has = true
      }
      // Roughly 30 degrees of handset movement covers the full allowance.
      tilt.x = Math.max(-1, Math.min(1, (rawYaw - tilt.baseGamma) / 30))
      tilt.y = Math.max(-1, Math.min(1, (rawPitch - tilt.baseBeta) / 30))
      tilt.active = true
      pointer.idle = 0
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerleave", onLeave)
    window.addEventListener("deviceorientation", onTilt, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("deviceorientation", onTilt)
    }
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    writePose(pose, journey.t)

    // --- position: authored, grounded, never independent of the scroll -----
    camera.position.set(pose.x, groundAt(pose.x, pose.z) + pose.eye, pose.z)

    // --- free look: clamped, eased, and it gives the frame back -----------
    pointer.idle += dt
    // Gyro wins where it exists, because a phone has no pointer to fall back
    // on and a stale pointer reading would fight it.
    const lookX = tilt.active ? tilt.x : pointer.x
    const lookY = tilt.active ? tilt.y : pointer.y
    const wantYaw = reduced ? 0 : lookX * pose.yawRange
    const wantPitch = reduced ? 0 : -lookY * pose.pitchRange
    // After a second and a half of stillness the view returns to the
    // composition the route authored — but a held phone is never truly still,
    // so tilt does not expire.
    const recenter = tilt.active || pointer.idle <= 1.5 ? 1 : 0
    const ease = 1 - Math.exp(-dt * 6)
    look.current.yaw += (wantYaw * recenter - look.current.yaw) * ease
    look.current.pitch += (wantPitch * recenter - look.current.pitch) * ease

    const bearing = ((pose.bearing + look.current.yaw) * Math.PI) / 180
    const pitch = ((pose.pitch + look.current.pitch) * Math.PI) / 180

    // Bearing to direction: north is -Z, east is +X, clockwise from above.
    const cp = Math.cos(pitch)
    target.set(
      camera.position.x + Math.sin(bearing) * cp * 10,
      camera.position.y + Math.sin(pitch) * 10,
      camera.position.z - Math.cos(bearing) * cp * 10
    )
    // up is always +Y: zero roll, stable horizon, forever.
    camera.up.set(0, 1, 0)
    camera.lookAt(target)
  })

  return null
}
