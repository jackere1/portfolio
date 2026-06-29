import * as THREE from "three"
import { SHAFT_HALF } from "@/lib/floors"

const BEAM = 0.12
const SPAN = SHAFT_HALF * 2

/**
 * A floor divider — the square opening between two cells. You descend through it
 * as you pass from one stage into the next: a structural slab with a clear
 * aperture, framed in amber. The cells of the shaft are separated by these.
 */
export function FloorDivider({ y }: { y: number }) {
  return (
    <group position={[0, y, 0]}>
      {/* Square frame: four beams around the aperture */}
      <mesh position={[0, 0, SHAFT_HALF]}>
        <boxGeometry args={[SPAN + BEAM, BEAM, BEAM]} />
        <meshStandardMaterial
          color="#d89018"
          emissive="#e8a020"
          emissiveIntensity={0.35}
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0, -SHAFT_HALF]}>
        <boxGeometry args={[SPAN + BEAM, BEAM, BEAM]} />
        <meshStandardMaterial
          color="#d89018"
          emissive="#e8a020"
          emissiveIntensity={0.35}
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[SHAFT_HALF, 0, 0]}>
        <boxGeometry args={[BEAM, BEAM, SPAN + BEAM]} />
        <meshStandardMaterial
          color="#d89018"
          emissive="#e8a020"
          emissiveIntensity={0.35}
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[-SHAFT_HALF, 0, 0]}>
        <boxGeometry args={[BEAM, BEAM, SPAN + BEAM]} />
        <meshStandardMaterial
          color="#d89018"
          emissive="#e8a020"
          emissiveIntensity={0.35}
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>

      {/* Corner gussets — a touch of machined structure */}
      {(
        [
          [SHAFT_HALF, SHAFT_HALF],
          [SHAFT_HALF, -SHAFT_HALF],
          [-SHAFT_HALF, SHAFT_HALF],
          [-SHAFT_HALF, -SHAFT_HALF],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]}>
          <boxGeometry args={[0.34, 0.22, 0.34]} />
          <meshStandardMaterial
            color="#3a2a12"
            emissive="#e8a020"
            emissiveIntensity={0.13}
            metalness={0.8}
            roughness={0.35}
          />
        </mesh>
      ))}

      {/* A faint inner ledge so the aperture reads as a real opening */}
      <lineSegments>
        <edgesGeometry
          args={[new THREE.BoxGeometry(SPAN - 0.4, 0.02, SPAN - 0.4)]}
        />
        <lineBasicMaterial color="#e8a020" transparent opacity={0.3} />
      </lineSegments>
    </group>
  )
}
