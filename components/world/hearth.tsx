"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { journey } from "@/hooks/use-journey"
import { createSunState, writeSunState } from "@/lib/sun-arc"
import { makeRng } from "@/lib/prng"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

// The fire inside, and what escapes of it.
//
// This is where the site's whole identity stops being a styling decision and
// becomes physics: amber leaking out of a navy world, because there is a dung
// fire in there and the sun has gone. Nothing here is painted on — the seams
// and the crown are emissive ABOVE 1.0, which is what makes bloom (running
// after exposure, at a threshold of 1.0) pick them and nothing else.
//
// It all rides one clamped seeded noise stream, so the flame, the light and
// everything the light touches inhale together rather than flickering
// independently, which is the tell that gives away a fake fire.

/** Seeded flicker: a sum of incommensurate sines, so it never repeats and
 *  never leaves [0,1]. No Math.random, and nothing unbounded. */
function makeFlicker(seed: string) {
  const rng = makeRng(seed)
  const a = 0.6 + rng() * 0.5
  const b = 1.7 + rng() * 0.9
  const c = 4.3 + rng() * 1.7
  const pa = rng() * 6.28
  const pb = rng() * 6.28
  const pc = rng() * 6.28
  return (t: number) => {
    const v =
      Math.sin(t * a + pa) * 0.5 +
      Math.sin(t * b + pb) * 0.32 +
      Math.sin(t * c + pc) * 0.18
    // v is in [-1,1]; bias so the fire mostly burns steady and occasionally dips.
    return 0.78 + 0.22 * Math.max(-1, Math.min(1, v))
  }
}

const SMOKE_VERT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2  uWindDir;
  varying float vUp;
  varying float vRadial;

  void main() {
    vUp = uv.y;
    vRadial = abs(uv.x - 0.5) * 2.0;

    vec3 p = position;

    // A column widens as it rises and loses its shape to the air.
    float widen = 1.0 + vUp * vUp * 5.5;
    p.xz *= widen;

    // At dusk the wind drops and the smoke stands almost straight — so the
    // lean is small and mostly shows in the upper column.
    float drift = vUp * vUp * 1.5;
    p.x += uWindDir.x * drift;
    p.z += uWindDir.y * drift;

    // Slow curl, amplitude growing with height. Clamped, seeded by position.
    float w = sin(uTime * 0.45 + vUp * 3.1) * 0.16 +
              sin(uTime * 0.27 - vUp * 5.7) * 0.09;
    p.x += w * vUp * 1.4;
    p.z += cos(uTime * 0.38 + vUp * 4.2) * 0.12 * vUp * 1.4;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const SMOKE_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uOpacity;
  varying float vUp;
  varying float vRadial;

  void main() {
    // Dense and tight at the chimney, gone by the top.
    float body = (1.0 - smoothstep(0.0, 1.0, vUp));
    // Soft edges, so the column has no silhouette.
    float edge = 1.0 - smoothstep(0.25, 1.0, vRadial);
    float a = body * body * edge * uOpacity;
    gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
  }
`

export function Hearth({
  position,
  toonoY,
  toonoRadius,
  chimneyTop,
}: {
  position: [number, number, number]
  toonoY: number
  toonoRadius: number
  chimneyTop: number
}) {
  const reduced = useReducedMotion()
  const sun = useMemo(() => createSunState(), [])
  const flicker = useMemo(() => makeFlicker("hearth-host"), [])

  const lightRef = useRef<THREE.PointLight>(null)
  const crownRef = useRef<THREE.Mesh>(null)
  const seamRefs = useRef<THREE.Mesh[]>([])
  const smokeRef = useRef<THREE.ShaderMaterial>(null)
  const clock = useRef(0)

  const smokeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWindDir: { value: new THREE.Vector2(0.87, 0.49).normalize() },
      uColor: { value: new THREE.Color(0.17, 0.16, 0.15) },
      uOpacity: { value: 0.5 },
    }),
    []
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    if (!reduced) clock.current += dt
    writeSunState(sun, journey.t)

    // The fire is always burning — but you only SEE it once the sun has given
    // up. Ramps in across civil twilight, exactly as it does in life.
    const night = Math.max(
      0,
      Math.min(1, (2.0 - sun.elevationDeg) / 8)
    )
    const f = reduced ? 0.85 : flicker(clock.current)

    if (lightRef.current) {
      lightRef.current.intensity = night * 5.2 * f
    }
    // Emissive intensity is pushed above 1 so that bloom finds it. Below 1 it
    // is just a slightly orange polygon and the whole effect is gone.
    if (crownRef.current) {
      const m = crownRef.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = night * 1.7 * f
    }
    for (const s of seamRefs.current) {
      if (!s) continue
      const m = s.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = night * 1.9 * f
    }
    if (smokeRef.current) {
      smokeRef.current.uniforms.uTime.value = clock.current
      // Smoke reads against a bright sky and vanishes into a dark one.
      smokeRef.current.uniforms.uOpacity.value = 0.05 + 0.30 * (1 - night)
    }
  })

  const registerSeam = (i: number) => (el: THREE.Mesh | null) => {
    if (el) seamRefs.current[i] = el
  }

  return (
    <group position={position}>
      {/* The stove itself, standing under the crown. */}
      <mesh position={[0, 0.3, 0.22]} castShadow>
        <cylinderGeometry args={[0.19, 0.21, 0.6, 12]} />
        <meshStandardMaterial
          color="#2e2c2a"
          roughness={0.55}
          metalness={0.6}
        />
      </mesh>

      {/* One warm source. It is the only light in the world after stop 05. */}
      <pointLight
        ref={lightRef}
        position={[0, 0.55, 0.22]}
        color="#ff9a3c"
        distance={9}
        decay={2}
        intensity={0}
      />

      {/* The crown, lit from below: the glow that says someone is home, seen
          from outside long before you reach the door. */}
      <mesh
        ref={crownRef}
        position={[0, toonoY - 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[toonoRadius * 0.94, 24]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#ff9436"
          emissiveIntensity={0}
          roughness={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Door seams. Thin, and the reason stop 05's signature image works:
          amber bleeding through joinery onto blue-hour canvas. */}
      <mesh ref={registerSeam(0)} position={[0, 0.82, 2.815]}>
        <boxGeometry args={[0.009, 1.32, 0.01]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#ffa348"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh ref={registerSeam(1)} position={[0, 0.115, 2.822]}>
        <boxGeometry args={[0.70, 0.009, 0.01]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#ffa348"
          emissiveIntensity={0}
        />
      </mesh>

      {/* Chimney smoke. Rising dead straight in the evening calm is one of the
          keystone signals that a camp is inhabited, and it is legible from a
          hundred metres out — which is exactly where stop 01 stands. */}
      <mesh position={[0, chimneyTop + 3.5, 0.22]} renderOrder={2}>
        <cylinderGeometry args={[0.075, 0.05, 7, 14, 24, true]} />
        <shaderMaterial
          ref={smokeRef}
          vertexShader={SMOKE_VERT}
          fragmentShader={SMOKE_FRAG}
          uniforms={smokeUniforms}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
          fog={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
