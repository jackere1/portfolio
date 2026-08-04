"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { journey } from "@/hooks/use-journey"
import { createSunState, writeSunState } from "@/lib/sun-arc"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { getStarMap, starMapRotation } from "@/lib/starmap"
import { CLOUD_GLSL } from "@/lib/clouds"

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
  uniform sampler2D uStarMap;  // NASA SVS Deep Star Maps 2020, equatorial
  uniform mat3  uStarRot;      // world -> equatorial, from latitude and LST
  uniform vec3  uSunDisc;   // absolute radiance of the disc, keyframed
  uniform float uHaze;      // vertical Mie optical depth
  uniform float uMieGain;   // aureole strength
  uniform vec3  uCloudLit;
  uniform vec3  uCloudDark;
  ${CLOUD_GLSL}

  // Vertical Rayleigh optical depth for an observer at ~1400 m. The steppe
  // sits high, which is exactly why its zenith is deeper than a sea-level one.
  const vec3 TAU_R = vec3(0.0390, 0.0910, 0.2222);

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

  // The cloud field lives in lib/clouds.ts and is shared verbatim with the
  // ground, so a shadow can never belong to a cloud that is not there.
  // The Milky Way now comes from the real map rather than from noise. A 1k
  // equirectangular cannot resolve a point source, but it does not need to —
  // it carries the BAND, which is diffuse, and the sharp stars below are drawn
  // procedurally on top. That split plays to what each is actually good at.
  vec3 starMap(vec3 d) {
    vec3 e = uStarRot * d;
    float dec = asin(clamp(e.y, -1.0, 1.0));
    float ra  = atan(e.z, e.x);
    vec2 uv = vec2(ra / 6.2831853 + 0.5, dec / 3.14159265 + 0.5);
    return texture2D(uStarMap, uv).rgb;
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
    // ONE control, and a seam is impossible by construction: the endpoints are
    // a single continuous keyframe table across the whole arc, and only the
    // RAMP between them morphs. Every daylight-only term below is multiplied
    // by wDay, so it is identically zero at and under +1.5 degrees, and every
    // twilight-only term is already zero at and over it. There is one image,
    // and its shape changes — nothing crossfades between two pictures.
    float wDay = smoothstep(1.5, 6.0, uSunElev);

    float up  = clamp(h, 0.0, 1.0);

    // Daylight falls off with air mass; dusk is close to a plain power ramp.
    float am    = 1.0 / (max(up, 0.0) + 0.15);
    vec3  ext   = exp(-TAU_R * (am - 1.0) * 3.6);
    vec3  dayC  = mix(uHorizon, uZenith, clamp(ext.b * 1.05, 0.0, 1.0));
    vec3  duskC = mix(uHorizon, uZenith, pow(up, 0.42));
    vec3  col   = mix(duskC, dayC, wDay);

    // Mie haze whitens and desaturates the low sky by day. It is what makes a
    // daytime horizon read as distance rather than as a painted band.
    float mie = exp(-max(up, 0.0) / max(uHaze, 0.001));
    col = mix(col, vec3(dot(col, vec3(0.33)) * 1.04), mie * 0.30 * wDay);

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

    // --- clouds -----------------------------------------------------------
    // Projected onto a flat deck rather than raymarched: at this scale the
    // difference is invisible and the cost is a fbm instead of a loop. What
    // matters for realism is not the volume, it is that the deck CONVERGES at
    // the horizon (so it reads as a ceiling over a huge plain, which is what
    // a basin sky actually looks like) and that the lit faces keep the sun
    // long after the ground has lost it.
    if (h > 0.015) {
      // Scale matters more than anything else here. The deck coordinate is
      // where the view ray meets a flat ceiling; multiplying it sets how big a
      // cloud is against that ceiling. Too small a factor and the whole
      // visible sky samples one value of the field, which is either total
      // overcast or nothing at all — there is no cloud, only a switch.
      // Same field the ground is shadowed by; a view ray's xz/y IS the deck
      // coordinate, which is why neither side needs to know about the other.
      vec2 deck = d.xz / max(h, 0.015);
      float thick = cloudThickness(deck);
      float cov = smoothstep(0.0, 0.20, thick);

      // Thin toward the horizon: perspective piles the deck up there, and the
      // haze eats it.
      cov *= smoothstep(0.015, 0.19, h);
      // And thin again very high, so the zenith keeps some open blue.
      cov *= 1.0 - smoothstep(0.72, 1.0, h) * 0.55;

      // Lighting. Forward scatter toward the sun gives the silver lining;
      // the noise field itself stands in for which faces are turned away.
      float toSun = max(dot(d, normalize(uSunDir)), 0.0);
      // The silver lining: forward scatter through a thin edge, so it is
      // strongest exactly where the cloud is thinnest.
      float rim = pow(toSun, 7.0) * (1.0 - thick * 0.55);
      float shade = pow(thick, 0.62);
      vec3 cloud = mix(uCloudDark, uCloudLit, clamp(shade * 0.9 + rim * 1.1, 0.0, 1.0));

      col = mix(col, cloud, clamp(cov, 0.0, 1.0));
    }

    // --- the sun itself ---------------------------------------------------
    // Angular radius 0.265 degrees, which is its real one — the disc has no
    // business being bigger than the sky it sits in. It is left far above 1.0
    // so bloom finds an honest source rather than a painted one, and bloom is
    // what will make it read larger than 12 pixels.
    float cosSun  = dot(d, normalize(uSunDir));
    float disc    = smoothstep(0.9999860, 0.9999935, cosSun);
    // Two lobes: the tight forward-scattered aureole, and the broad glare that
    // a high sun spreads over half the sky through haze.
    float aureole = pow(max(cosSun, 0.0), 520.0);
    float glare   = pow(max(cosSun, 0.0), 8.0) * mie * uMieGain * 0.11 * wDay;
    col += uSunDisc * disc;
    col += uSunDisc * aureole * 0.018;
    col += normalize(uSunDisc + vec3(1e-4)) * glare;

    // --- night ------------------------------------------------------------
    if (uStarOpacity > 0.001) {
      float above = smoothstep(-0.02, 0.10, h);
      // The map is display-referred sRGB and joins radiance that has not been
      // tone mapped yet, so it needs de-gamma-ing — but a full square crushes
      // the band, which lives almost entirely in the dim values. 1.5 keeps its
      // structure while still darkening the empty sky between the stars.
      vec3 sky = starMap(d);
      col += pow(sky, vec3(1.5)) * uStarOpacity * above * 7.5;
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
  const reduced = useReducedMotion()
  const clock = useRef(0)

  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new THREE.Vector3(0, 0.05, -1) },
      uSunElev: { value: 3 },
      uStarOpacity: { value: 0 },
      uZenith: { value: new THREE.Color(0.06, 0.12, 0.3) },
      uHorizon: { value: new THREE.Color(0.5, 0.4, 0.34) },
      uSunDisc: { value: new THREE.Color(57, 34, 17) },
      uStarMap: { value: getStarMap() },
      uStarRot: { value: starMapRotation() },
      uHaze: { value: 0.115 },
      uMieGain: { value: 0.9 },
      uCloudCover: { value: 0.44 },
      uCloudLit: { value: new THREE.Color(2.4, 2.42, 2.45) },
      uCloudDark: { value: new THREE.Color(0.68, 0.74, 0.9) },
      uCloudTime: { value: 0 },
    }),
    []
  )

  useFrame((_, delta) => {
    writeSunState(sun, journey.t)
    const u = uniforms
    u.uSunDir.value.set(sun.dirX, sun.dirY, sun.dirZ)
    u.uSunElev.value = sun.elevationDeg
    u.uStarOpacity.value = sun.starOpacity

    // Zenith, horizon and disc are their own keyframe tables now. They used to
    // be derived from the hemisphere colours by a fixed multiplier, but that
    // multiplier was only ever true at dusk.
    u.uZenith.value.setRGB(sun.zenith.r, sun.zenith.g, sun.zenith.b)
    u.uHorizon.value.setRGB(sun.horizon.r, sun.horizon.g, sun.horizon.b)
    u.uSunDisc.value.setRGB(sun.sunDisc.r, sun.sunDisc.g, sun.sunDisc.b)
    u.uHaze.value = sun.haze
    u.uMieGain.value = sun.mieGain
    u.uCloudCover.value = sun.cloudCover
    u.uCloudLit.value.setRGB(sun.cloudLit.r, sun.cloudLit.g, sun.cloudLit.b)
    u.uCloudDark.value.setRGB(sun.cloudDark.r, sun.cloudDark.g, sun.cloudDark.b)
    // Clouds drift. Slowly — this is ambient motion, not journey motion, and
    // it is the one thing in the sky allowed to read a clock.
    if (!reduced) clock.current += Math.min(delta, 1 / 20)
    u.uCloudTime.value = clock.current

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
