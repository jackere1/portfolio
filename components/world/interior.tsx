"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { makeRng, seededDrift, seededRange } from "@/lib/prng"
import { GER_RADIUS } from "@/lib/world"

// The inside of a ger is a fixed map, and every position on it means something.
// This is not decoration — putting the wrong thing in the wrong place is the
// same class of error as facing the door the wrong way.
//
//   NORTH (khoimor)  the honoured back: chests, the altar, family photographs.
//                    A guest is led toward it; the head of the household sits
//                    nearest it.
//   WEST             the men's and the GUESTS' side. Tack, and where a visitor
//                    is seated. The camera sits here at stop 07.
//   EAST             the women's and the family's side. Cooking, water, milk,
//                    the khokhuur.
//   CENTRE           the hearth, гал голомт, the sacred centre of the house.
//
// The fire taboos are live and specific, and they are a standing constraint on
// anything added here later: never pour water on it, never put a knife or any
// sharp thing into it, never throw rubbish in it, never let milk fall into it.
// Nothing in this scene may ever be shown going into the fire.

const WOOD = "#a8571c"
const WOOD_DARK = "#7c3f14"
const FELT = "#6b6152"

export function Interior() {
  const rng = useMemo(() => makeRng("ger-interior"), [])

  // Floor: boards under a felt, not the terrain plane showing through.
  const floor = useMemo(() => {
    const g = new THREE.CircleGeometry(GER_RADIUS - 0.06, 40)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  const chests = useMemo(
    () =>
      [-0.72, 0.72].map((x) => ({
        x: x + seededDrift(rng, 0.04),
        z: -2.02 + seededDrift(rng, 0.05),
        rot: seededDrift(rng, 0.03),
      })),
    [rng]
  )

  return (
    <group>
      {/* --- the floor ---------------------------------------------------- */}
      <mesh geometry={floor} position={[0, 0.012, 0]} receiveShadow>
        <meshStandardMaterial color={FELT} roughness={0.98} metalness={0} />
      </mesh>

      {/* --- khoimor: the honoured north ---------------------------------- */}
      {chests.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[0, c.rot, 0]}>
          <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.16, 0.64, 0.46]} />
            <meshStandardMaterial color={WOOD} roughness={0.66} metalness={0} />
          </mesh>
          {/* Painted trim, picked out darker. */}
          <mesh position={[0, 0.44, 0.235]}>
            <boxGeometry args={[1.0, 0.16, 0.006]} />
            <meshStandardMaterial
              color={WOOD_DARK}
              roughness={0.6}
              metalness={0}
            />
          </mesh>
        </group>
      ))}
      {/* The altar shelf, with framed photographs — every ger has them. */}
      <mesh position={[0, 0.78, -2.12]} castShadow>
        <boxGeometry args={[1.5, 0.05, 0.3]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.62} />
      </mesh>
      {[-0.36, 0.0, 0.36].map((x, i) => (
        <mesh
          key={i}
          position={[x, 0.92, -2.16 + seededDrift(rng, 0.01)]}
          rotation={[seededRange(rng, 0.06, 0.13), seededDrift(rng, 0.12), 0]}
          castShadow
        >
          <boxGeometry args={[0.2, 0.26, 0.018]} />
          <meshStandardMaterial color="#c8a76a" roughness={0.5} />
        </mesh>
      ))}

      {/* --- beds, against the north-west and north-east ------------------- */}
      {[
        { x: -1.82, z: -1.18, r: 0.62 },
        { x: 1.82, z: -1.18, r: -0.62 },
      ].map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.r, 0]}>
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.7, 0.44, 0.78]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.72} />
          </mesh>
          {/* Folded bedding, stacked at one end. */}
          <mesh position={[-0.5, 0.56, 0]} castShadow>
            <boxGeometry args={[0.6, 0.24, 0.7]} />
            <meshStandardMaterial color="#7d6a52" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* --- the guests' side: a low table and two stools, WEST ------------ */}
      <group position={[-1.28, 0, 0.32]} rotation={[0, 0.42, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.86, 0.045, 0.56]} />
          <meshStandardMaterial color={WOOD} roughness={0.6} />
        </mesh>
        {[
          [-0.36, -0.22],
          [0.36, -0.22],
          [-0.36, 0.22],
          [0.36, 0.22],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.14, lz]} castShadow>
            <boxGeometry args={[0.05, 0.28, 0.05]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
          </mesh>
        ))}
      </group>
      {[
        { x: -1.0, z: -0.52 },
        { x: -1.62, z: 0.96 },
      ].map((s, i) => (
        <mesh key={i} position={[s.x, 0.19, s.z]} castShadow receiveShadow>
          <cylinderGeometry args={[0.16, 0.17, 0.38, 10]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.74} />
        </mesh>
      ))}

      {/* --- the family's side: the khokhuur, EAST ------------------------- */}
      {/* The cowhide bag of fermenting airag stands by the door on the east,
          and it is stirred with its wooden buluur every time anyone passes. */}
      <group position={[1.42, 0, 1.55]}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.32, 0.84, 10]} />
          <meshStandardMaterial color="#5a4530" roughness={0.9} />
        </mesh>
        <mesh position={[0.03, 0.86, 0.02]} rotation={[0.12, 0, 0.07]} castShadow>
          <cylinderGeometry args={[0.022, 0.026, 1.15, 6]} />
          <meshStandardMaterial color="#8a7250" roughness={0.82} />
        </mesh>
      </group>

      {/* Water pail and a milk basin, also east. */}
      <mesh position={[1.86, 0.16, 0.62]} castShadow>
        <cylinderGeometry args={[0.17, 0.15, 0.32, 12]} />
        <meshStandardMaterial color="#8d8f93" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  )
}
