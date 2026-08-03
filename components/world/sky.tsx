"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { journey } from "@/hooks/use-journey"
import { createSunState, writeSunState } from "@/lib/sun-arc"

// The twilight dome.
//
// Preetham is a DAYLIGHT model — undefined below the horizon, and it also
// double tone-maps under a postprocessing composer (its fragment already bakes
// a display curve, and its tonemapping include becomes a no-op once the
// composer forces NoToneMapping). Two of the seven stops are defined by the
// blue hour, so daylight-only was never an option here.
//
// So this is an authored twilight model, driven entirely by sun elevation and
// covering +3 to -19 degrees continuously. It renders, by construction:
//   · the vertical zenith-to-horizon gradient,
//   · the solar afterglow banded around the sun's azimuth,
//   · the earth's own shadow rising on the ANTI-solar horizon, and
//   · the Belt of Venus — the salmon band riding on top of that shadow, which
//     the dry high air here makes unusually strong.
//
// Output is linear HDR radiance, NOT display-referred: exposure and AgX are
// applied downstream in the composer, and the solar disc is left well above 1
// so that bloom (which runs after exposure) has something honest to find.

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    // Dome rides the camera: translation is discarded, rotation is not.
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  varying vec3 vDir;

  uniform vec3  uSunDir;
  uniform float uSunElev;      // degrees
  uniform float uStarOpacity;
  uniform vec3  uZenith;
  uniform vec3  uHorizon;

  // --- deterministic star hashing -----------------------------------------
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  // Smooth trilinear value noise. The band's structure MUST be continuous:
  // hashing floor(d * k) directly quantises the sky into visible blocks a few
  // degrees across, which is glaringly obvious against a near-black zenith.
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }

  // A soft band of unresolved stars with a dark lane through it. Grey-white and
  // structured — never the purple that gives away a fake sky.
  float milkyWay(vec3 d) {
    // The pole sits near the horizon toward the south-east, which puts the
    // plane on a great circle running roughly NE to SW through the zenith —
    // where it genuinely is from this latitude on an August evening, Cygnus
    // near the top and the core low in the south-west. It is also, and not by
    // accident, the half of the sky the toono frames from the seat at stop 07.
    vec3 pole = normalize(vec3(0.70, 0.02, 0.71));
    float lat = dot(d, pole);

    // A smooth band rather than a thresholded one.
    float band = exp(-lat * lat / 0.020);
    // The Great Rift: the dust lane splitting the band lengthwise, offset from
    // the centreline as the real one is.
    float rift = 1.0 - 0.78 * exp(-pow((lat + 0.045) / 0.026, 2.0));

    // Three octaves, then a contrast curve. The Milky Way is not a bar of
    // light — it is granular, all star clouds and dust, and a smooth band
    // reads as a searchlight pointed at the camera.
    float clump = vnoise(d * 9.0) * 0.5 +
                  vnoise(d * 23.0) * 0.3 +
                  vnoise(d * 54.0) * 0.2;
    clump = pow(clamp(clump, 0.0, 1.0), 2.0);

    return band * rift * (0.18 + 1.05 * clump);
  }

  float stars(vec3 d) {
    vec3 cell = floor(d * 260.0);
    float h = hash13(cell);
    // Sparse: only the brightest few per patch resolve at all.
    float present = step(0.9965, h);
    float mag = hash13(cell + 7.13);
    vec3 f = fract(d * 260.0) - 0.5;
    float disc = smoothstep(0.32, 0.0, length(f));
    return present * disc * (0.25 + 2.4 * mag * mag);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    // Horizontal alignment with the sun: +1 toward it, -1 directly away.
    vec3 sunH = normalize(vec3(uSunDir.x, 0.0, uSunDir.z) + vec3(1e-5));
    vec3 dH   = normalize(vec3(d.x, 0.0, d.z) + vec3(1e-5));
    float az  = dot(dH, sunH);

    // --- base gradient ----------------------------------------------------
    float up  = clamp(h, 0.0, 1.0);
    vec3 col  = mix(uHorizon, uZenith, pow(up, 0.42));

    // Below the true horizon the dome only ever shows through distant haze.
    col = mix(col, uHorizon * 0.55, smoothstep(0.0, -0.09, h));

    // --- solar afterglow --------------------------------------------------
    // Warm light piled against the horizon on the sun's side. It narrows and
    // reddens as the sun sinks, and is gone by about -9 degrees.
    float glowLife = smoothstep(-9.0, 1.5, uSunElev);
    float azGlow   = pow(max(az, 0.0), mix(5.0, 1.6, glowLife));
    float hGlow    = exp(-max(h, 0.0) * mix(15.0, 6.0, glowLife));
    float glow     = azGlow * hGlow * glowLife;

    vec3 glowWarm = mix(
      vec3(0.85, 0.20, 0.06),   // deep red, sun well under
      vec3(1.60, 0.72, 0.26),   // amber, sun still up
      glowLife
    );
    col += glowWarm * glow * 1.5;

    // --- the earth's shadow, and the Belt of Venus on top of it -----------
    // The shadow of the planet rises out of the anti-solar horizon as the sun
    // sets. The pink band riding its upper edge is the Belt of Venus, and in
    // this dry, high air it is pronounced.
    float anti      = max(-az, 0.0);
    float shadowTop = clamp((-uSunElev) * 0.021 + 0.012, 0.0, 0.30);
    float beltLife  = smoothstep(1.0, -1.5, uSunElev) *
                      smoothstep(-9.5, -4.0, uSunElev);

    float inShadow = 1.0 - smoothstep(shadowTop - 0.035, shadowTop, max(h, 0.0));
    col = mix(
      col,
      col * vec3(0.62, 0.68, 0.86),
      inShadow * anti * smoothstep(0.5, -3.0, uSunElev) * 0.85
    );

    float belt = exp(-pow((h - shadowTop) / 0.055, 2.0));
    col += vec3(0.72, 0.30, 0.26) * belt * anti * beltLife * 0.9;

    // --- the sun itself ---------------------------------------------------
    // Angular radius 0.265 degrees, which is its real one — the disc has no
    // business being bigger than the sky it sits in. It is left far above 1.0
    // so bloom finds an honest source rather than a painted one, and bloom is
    // what will make it read larger than 12 pixels.
    float cosSun  = dot(d, normalize(uSunDir));
    float disc    = smoothstep(0.9999860, 0.9999935, cosSun);
    float aureole = pow(max(cosSun, 0.0), 520.0);
    float visible = smoothstep(-1.4, 0.4, uSunElev);
    col += vec3(1.9, 1.12, 0.58) * (disc * 30.0 + aureole * 0.55) * visible;

    // --- night ------------------------------------------------------------
    if (uStarOpacity > 0.001) {
      float above = smoothstep(-0.02, 0.10, h);
      col += vec3(0.66, 0.68, 0.76) * milkyWay(d) * uStarOpacity * above * 0.15;
      col += vec3(0.80, 0.83, 0.92) * stars(d) * uStarOpacity * above;
    }

    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`

export function Sky() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const camera = useThree((s) => s.camera)
  const sun = useMemo(() => createSunState(), [])

  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new THREE.Vector3(0, 0.05, -1) },
      uSunElev: { value: 3 },
      uStarOpacity: { value: 0 },
      uZenith: { value: new THREE.Color(0.06, 0.12, 0.3) },
      uHorizon: { value: new THREE.Color(0.5, 0.4, 0.34) },
    }),
    []
  )

  useFrame(() => {
    writeSunState(sun, journey.t)
    const u = uniforms
    u.uSunDir.value.set(sun.dirX, sun.dirY, sun.dirZ)
    u.uSunElev.value = sun.elevationDeg
    u.uStarOpacity.value = sun.starOpacity

    // Zenith and horizon derive from the same colours the lights read, so the
    // sky and the scene can never disagree about what time it is — but scaled
    // well down. A dusk sky is not a bright surface; the only bright things in
    // the frame are the sun and what it is shining through. Push these up and
    // AgX compresses the whole image into milk and takes the colour with it.
    u.uZenith.value.setRGB(
      sun.skyColor.r * 0.11,
      sun.skyColor.g * 0.17,
      sun.skyColor.b * 0.42
    )
    u.uHorizon.value.setRGB(
      sun.fogColor.r * 0.72,
      sun.fogColor.g * 0.6,
      sun.fogColor.b * 0.62
    )

    // The dome is a backdrop at infinity: it follows the camera's position but
    // never its rotation.
    if (meshRef.current) meshRef.current.position.copy(camera.position)
  })

  return (
    <mesh ref={meshRef} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[4000, 96, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        // Fog density rises exactly as the stars arrive. Without this the night
        // sky is quietly eaten by the haze that is meant to hide the horizon.
        fog={false}
        toneMapped={false}
      />
    </mesh>
  )
}
