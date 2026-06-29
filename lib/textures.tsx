"use client"

// Hybrid PBR material system.
//
// Real, tiled photo textures on the hero surfaces (concrete, steppe, metal);
// procedural everything else. Texture maps degrade by GPU tier — weak GPUs get a
// flat tinted material and download nothing. Assets live in public/textures/<name>/.
//
// Format note: we load JPG directly today. The set is authored small and tiled
// (≤ ~0.5 MB total), so KTX2/Basis (GPU-compressed) is a deferred optimization —
// the loader already accepts `ext: "ktx2"`; once a `toktx`/`basisu` converter is
// available, drop `.ktx2` files in and switch the ext. See public/textures/README.

import { useMemo } from "react"
import { useTexture } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useGpuTier, type MapKind } from "@/hooks/use-gpu-tier"

export type { MapKind }

export interface PbrOptions {
  /** Tiling, applied identically to every map. */
  repeat?: [number, number]
  anisotropy?: number
  /** Override the tier's map set (rarely needed). */
  maps?: MapKind[]
  ext?: "jpg" | "png" | "ktx2"
}

export interface PbrResult {
  map?: THREE.Texture
  normalMap?: THREE.Texture
  roughnessMap?: THREE.Texture
  aoMap?: THREE.Texture
}

const FILE_FOR: Record<MapKind, string> = {
  albedo: "albedo",
  normal: "normal",
  roughness: "roughness",
  ao: "ao",
}

/**
 * Load + configure a PBR map set. ONLY call when the tier wants textures
 * (`quality.textureMaps.length > 0`) — `<PbrMaterial>` gates this for you.
 * Suspends while loading; wrap the caller in <Suspense fallback={null}>.
 */
export function usePbrMaterial(name: string, opts: PbrOptions = {}): PbrResult {
  const { quality } = useGpuTier()
  const { gl } = useThree()
  const ext = opts.ext ?? "jpg"
  const wanted = opts.maps ?? quality.textureMaps
  const key = wanted.join(",")

  const input = useMemo(() => {
    const rec: Record<string, string> = {}
    for (const k of wanted) rec[k] = `/textures/${name}/${FILE_FOR[k]}.${ext}`
    return rec
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, ext, key])

  // drei caches by URL and returns shared instances, so we clone per consumer
  // before mutating wrap/repeat — otherwise two floors fight over one texture.
  const textures = useTexture(input) as Partial<Record<MapKind, THREE.Texture>>

  const rx = opts.repeat?.[0] ?? 1
  const ry = opts.repeat?.[1] ?? 1
  const aniso = opts.anisotropy

  return useMemo<PbrResult>(() => {
    const a = Math.min(gl.capabilities.getMaxAnisotropy(), aniso ?? 8)
    const out: PbrResult = {}
    const assign = (k: MapKind, base?: THREE.Texture) => {
      if (!base) return
      const t = base.clone()
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(rx, ry)
      t.anisotropy = a
      t.colorSpace = k === "albedo" ? THREE.SRGBColorSpace : THREE.NoColorSpace
      t.needsUpdate = true
      if (k === "albedo") out.map = t
      else if (k === "normal") out.normalMap = t
      else if (k === "roughness") out.roughnessMap = t
      else if (k === "ao") out.aoMap = t
    }
    assign("albedo", textures.albedo)
    assign("normal", textures.normal)
    assign("roughness", textures.roughness)
    assign("ao", textures.ao)
    return out
  }, [textures, gl, rx, ry, aniso])
}

export interface PbrMaterialProps {
  name: string
  repeat?: [number, number]
  anisotropy?: number
  /** Multiplies the albedo (textured) — keep near white to show the photo true. */
  tint?: string
  /** Used (as color) when the tier has no textures. */
  flatColor: string
  flatRoughness?: number
  metalness?: number
  emissive?: string
  emissiveIntensity?: number
  normalScale?: number
  transparent?: boolean
  opacity?: number
}

/**
 * A <meshStandardMaterial> that is photo-textured on capable GPUs and a flat
 * tinted material on weak ones. Drop it inside any <mesh>. The textured branch
 * suspends; the parent stage should sit under <Suspense fallback={null}>.
 */
export function PbrMaterial(props: PbrMaterialProps) {
  const { quality } = useGpuTier()
  if (quality.textureMaps.length === 0) {
    return (
      <meshStandardMaterial
        color={props.flatColor}
        roughness={props.flatRoughness ?? 0.92}
        metalness={props.metalness ?? 0}
        emissive={props.emissive ?? "#000000"}
        emissiveIntensity={props.emissiveIntensity ?? 0}
        transparent={props.transparent}
        opacity={props.opacity ?? 1}
      />
    )
  }
  return <PbrMaterialTextured {...props} />
}

function PbrMaterialTextured(props: PbrMaterialProps) {
  const mat = usePbrMaterial(props.name, {
    repeat: props.repeat,
    anisotropy: props.anisotropy,
  })
  return (
    <meshStandardMaterial
      color={props.tint ?? "#ffffff"}
      // roughnessMap multiplies this; 1 keeps the map's values true.
      roughness={mat.roughnessMap ? 1 : props.flatRoughness ?? 0.92}
      metalness={props.metalness ?? 0}
      emissive={props.emissive ?? "#000000"}
      emissiveIntensity={props.emissiveIntensity ?? 0}
      normalScale={
        mat.normalMap ? [props.normalScale ?? 1, props.normalScale ?? 1] : undefined
      }
      transparent={props.transparent}
      opacity={props.opacity ?? 1}
      {...mat}
    />
  )
}

// Warm the cache for the hero sets (client only) so surfaces don't pop in.
if (typeof window !== "undefined") {
  useTexture.preload([
    "/textures/concrete-foundation/albedo.jpg",
    "/textures/concrete-foundation/normal.jpg",
    "/textures/concrete-foundation/roughness.jpg",
    "/textures/steppe-grass/albedo.jpg",
    "/textures/steppe-grass/normal.jpg",
    "/textures/steppe-grass/roughness.jpg",
  ])
}
