"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { journey } from "@/hooks/use-journey"
import { STOPS, type Stop } from "@/lib/stops"
import { heightAt } from "@/lib/heightfield"
import { GER_RADIUS } from "@/lib/world"
import { createSunState, writeSunState } from "@/lib/sun-arc"
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
 * Device orientation — a MAGIC WINDOW, not a tilt slider.
 *
 * The first version of this treated the handset like a mouse: it read `beta`
 * and `gamma` and drove the same clamped ±yawRange offset the pointer drives.
 * That fails in the way a phone owner notices immediately. `gamma` is the
 * handset's ROLL, so "look left" became a steering-wheel gesture; `alpha` was
 * never read at all, so physically turning your body did nothing; and the whole
 * thing was scaled into a ~20 degree allowance, so 50 degrees of real rotation
 * bought about 13 degrees of view. It was measurable: turning the phone through
 * a full 180 degrees moved the camera by exactly zero.
 *
 * So the sensor now drives the camera's ORIENTATION directly, through the
 * canonical device-orientation quaternion, and the numbers below are angles in
 * RADIANS in three's own frame rather than normalised nudges.
 *
 * `yaw` is a RELATIVE accumulator and `pitch` is measured against a neutral
 * captured on the first reading. Both are deliberate:
 *
 *  - Android's `deviceorientation` is backed by the GAME_ROTATION_VECTOR, which
 *    does not use the magnetometer and so is not distorted by whatever steel is
 *    in the room. Its `alpha` origin is therefore arbitrary and drifts, which
 *    makes it useless as a heading and perfect as a relative rate. Accumulating
 *    deltas is what makes that arbitrariness a non-issue.
 *  - A hand-held phone is not a headset. People hold one at 50–70 degrees of
 *    beta, and a phone held upright reads as the horizon, so treating pitch as
 *    absolute (which is what A-Frame does) starts most visitors staring 30
 *    degrees into the dirt. The neutral is what buys the authored composition.
 */
const tilt = {
  active: false,
  /** Accumulated yaw since the first reading, radians, + is turning left. */
  yaw: 0,
  /** Current device pitch, radians, and the neutral it is measured against. */
  pitch: 0,
  basePitch: 0,
  has: false,
  hasYaw: false,
  lastDevYaw: 0,
  /** Which event won. Relative is preferred; absolute is the fallback for
   *  handsets that only ever fire that one. */
  source: "" as "" | "deviceorientation" | "deviceorientationabsolute",
}

/**
 * Where the YXZ decomposition stops being trustworthy.
 *
 * Pointing a phone at the zenith is the gimbal singularity: yaw and roll become
 * the same axis and the split between them is arbitrary, so the accumulated
 * heading can spin wildly for a rotation the user did not perform. Straight up
 * is not a hypothetical here — it is stop 09, where the whole subject is the
 * Milky Way overhead. Above this the heading simply holds.
 */
const YAW_RELIABLE_PITCH = (78 * Math.PI) / 180

/**
 * iOS 13+ gates DeviceOrientationEvent behind a user gesture. Called from the
 * entry click, which is already being spent on the AudioContext.
 *
 * NOTE: `requestPermission` is no longer an iOS tell — Chrome shipped it on
 * desktop and Android in the 151/152 window. Chrome's sensor permission still
 * defaults to allow, so this resolves "granted" without a prompt and returns
 * "denied" only when the user has actually turned motion sensors off, which is
 * the answer we want either way.
 */
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

const DEG = Math.PI / 180

// --- the canonical device-orientation quaternion -----------------------------
// Preallocated: this runs on every sensor reading and every frame.
const zAxis = new THREE.Vector3(0, 0, 1)
/** -90 degrees about X. The sensor frame has +Z out of the SCREEN, but a camera
 *  looks out of the BACK of the handset, which is the other way up. */
const qScreenFlip = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2)
const devEuler = new THREE.Euler()
const devQuat = new THREE.Quaternion()
const qScreenSpin = new THREE.Quaternion()
const decomposed = new THREE.Euler()

/**
 * (alpha, beta, gamma, screen angle) -> orientation, in three's frame.
 *
 * The spec's angles are an intrinsic Z-X'-Y'' sequence, which is `YXZ` read the
 * other way round, and `gamma` is negated because the spec's Y'' is the
 * opposite sense to three's Z. Then the handset is flipped to face out of its
 * own back, and finally spun by the screen rotation so that turning the phone
 * into landscape does not tip the world over.
 */
function writeDeviceQuaternion(
  out: THREE.Quaternion,
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenDeg: number
): THREE.Quaternion {
  devEuler.set(betaDeg * DEG, alphaDeg * DEG, -gammaDeg * DEG, "YXZ")
  out.setFromEuler(devEuler)
  out.multiply(qScreenFlip)
  out.multiply(qScreenSpin.setFromAxisAngle(zAxis, -screenDeg * DEG))
  return out
}

/**
 * Screen rotation in degrees, 0/90/180/270.
 *
 * `window.orientation` is deprecated and gone from Chrome on Android, and its
 * convention is INVERTED from the replacement — it reports -90 where
 * `screen.orientation.angle` reports 270 — so it cannot simply be swapped in.
 * Normalising into 0..360 makes the two agree.
 */
function screenAngle(): number {
  const angle = window.screen?.orientation?.angle
  if (typeof angle === "number") return angle
  const legacy = (window as unknown as { orientation?: number }).orientation
  return typeof legacy === "number" ? (legacy + 360) % 360 : 0
}

