"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { usePbrMaterial } from "@/lib/textures"
import { heightAt, slopeAt } from "@/lib/heightfield"
import {
  BUUTS,
  SKIRT_SIZE,
  TERRAIN_SEGMENTS,
  TERRAIN_SIZE,
} from "@/lib/world"

// The ground. Long low rolling swells with no drama in them, and two ground
// signatures every real steppe photograph has and every fake one lacks: the
// darkened, dung-flecked halo a camp wears into the land, and the pair of
// hard-packed ruts that is the only road there is.
//
// Both are carried in vertex colour rather than geometry — they are a change of
// material, not of shape.

const GRASS_TINT = new THREE.Color(0.42, 0.35, 0.19) // dry gold-khaki
const OLIVE_TINT = new THREE.Color(0.27, 0.27, 0.17) // duller, in the hollows
const SOIL_TINT = new THREE.Color(0.36, 0.3, 0.22) // pale bare earth
const DUNG_TINT = new THREE.Color(0.24, 0.21, 0.17) // trampled, flecked

function smoothstep(a: number, b: number, x: number): number {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

function buildGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    TERRAIN_SEGMENTS,
    TERRAIN_SEGMENTS
  )
  geo.rotateX(-Math.PI / 2)

  const pos = geo.attributes.position as THREE.BufferAttribute
  const count = pos.count
  const colors = new Float32Array(count * 3)
  const c = new THREE.Color()

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = heightAt(x, z)
    pos.setY(i, h)

    const d = Math.hypot(x, z)
    const halo = smoothstep(BUUTS.inner, BUUTS.outer, d)
    const slope = slopeAt(x, z)

    // Grass sits gold on the crests and duller in the hollows, where it keeps
    // a little more moisture. Never green — that is the first kitsch tell.
    c.copy(GRASS_TINT).lerp(OLIVE_TINT, smoothstep(0.05, 0.4, slope))
    // Then the camp's halo burns it back to bare, trampled soil.
    const soil = SOIL_TINT.clone().lerp(DUNG_TINT, 1 - smoothstep(2, 12, d))
    c.lerp(soil, 1 - halo)

    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

/** The far land: coarse, and shaded almost entirely by stepped blue haze.
 *  It shares the hero patch's exact height function and vertex colouring, so
 *  the join is a change of resolution and nothing else — an offset in Y would
 *  put a visible step on the horizon exactly where the eye is looking. */
function buildSkirt(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(SKIRT_SIZE, SKIRT_SIZE, 200, 200)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    pos.setY(i, heightAt(x, z))

    c.copy(GRASS_TINT).lerp(OLIVE_TINT, smoothstep(0.05, 0.4, slopeAt(x, z)))
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

export function Terrain() {
  const geometry = useMemo(buildGeometry, [])
  const skirt = useMemo(buildSkirt, [])
  const pbr = usePbrMaterial("steppe-grass", { repeat: [46, 46], anisotropy: 8 })

  return (
    <>
      {/* Deliberately NO roughness map and roughness pinned at 1. Dry steppe
          soil and dead grass have no specular lobe worth the name, and the
          moment the ground picks up a sun glitter it stops being ground and
          starts being a lake — which is exactly what it did. */}
      <mesh geometry={geometry} receiveShadow frustumCulled={false}>
        <meshStandardMaterial
          map={pbr.map}
          normalMap={pbr.normalMap}
          normalScale={new THREE.Vector2(0.7, 0.7)}
          vertexColors
          roughness={1}
          metalness={0}
          dithering
        />
      </mesh>

      {/* Coplanar with the hero patch by construction, so it is pushed back in
          depth rather than down in Y — no step, no z-fight. */}
      <mesh geometry={skirt} renderOrder={-2} frustumCulled={false}>
        <meshStandardMaterial
          vertexColors
          roughness={1}
          metalness={0}
          dithering
          polygonOffset
          polygonOffsetFactor={2}
          polygonOffsetUnits={2}
        />
      </mesh>
    </>
  )
}
