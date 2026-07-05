"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { makeRng, seededRange } from "@/lib/prng"
import { FLOOR_ACTIVE_MARGIN } from "@/lib/floors"

// GPU grass. Tens of thousands of blades placed once; the wind lives entirely in
// the vertex shader (one uTime uniform), so the CPU does nothing per blade. The
// realism at golden hour comes from BACKLIGHT: the low sun sits behind the field,
// so the thin blade tips transmit warm light and glow — a cheap translucency term
// (how much you are looking toward the sun through the blade) painted over a green
// body that darkens to the root. Everything dissolves into the same warm haze at
// distance, so the field melts into the mountains instead of ending in a hard ring.

export interface GrassProps {
  seed: string
  count: number
  bounds: { xMin: number; xMax: number; zMin: number; zMax: number }
  nearBias?: number
  heightAt: (x: number, z: number) => number
  /** Per-blade base colour (green, with seeded variation), written into aColor. */
  tone: (x: number, z: number) => THREE.Color
  band: [number, number]
  heightScale?: number
  /** Lighting, matched to the golden-hour scene. */
  sunColor: THREE.Color
  ambient: THREE.Color
  /** Warm glow colour for the backlit tips. */
  rim: THREE.Color
  /** World direction toward the sun (for the translucency term). */
  sunDir: THREE.Vector3
  /** Aerial haze, matched to scene.fog / the sky. */
  fogColor: THREE.Color
  fogNear: number
  fogFar: number
  reduced: boolean
}

const VERT = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec4 aParams;   // x=yaw, y=height, z=phase, w=windSusceptibility
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uMotion;
  uniform vec3 uPointer;
  uniform float uPointerActive;
  varying vec3 vColor;
  varying float vH;
  varying float vDepth;
  varying vec3 vView;
  void main() {
    float yaw = aParams.x;
    float height = aParams.y;
    float phase = aParams.z;
    float susc = aParams.w;
    vH = position.y;
    vColor = aColor;

    vec3 p = position;
    p.xz *= 0.09;
    p.y *= height;
    float s = sin(yaw), c = cos(yaw);
    vec3 r = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
    vec3 wp = aOffset + r;

    // Wind: a broad slow gust times a gentle per-blade sway; tip bends most.
    float gust = sin(uTime * 0.18 - (aOffset.x - aOffset.z) * 0.07) * 0.5 + 0.5;
    float rip = sin(uTime * 0.5 + (aOffset.x + aOffset.z) * 0.13 + phase);
    float bend = uMotion * susc * (0.05 + 0.11 * gust) * rip;
    float h2 = vH * vH;
    wp.x += h2 * bend;
    wp.z += h2 * bend * 0.35;

    // The pointer parts the grass around it — soft, radial, tip-weighted.
    vec2 d = wp.xz - uPointer.xz;
    float dist = length(d);
    float part = uPointerActive * smoothstep(1.6, 0.0, dist) * 0.5;
    wp.xz += normalize(d + vec2(0.0001)) * (h2 * part);

    vec4 world = modelMatrix * vec4(wp, 1.0);
    vView = cameraPosition - world.xyz;          // fragment → camera
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vH;
  varying float vDepth;
  varying vec3 vView;
  uniform vec3 uSunColor;
  uniform vec3 uAmbient;
  uniform vec3 uRim;
  uniform vec3 uSunDir;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  void main() {
    vec3 viewDir = normalize(vView);

    // Body: a LIFTED root (not near-black) so the field reads low-contrast like
    // the photo, warmed by the misty golden light.
    vec3 body = mix(vColor * 0.58, vColor, vH);
    body *= (uAmbient + uSunColor * 0.34);

    // Backlight / translucency: SOFT and broad (not a neon rim) — the diffuse glow
    // of a blade lit from behind in haze, not a hard CG highlight.
    float trans = pow(max(dot(-viewDir, uSunDir), 0.0), 2.4);
    float glow = trans * (0.28 + 0.72 * vH);
    vec3 col = body + uRim * glow * 0.8;

    // Aerial haze — the field melts into the same mist as the mountains, so there
    // is no hard carpet edge between them.
    float fogF = smoothstep(uFogNear, uFogFar, vDepth);
    col = mix(col, uFogColor, fogF);

    gl_FragColor = vec4(col, 1.0);
  }
`

// One unit blade: base at y=0, tip at y=1, tapering to a point.
function bladeGeometry(): THREE.BufferGeometry {
  const segs = 4
  const g = new THREE.PlaneGeometry(1, 1, 1, segs)
  g.translate(0, 0.5, 0)
  const pos = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    pos.setX(i, pos.getX(i) * (1 - y * 0.82))
  }
  pos.needsUpdate = true
  g.deleteAttribute("normal")
  return g
}

export function GrassField({
  seed,
  count,
  bounds,
  nearBias = 1.7,
  heightAt,
  tone,
  band,
  heightScale = 1,
  sunColor,
  ambient,
  rim,
  sunDir,
  fogColor,
  fogNear,
  fogFar,
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
      const zt = Math.pow(seededRange(rng, 0, 1), nearBias)
      const z = zMax - zt * (zMax - zMin)
      offset[i * 3] = x
      offset[i * 3 + 1] = heightAt(x, z)
      offset[i * 3 + 2] = z
      const hScale = 0.4 + 0.6 * Math.min(1, (z - zMin) / (zSpan * 0.4))
      params[i * 4] = seededRange(rng, 0, Math.PI * 2)
      params[i * 4 + 1] = seededRange(rng, 0.4, 1.05) * hScale * heightScale
      params[i * 4 + 2] = seededRange(rng, 0, Math.PI * 2)
      params[i * 4 + 3] = seededRange(rng, 0.7, 1.3)
      const col = tone(x, z)
      color[i * 3] = col.r
      color[i * 3 + 1] = col.g
      color[i * 3 + 2] = col.b
    }
    geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offset, 3))
    geo.setAttribute("aParams", new THREE.InstancedBufferAttribute(params, 4))
    geo.setAttribute("aColor", new THREE.InstancedBufferAttribute(color, 3))
    return geo
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
          uRim: { value: rim },
          uSunDir: { value: sunDir },
          uFogColor: { value: fogColor },
          uFogNear: { value: fogNear },
          uFogFar: { value: fogFar },
        },
      }),
    [sunColor, ambient, rim, sunDir, fogColor, fogNear, fogFar, reduced]
  )

  const bandMid = (band[0] + band[1]) / 2
  useFrame((state) => {
    const m = matRef.current
    if (!m) return
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