/** Shortest way round the circle, in radians. */
function wrapPi(a: number): number {
  return ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI
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
  /** Free-look offset, RADIANS, damped. Both paths write it. */
  const look = useRef({ yaw: 0, pitch: 0 })
  const lastT = useRef(0)
  const camEuler = useMemo(() => new THREE.Euler(), [])
  const sun = useMemo(() => createSunState(), [])

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
      const { alpha, beta, gamma } = e
      // A handset with no sensors still fires the event, with nothing in it.
      if (alpha === null && beta === null && gamma === null) return

      // Relative wins where it exists: it is gyro-backed, so it neither needs
      // the magnetometer nor gets bent by it. Once it has spoken, the absolute
      // event is ignored so the two can never interleave.
      const type = e.type as typeof tilt.source
      if (tilt.source === "deviceorientation" && type !== "deviceorientation") return
      tilt.source = type

      writeDeviceQuaternion(
        devQuat,
        alpha ?? 0,
        beta ?? 0,
        gamma ?? 0,
        screenAngle()
      )
      decomposed.setFromQuaternion(devQuat, "YXZ")
      // three's YXZ: x is pitch, y is yaw, z is roll.
      const devPitch = decomposed.x
      const devYaw = decomposed.y

      if (!tilt.has) {
        tilt.basePitch = devPitch
        tilt.has = true
      }
      tilt.pitch = devPitch

      // Integrate yaw rather than reading it, so an arbitrary and drifting
      // alpha origin never matters — and hold it near the poles, where the
      // decomposition cannot say what is yaw and what is roll.
      if (Math.abs(devPitch) < YAW_RELIABLE_PITCH) {
        if (tilt.hasYaw) tilt.yaw += wrapPi(devYaw - tilt.lastDevYaw)
        tilt.lastDevYaw = devYaw
        tilt.hasYaw = true
      } else {
        tilt.hasYaw = false
      }

      tilt.active = true
      pointer.idle = 0
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerleave", onLeave)
    window.addEventListener("deviceorientation", onTilt, { passive: true })
    window.addEventListener("deviceorientationabsolute", onTilt, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("deviceorientation", onTilt)
      window.removeEventListener("deviceorientationabsolute", onTilt)
    }
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const t = journey.t
    writePose(pose, t)

    // --- position: authored, grounded, never independent of the scroll -----
    camera.position.set(pose.x, groundAt(pose.x, pose.z) + pose.eye, pose.z)

    // How fast the journey itself is moving. Used only to re-aim the free look.
    const speed = Math.abs(t - lastT.current) / Math.max(dt, 1e-4)
    lastT.current = t
    pointer.idle += dt

    let wantYaw = 0
    let wantPitch = 0

    if (reduced) {
      // Stated preference; the authored composition and nothing else.
    } else if (tilt.active) {
      // --- the magic window ------------------------------------------------
      // Travelling walks the neutral gently back toward the authored frame, so
      // a visitor who turned right around while parked is re-aimed by the act
      // of moving on and can never end up permanently lost facing empty
      // steppe. It runs ONLY while the scroll is already moving the world, so
      // it is never motion the visitor did not ask for — which is the whole
      // anti-nausea contract, kept.
      const travel = Math.min(1, speed / 0.02)
      if (travel > 0) {
        const bleed = 1 - Math.exp(-dt * 1.1 * travel)
        tilt.yaw -= tilt.yaw * bleed
        tilt.basePitch += (tilt.pitch - tilt.basePitch) * bleed
      }
      wantYaw = tilt.yaw
      wantPitch = tilt.pitch - tilt.basePitch
    } else {
      // --- pointer: clamped, eased, and it gives the frame back ------------
      // After a second and a half of stillness the view returns to the
      // composition the route authored.
      const recenter = pointer.idle <= 1.5 ? 1 : 0
      wantYaw = -pointer.x * pose.yawRange * DEG * recenter
      wantPitch = -pointer.y * pose.pitchRange * DEG * recenter
    }

    // Head tracking has to feel attached to the hand. ~45 ms of time constant
    // is enough to swallow sensor jitter and far too little to read as lag;
    // the pointer keeps the softer world damping.
    const ease = 1 - Math.exp(-dt * (tilt.active ? 22 : 6))
    look.current.yaw += (wantYaw - look.current.yaw) * ease
    look.current.pitch += (wantPitch - look.current.pitch) * ease

    // Rotating about +Y takes +x toward -Z, so a compass bearing is a NEGATIVE
    // yaw. North is -Z, east is +X, clockwise from above.
    const yaw = -pose.bearing * DEG + look.current.yaw
    let pitch = pose.pitch * DEG + look.current.pitch

    // --- the crown may not be looked through once the stars are up ---------
    // Stars seen through an uncovered toono read as poverty, and the camera is
    // still inside the ger for a stretch where starOpacity has already lifted
    // off zero while the urkh is only half drawn. Looking up at the LAST BLUE
    // is the entire subject of stop 07 and stays completely free — the ceiling
    // only closes as the stars actually arrive, which is exactly when a
    // household would be drawing the felt across anyway.
    if (Math.hypot(pose.x, pose.z) < GER_RADIUS) {
      writeSunState(sun, t)
      if (sun.starOpacity > 0.02) {
        const k = Math.min(1, (sun.starOpacity - 0.02) / 0.1)
        pitch = Math.min(pitch, (88 - 48 * k) * DEG)
      }
    }
    pitch = Math.max(-88 * DEG, Math.min(88 * DEG, pitch))

    // Zero roll, always. A-Frame passes the handset's roll straight through,
    // and for a headset that is right — but this is a hand-held phone under a
    // screen-space chrome layer, so a rolling world would either tilt the
    // horizon under level instruments or force the mark to counter-rotate, and
    // the mark is not allowed to rotate.
    camEuler.set(pitch, yaw, 0, "YXZ")
    camera.quaternion.setFromEuler(camEuler)
    camera.up.set(0, 1, 0)
  })

  return null
}
