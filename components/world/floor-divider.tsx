import * as THREE from "three"
import { SHAFT_HALF } from "@/lib/floors"
import { PbrMaterial } from "@/lib/textures"

const BEAM = 0.12
const SPAN = SHAFT_HALF * 2

// Concrete storey slab — a ring of poured deck around the open aperture (x,z ∈
// [-4,4]) you descend through. Kept outside the stage box so it never occludes.
const SLAB_T = 0.5 // slab thickness (Y)
const INNER = 4 // aperture half-extent
const BORDER = SHAFT_HALF - 0.1 - INNER // ~0.9, clear of the amber edge beams
const BORDER_MID = INNER + BORDER / 2 // ~4.45
const slabFlat = { flatColor: "#3a3a3e", flatRoughness: 0.96, metalness: 0 }

function StoreySlab() {
  return (
    <group>
      {/* front / back run the full width so the corners are filled */}
      <mesh position={[0, 0, -BORDER_MID]}>
        <boxGeometry args={[SPAN, SLAB_T, BORDER]} />
        <PbrMaterial name="concrete-foundation" repeat={[2, 1]} {...slabFlat} />
      </mesh>
      <mesh position={[0, 0, BORDER_MID]}>
        <boxGeometry args={[SPAN, SLAB_T, BORDER]} />
        <PbrMaterial name="concrete-foundation" repeat={[2, 1]} {...slabFlat} />
      </mesh>
      {/* left / right span only the gap between front and back */}
      <mesh position={[-BORDER_MID, 0, 0]}>
        <boxGeometry args={[BORDER, SLAB_T, INNER * 2]} />
        <PbrMaterial name="concrete-foundation" repeat={[1, 2]} {...slabFlat} />
      </mesh>
      <mesh position={[BORDER_MID, 0, 0]}>
        <boxGeometry args={[BORDER, SLAB_T, INNER * 2]} />
        <PbrMaterial name="concrete-foundation" repeat={[1, 2]} {...slabFlat} />
      </mesh>
    </group>
  )
}

/**
 * A floor divider — the storey slab between two cells. You descend through its
 * open aperture as you pass from one floor into the next. Underground it is a
 * poured-concrete deck framed in amber trim; above ground (the open mouth of the
 * shaft) only the amber frame appears.
 */
export function FloorDivider({ y, concrete = true }: { y: number; concrete?: boolean }) {
  return (
    <group position={[0, y, 0]}>
      {concrete && <StoreySlab />}
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
