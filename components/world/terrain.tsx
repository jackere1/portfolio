"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { usePbrMaterial } from "@/lib/textures"
import { heightAt, slopeAt } from "@/lib/heightfield"
import { rutDistance } from "@/lib/terrain-maps"
import { journey } from "@/hooks/use-journey"
import { createSunState, writeSunState } from "@/lib/sun-arc"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import {
  CLOUD_DECK_HEIGHT,
  CLOUD_GLSL,
  CLOUD_SHADOW_GLSL,
  CLOUD_SHADOW_STRENGTH,
} from "@/lib/clouds"
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
//
// The hero patch and the far land DO NOT OVERLAP. An earlier version laid a
// 2.4 km plane underneath a 320 m one, both displaced by the same height
// function, and leaned on polygonOffset to keep them apart. Polygon offset is
// depth-slope dependent, and a camera 1.65 m above rolling ground sees almost
// everything at a grazing angle, so the far plane punched through the hero
// patch in shifting patches — which read as the ground texture randomly
// changing as you scrolled. The far land is now a square ANNULUS that begins
// exactly where the hero patch ends.

/** World size of one texture tile, shared by both meshes so the join is
 *  invisible. UVs are computed in world space rather than per-geometry. */
const TILE = 7.0

const GRASS_TINT = new THREE.Color(0.42, 0.35, 0.19) // dry gold-khaki
const OLIVE_TINT = new THREE.Color(0.27, 0.27, 0.17) // duller, in the hollows
const SOIL_TINT = new THREE.Color(0.36, 0.3, 0.22) // pale bare earth
const DUNG_TINT = new THREE.Color(0.24, 0.21, 0.17) // trampled, flecked
const RUT_TINT = new THREE.Color(0.66, 0.58, 0.44) // hard-packed, pale, dusty

