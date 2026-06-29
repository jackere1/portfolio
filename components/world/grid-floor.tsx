import { useRef } from "react"
import { extend } from "@react-three/fiber"
import * as THREE from "three"
import { shaderMaterial } from "@react-three/drei"

// A quiet, static grid that dissolves into the void with distance — no hard
// plane edge, no sonar gimmick. The deterministic ground beneath the lattice.
const GridFloorMaterial = shaderMaterial(
  {
    uColor: new THREE.Color("#e8a020"),
  },
  // Vertex
  `
    varying vec3 vWorldPos;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  // Fragment
  `
    uniform vec3 uColor;
    varying vec3 vWorldPos;

    void main() {
      vec2 grid = abs(fract(vWorldPos.xz * 0.5) - 0.5);
      float line = min(grid.x, grid.y);
      float gridAlpha = 1.0 - smoothstep(0.0, 0.04, line);

      // Radial dissolve — fade fully to nothing well before the plane ends.
      float dist = length(vWorldPos.xz);
      float fade = exp(-dist * 0.055);

      float alpha = gridAlpha * 0.4 * fade;
      gl_FragColor = vec4(uColor, alpha);
    }
  `
)

extend({ GridFloorMaterial })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      gridFloorMaterial: THREE.ShaderMaterial & {
        uColor?: THREE.Color
      }
    }
  }
}

export function GridFloor() {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -26, 0]}>
      <planeGeometry args={[120, 120, 1, 1]} />
      <gridFloorMaterial
        ref={matRef}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
