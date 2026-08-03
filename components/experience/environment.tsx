"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { journey } from "@/hooks/use-journey"
import { createSunState, writeSunState } from "@/lib/sun-arc"
import type { QualityConfig } from "@/hooks/use-gpu-tier"

// The light director. Everything here is mutated through refs on the object
// itself — no React state, no re-render, no allocation in the frame loop.
//
// There is only ever ONE shadow system alive. While the sun is up it casts,
// with a tight frustum that follows the camera; the moment the sun dies the
// caster is switched off AND its map disposed, because clearing castShadow
// alone leaves the depth target allocated.

export function Environment({ quality }: { quality: QualityConfig }) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  const sun = useMemo(() => createSunState(), [])
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const shadowLive = useRef(true)

  const fog = useMemo(
    () => new THREE.FogExp2(new THREE.Color(0.5, 0.44, 0.4).getHex(), 0.0022),
    []
  )

  useFrame(() => {
    writeSunState(sun, journey.t)

    // --- fog: pressure, and a free horizon LOD ----------------------------
    if (scene.fog !== fog) scene.fog = fog
    fog.color.setRGB(sun.fogColor.r, sun.fogColor.g, sun.fogColor.b)
    fog.density = sun.fogDensity
    scene.background = null

    // --- the sun ----------------------------------------------------------
    const dir = sunRef.current
    if (dir) {
      // Keep the light rigged to the camera so the shadow frustum stays tight
      // around what is actually on screen.
      dir.position.set(
        camera.position.x + sun.dirX * 90,
        camera.position.y + sun.dirY * 90,
        camera.position.z + sun.dirZ * 90
      )
      dir.target.position.copy(camera.position)
      dir.target.updateMatrixWorld()
      dir.intensity = sun.sunIntensity
      dir.color.setRGB(sun.sunColor.r, sun.sunColor.g, sun.sunColor.b)

      const wantShadow = quality.shadows && sun.sunIntensity > 0.02
      if (wantShadow !== shadowLive.current) {
        dir.castShadow = wantShadow
        if (!wantShadow && dir.shadow.map) {
          // castShadow = false does NOT free the depth target. Dispose it, or
          // the "one shadow system at a time" budget is a fiction.
          dir.shadow.map.dispose()
          dir.shadow.map = null as unknown as THREE.WebGLRenderTarget
        }
        shadowLive.current = wantShadow
      }
    }

    // --- hemisphere: the sky above, the bounced ground below --------------
    const hemi = hemiRef.current
    if (hemi) {
      hemi.color.setRGB(sun.skyColor.r, sun.skyColor.g, sun.skyColor.b)
      hemi.groundColor.setRGB(
        sun.groundColor.r,
        sun.groundColor.g,
        sun.groundColor.b
      )
      hemi.intensity = sun.ambientIntensity
    }
  })

  return (
    <>
      <hemisphereLight ref={hemiRef} intensity={0.5} />
      <directionalLight
        ref={sunRef}
        intensity={3}
        castShadow={quality.shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0006}
        shadow-normalBias={0.06}
      />
    </>
  )
}
