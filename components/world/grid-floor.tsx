import { useRef, useMemo } from "react"
import { useFrame, extend } from "@react-three/fiber"
import * as THREE from "three"
import { shaderMaterial } from "@react-three/drei"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

const GridFloorMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#e8a020"),
    uFogColor: new THREE.Color("#0a0a14"),
    uPulseSpeed: 1.0,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uFogColor;
    uniform float uPulseSpeed;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      // Grid lines from world-space coordinates
      vec2 grid = abs(fract(vWorldPos.xz * 0.5) - 0.5);
      float line = min(grid.x, grid.y);
      float gridAlpha = 1.0 - smoothstep(0.0, 0.03, line);

      // Sonar pulse from center
      float dist = length(vWorldPos.xz);
      float pulse = sin(dist * 0.8 - uTime * uPulseSpeed * 2.0) * 0.5 + 0.5;
      pulse = smoothstep(0.4, 0.6, pulse) * exp(-dist * 0.04);

      // Distance-based fog fade
      float fogFactor = 1.0 - smoothstep(5.0, 40.0, dist);

      // Combine grid + pulse
      float alpha = (gridAlpha * 0.3 + pulse * 0.4) * fogFactor;

      vec3 color = mix(uColor, uColor * 1.5, pulse);
      gl_FragColor = vec4(color, alpha);
    }
  `
)

extend({ GridFloorMaterial })

// Type declaration for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      gridFloorMaterial: THREE.ShaderMaterial & {
        uTime?: number
        uColor?: THREE.Color
        uFogColor?: THREE.Color
        uPulseSpeed?: number
      }
    }
  }
}

export function GridFloor() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const progress = useScrollStore((s) => s.progress)
  const reduced = useReducedMotion()

  useFrame((state) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    // Reduced motion freezes the sonar pulse to a static, crisp grid.
    matRef.current.uniforms.uPulseSpeed.value = reduced ? 0 : 1.0 + progress * 0.5
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -25, 0]}>
      <planeGeometry args={[100, 100, 1, 1]} />
      <gridFloorMaterial
        ref={matRef}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
