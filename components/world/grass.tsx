"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { makeRng, seededRange } from "@/lib/prng"
import { FLOOR_ACTIVE_MARGIN } from "@/lib/floors"

// GPU grass. Tens of thousands of blades placed once; the wind lives entirely
// in the vertex shader (one uTime uniform), so the CPU does nothing per blade —
// this is what lets the field be lush and dense and still run smooth. The blade
// silhouette is real tapered geometry (no alpha, no overdraw), lit cheaply from
// uniforms with darker roots and warmer, brighter tips.

export interface GrassProps {
  seed: string
  count: number
  /** Placement bounds in world space. */
  bounds: { xMin: number; xMax: number; zMin: number; zMax: number }
  /** Bias placement toward the camera (larger z). 1 = uniform, >1 = denser near. */
  nearBias?: number
  /** Ground height at a world (x,z). */
  heightAt: (x: number, z: number) => number
  /** Grass tone at a world (x,z), 0..1 → green..gold, written into aColor. */
  tone: (x: number, z: number) => THREE.Color
  /** Vertical band [yLo, yHi] the pointer must fall in to part the grass. */
  band: [number, number]
  /** Scales blade height (shorter = less overdraw on software rasterizers). */
  heightScale?: number
  /** Lighting, matched to the scene's sun/sky. */
  sunColor: THREE.Color
  ambient: THREE.Color
  tipWarm: THREE.Color
  reduced: boolean
}

