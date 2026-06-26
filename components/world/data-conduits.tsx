import { useRef, useMemo } from "react"
import { useFrame, extend } from "@react-three/fiber"
import * as THREE from "three"
import { shaderMaterial } from "@react-three/drei"
import { useScrollStore, getSectionProgress } from "@/hooks/use-scroll-store"
import { makeRng, seededDrift } from "@/lib/prng"
import { CONDUIT_DRIFT_MAX } from "@/lib/world-config"

const DataFlowMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#e8a020"),
    uSpeed: 1.0,
    uOpacity: 1.0,
  },
  // Vertex
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uSpeed;
    uniform float uOpacity;
    varying vec2 vUv;

    void main() {
      // Flowing energy pulse along U axis
      float pulse = sin((vUv.x - uTime * uSpeed) * 12.0) * 0.5 + 0.5;
      pulse = smoothstep(0.3, 0.7, pulse);

      // Hot center
      float center = 1.0 - abs(vUv.y - 0.5) * 2.0;
      center = pow(center, 2.0);

      float alpha = pulse * center * uOpacity;

      // Color: amber core with white-hot center
      vec3 col = mix(uColor, vec3(1.0, 0.95, 0.8), pulse * center * 0.5);

      gl_FragColor = vec4(col, alpha);
    }
  `
)

extend({ DataFlowMaterial })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      dataFlowMaterial: THREE.ShaderMaterial & {
        uTime?: number
        uColor?: THREE.Color
        uSpeed?: number
        uOpacity?: number
      }
    }
  }
}

interface ConduitProps {
  start: THREE.Vector3
  end: THREE.Vector3
  index: number
  thickness?: number
}

function Conduit({ start, end, index, thickness = 0.03 }: ConduitProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const progress = useScrollStore((s) => s.progress)
  const velocity = useScrollStore((s) => s.velocity)

  // Create a tube following a curve between start and end
  const { geometry } = useMemo(() => {
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5)
    // Seeded, clamped curvature — reproducible across loads.
    const rng = makeRng(`conduit-${index}`)
    mid.x += seededDrift(rng, CONDUIT_DRIFT_MAX)
    mid.y += seededDrift(rng, CONDUIT_DRIFT_MAX * 0.6)
    mid.z += seededDrift(rng, CONDUIT_DRIFT_MAX)

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    const geo = new THREE.TubeGeometry(curve, 32, thickness, 8, false)
    return { geometry: geo }
  }, [start, end, thickness, index])

  useFrame((state) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uSpeed.value = 1.0 + velocity * 100
    // Fade in as you approach the boundary — the bridges across the seam.
    const boundaryP = getSectionProgress(progress, "boundary")
    matRef.current.uniforms.uOpacity.value = Math.min(1, boundaryP * 3)
  })

  return (
    <mesh geometry={geometry}>
      <dataFlowMaterial
        ref={matRef}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export function DataConduits() {
  const core = new THREE.Vector3(0, 0, 0)

  // Conduits from core to experience monolith positions
  const conduits = useMemo(() => {
    const data: { start: THREE.Vector3; end: THREE.Vector3 }[] = []
    const count = 8
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = 5
      data.push({
        start: core.clone(),
        end: new THREE.Vector3(
          Math.cos(angle) * radius,
          -2,
          Math.sin(angle) * radius
        ),
      })
    }
    // A few conduits going down to lower sections
    data.push({
      start: core.clone(),
      end: new THREE.Vector3(2, -10, 3),
    })
    data.push({
      start: core.clone(),
      end: new THREE.Vector3(-3, -10, -2),
    })
    data.push({
      start: new THREE.Vector3(0, -10, 0),
      end: new THREE.Vector3(0, -18, 0),
    })
    return data
  }, [])

  return (
    <>
      {conduits.map((c, i) => (
        <Conduit key={i} index={i} start={c.start} end={c.end} />
      ))}
    </>
  )
}