function smoothstep(a: number, b: number, x: number): number {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

/** The single colouring rule, used by both meshes so they cannot disagree. */
function groundColor(x: number, z: number, out: THREE.Color): void {
  const d = Math.hypot(x, z)
  out.copy(GRASS_TINT).lerp(OLIVE_TINT, smoothstep(0.05, 0.4, slopeAt(x, z)))
  const halo = smoothstep(BUUTS.inner, BUUTS.outer, d)
  if (halo < 1) {
    const soil = SOIL_TINT.clone().lerp(DUNG_TINT, 1 - smoothstep(2, 12, d))
    out.lerp(soil, 1 - halo)
  }
  // The ruts: two hard-packed, pale, dusty lines. No pavement, no signs, no
  // paint — this is the only road there is, and it has to READ as one, which
  // means the tan must be clearly paler than the sward and the band must be
  // wider than the mesh's 1.25 m vertex spacing or it is smeared to nothing.
  const rut = smoothstep(0.3, 2.4, rutDistance(x, z))
  if (rut < 1) out.lerp(RUT_TINT, (1 - rut) * 0.9)
}

function buildHero(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    TERRAIN_SEGMENTS,
    TERRAIN_SEGMENTS
  )
  geo.rotateX(-Math.PI / 2)

  const pos = geo.attributes.position as THREE.BufferAttribute
  const uv = geo.attributes.uv as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    pos.setY(i, heightAt(x, z))
    uv.setXY(i, x / TILE, z / TILE)

    groundColor(x, z, c)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

/** A point on the perimeter of an axis-aligned square of half-extent `e`,
 *  parameterised by u in [0,1) going once around. */
function squarePerimeter(e: number, u: number): [number, number] {
  const t = u * 4
  const side = Math.min(3, Math.floor(t))
  const f = t - side
  switch (side) {
    case 0:
      return [-e + 2 * e * f, -e]
    case 1:
      return [e, -e + 2 * e * f]
    case 2:
      return [e - 2 * e * f, e]
    default:
      return [-e, e - 2 * e * f]
  }
}

/**
 * The far land: a square annulus from the hero patch's edge outward, sharing
 * its exact height function, colouring and texture scale. Rings are spaced by a
 * power curve so detail concentrates at the join and thins toward the horizon,
 * where fog has taken over anyway.
 */
function buildSkirt(): THREE.BufferGeometry {
  const inner = TERRAIN_SIZE / 2
  const outer = SKIRT_SIZE / 2
  const RINGS = 104
  const PER_SIDE = 84
  const COLS = PER_SIDE * 4

  const vertCount = (RINGS + 1) * (COLS + 1)
  const positions = new Float32Array(vertCount * 3)
  const uvs = new Float32Array(vertCount * 2)
  const colors = new Float32Array(vertCount * 3)
  const c = new THREE.Color()

  for (let j = 0; j <= RINGS; j++) {
    const k = Math.pow(j / RINGS, 1.9)
    const e = inner + (outer - inner) * k
    for (let i = 0; i <= COLS; i++) {
      const [x, z] = squarePerimeter(e, (i % COLS) / COLS)
      const o = j * (COLS + 1) + i
      positions[o * 3] = x
      positions[o * 3 + 1] = heightAt(x, z)
      positions[o * 3 + 2] = z
      uvs[o * 2] = x / TILE
      uvs[o * 2 + 1] = z / TILE
      groundColor(x, z, c)
      colors[o * 3] = c.r
      colors[o * 3 + 1] = c.g
      colors[o * 3 + 2] = c.b
    }
  }

  const indices: number[] = []
  for (let j = 0; j < RINGS; j++) {
    for (let i = 0; i < COLS; i++) {
      const a = j * (COLS + 1) + i
      const b = a + 1
      const cc = a + (COLS + 1)
      const d = cc + 1
      indices.push(a, cc, b, b, cc, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2))
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export function Terrain() {
  const hero = useMemo(buildHero, [])
  const skirt = useMemo(buildSkirt, [])
  // repeat is 1: the UVs above are already in world tiles.
  const pbr = usePbrMaterial("steppe-grass", { repeat: [1, 1], anisotropy: 8 })
  const sun = useMemo(() => createSunState(), [])
  const reduced = useReducedMotion()
  const clock = useRef(0)

  // Deliberately NO roughness map and roughness pinned at 1. Dry steppe soil
  // and dead grass have no specular lobe worth the name, and the moment the
  // ground picks up a sun glitter it stops being ground and starts being a lake.
  const cloudUniforms = useMemo(
    () => ({
      uCloudCover: { value: 0.44 },
      uCloudTime: { value: 0 },
      uCloudSunDir: { value: new THREE.Vector3(0, 0.4, -1) },
      uCloudDeckH: { value: CLOUD_DECK_HEIGHT },
      uCloudShadow: { value: CLOUD_SHADOW_STRENGTH },
    }),
    []
  )

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      dithering: true,
    })
    // Cloud shadows. Kilometre-long shadows crawling across the hills is one of
    // the defining looks of this landscape, and a lit deck with no shadow under
    // it reads as a painted backdrop rather than as weather.
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, cloudUniforms)
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vCloudWorld;"
        )
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\n  vCloudWorld = (modelMatrix * vec4(position, 1.0)).xyz;"
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vCloudWorld;\n" +
            CLOUD_GLSL +
            CLOUD_SHADOW_GLSL
        )
        .replace(
          "#include <opaque_fragment>",
          "outgoingLight *= cloudShadowAt(vCloudWorld);\n#include <opaque_fragment>"
        )
    }
    return m
  }, [cloudUniforms])

  useFrame((_, delta) => {
    writeSunState(sun, journey.t)
    if (!reduced) clock.current += Math.min(delta, 1 / 20)
    cloudUniforms.uCloudTime.value = clock.current
    cloudUniforms.uCloudCover.value = sun.cloudCover
    cloudUniforms.uCloudSunDir.value.set(sun.dirX, sun.dirY, sun.dirZ)
  })

  useMemo(() => {
    material.map = pbr.map ?? null
    material.normalMap = pbr.normalMap ?? null
    material.normalScale = new THREE.Vector2(0.7, 0.7)
    material.needsUpdate = true
  }, [material, pbr.map, pbr.normalMap])

  return (
    <>
      <mesh
        geometry={hero}
        material={material}
        receiveShadow
        frustumCulled={false}
      />
      <mesh geometry={skirt} material={material} frustumCulled={false} />
    </>
  )
}