const VERT = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec4 aParams;   // x=yaw, y=height, z=phase, w=windSusceptibility
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uMotion;    // 0 freezes the wind (reduced motion)
  uniform vec3 uPointer;    // ground point under the cursor
  uniform float uPointerActive;
  varying vec3 vColor;
  varying float vH;
  void main() {
    float yaw = aParams.x;
    float height = aParams.y;
    float phase = aParams.z;
    float susc = aParams.w;
    vH = position.y;               // 0 at the root, 1 at the tip
    vColor = aColor;

    // Unit blade → scaled, then spun to its heading.
    vec3 p = position;
    p.xz *= 0.075;
    p.y *= height;
    float s = sin(yaw), c = cos(yaw);
    vec3 r = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
    vec3 wp = aOffset + r;

    // Wind: a broad travelling gust (very slow, world-space) times a gentle
    // per-blade sway. Kept low and unhurried — a calm breeze, not a storm. The
    // tip bends most (vH^2); the root stays planted.
    float gust = sin(uTime * 0.16 - (aOffset.x - aOffset.z) * 0.07) * 0.5 + 0.5;
    float rip = sin(uTime * 0.45 + (aOffset.x + aOffset.z) * 0.13 + phase);
    float bend = uMotion * susc * (0.045 + 0.09 * gust) * rip;
    float h2 = vH * vH;
    wp.x += h2 * bend;
    wp.z += h2 * bend * 0.35;

    // The pointer parts the grass around it — soft, radial, tip-weighted.
    vec2 d = wp.xz - uPointer.xz;
    float dist = length(d);
    float part = uPointerActive * smoothstep(1.6, 0.0, dist) * 0.55;
    wp.xz += normalize(d + vec2(0.0001)) * (h2 * part);

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(wp, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vH;
  uniform vec3 uSunColor;
  uniform vec3 uAmbient;
  uniform vec3 uTipWarm;
  void main() {
    // Darker at the root (self-shadow), brighter and a touch warmer at the tip
    // where the light catches it.
    vec3 tip = mix(vColor, uTipWarm, 0.28) * 1.12;
    vec3 col = mix(vColor * 0.5, tip, vH);
    col *= (uAmbient + uSunColor);
    gl_FragColor = vec4(col, 1.0);
  }
`

// One unit blade: base at y=0, tip at y=1, tapering to a point, a few vertical
// segments so the shader can bend it into a smooth curve.
function bladeGeometry(): THREE.BufferGeometry {
  const segs = 4
  const g = new THREE.PlaneGeometry(1, 1, 1, segs)
  g.translate(0, 0.5, 0)
  const pos = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    pos.setX(i, pos.getX(i) * (1 - y * 0.85)) // taper toward the tip
  }
  pos.needsUpdate = true
  g.deleteAttribute("normal")
  return g
}

export function GrassField({
  seed,
  count,
  bounds,
  nearBias = 1.6,
  heightAt,
  tone,
  band,
  heightScale = 1,
  sunColor,
  ambient,
  tipWarm,
  reduced,
}: GrassProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const pointerPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -((band[0] + band[1]) / 2)),
    [band]
  )
  const pointerHit = useMemo(() => new THREE.Vector3(), [])

  const geometry = useMemo(() => {
    const blade = bladeGeometry()
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = blade.index
    geo.setAttribute("position", blade.attributes.position)
    geo.instanceCount = count

    const rng = makeRng(`grass-${seed}`)
    const offset = new Float32Array(count * 3)
    const params = new Float32Array(count * 4)
    const color = new Float32Array(count * 3)
    const { xMin, xMax, zMin, zMax } = bounds
    const zSpan = zMax - zMin
    for (let i = 0; i < count; i++) {
      const x = seededRange(rng, xMin, xMax)
      // Bias toward the camera (larger z) so the field is densest underfoot.
      const zt = Math.pow(seededRange(rng, 0, 1), nearBias)
      const z = zMax - zt * (zMax - zMin)
      offset[i * 3] = x
      offset[i * 3 + 1] = heightAt(x, z)
      offset[i * 3 + 2] = z
      // Blades shrink toward the far edge so the field melts into the textured
      // ground rather than ending in a hard ring of tall grass.
      const hScale = 0.3 + 0.7 * Math.min(1, (z - zMin) / (zSpan * 0.4))
      params[i * 4] = seededRange(rng, 0, Math.PI * 2) // yaw
      // Mixed heights read as a natural sward — short tufts among taller blades.
      params[i * 4 + 1] = seededRange(rng, 0.14, 0.52) * hScale * heightScale // height
      params[i * 4 + 2] = seededRange(rng, 0, Math.PI * 2) // phase
      params[i * 4 + 3] = seededRange(rng, 0.7, 1.3) // wind susceptibility
      const col = tone(x, z)
      color[i * 3] = col.r
      color[i * 3 + 1] = col.g
      color[i * 3 + 2] = col.b
    }
    geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offset, 3))
    geo.setAttribute("aParams", new THREE.InstancedBufferAttribute(params, 4))
    geo.setAttribute("aColor", new THREE.InstancedBufferAttribute(color, 3))
    return geo
    // heightAt/tone are stable closures for a given terrain; seed+count+bounds drive rebuilds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, count, bounds, nearBias, heightScale])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uMotion: { value: reduced ? 0 : 1 },
          uPointer: { value: new THREE.Vector3(0, -999, 0) },
          uPointerActive: { value: 0 },
          uSunColor: { value: sunColor },
          uAmbient: { value: ambient },
          uTipWarm: { value: tipWarm },
        },
      }),
    [sunColor, ambient, tipWarm, reduced]
  )

  const bandMid = (band[0] + band[1]) / 2
  useFrame((state) => {
    const m = matRef.current
    if (!m) return
    // Freeze the wind (and skip the pointer raycast) when the floor is off-screen.
    if (Math.abs(state.camera.position.y - bandMid) > FLOOR_ACTIVE_MARGIN) return
    m.uniforms.uTime.value = state.clock.elapsedTime
    m.uniforms.uMotion.value = reduced ? 0 : 1
    if (reduced) {
      m.uniforms.uPointerActive.value = 0
      return
    }
    state.raycaster.setFromCamera(state.pointer, state.camera)
    const hit = state.raycaster.ray.intersectPlane(pointerPlane, pointerHit)
    if (hit) {
      m.uniforms.uPointer.value.copy(pointerHit)
      m.uniforms.uPointerActive.value = 1
    } else {
      m.uniforms.uPointerActive.value = 0
    }
  })

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  )
}
