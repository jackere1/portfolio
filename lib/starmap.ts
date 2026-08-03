import * as THREE from "three"
import { SITE_LATITUDE, SITE_LONGITUDE } from "./world"

// The real sky.
//
// NASA/Goddard SVS "Deep Star Maps 2020" — an all-sky equirectangular map built
// from Hipparcos-2, Tycho-2 and Gaia DR2. It is in EQUATORIAL coordinates,
// which is the entire reason it was chosen over the more obvious ESO Milky Way
// panorama: the ESO image is in GALACTIC coordinates, so rotating it until the
// band "looks right" over a scene is an aesthetic placement dressed up as an
// astronomical one. On a site whose whole argument is about not lying, the sky
// has to be rotatable for a real reason.
//
// So this one is rotated by the actual local sidereal time of the moment the
// scene depicts, and it lands where it lands.
//
// ATTRIBUTION IS REQUIRED and ships with the site:
//   Night sky: Deep Star Maps 2020 — NASA/Goddard Space Flight Center
//   Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC.
//   svs.gsfc.nasa.gov/4851

/** The instant the journey's last stop depicts: 2026-08-20, 22:19 local
 *  (UTC+8) at the dive site. Fixed, never `new Date()` — the sky is part of
 *  the seeded world and must be identical on every load. */
const EPOCH = { year: 2026, month: 8, day: 20, utcHours: 14 + 19 / 60 }

/** Local sidereal time in degrees, from the standard GMST expression. */
export function localSiderealDeg(): number {
  const { year: Y, month: M, day: D, utcHours: UT } = EPOCH
  const jd =
    367 * Y -
    Math.floor((7 * (Y + Math.floor((M + 9) / 12))) / 4) +
    Math.floor((275 * M) / 9) +
    D +
    1721013.5 +
    UT / 24
  const d = jd - 2451545.0
  let gmst = (280.46061837 + 360.98564736629 * d) % 360
  if (gmst < 0) gmst += 360
  return (gmst + SITE_LONGITUDE) % 360
}

/**
 * The rotation taking a WORLD direction into the equatorial frame the map is
 * drawn in.
 *
 * Two steps, and both are forced rather than chosen:
 *   1. Tilt by (90 - latitude) about X, which is exactly what puts the
 *      celestial pole at altitude 47.9 due north — where Алтан гадас, the
 *      Golden Stake, actually sits from here.
 *   2. Spin about that polar axis by (90 - LST), which puts the right ascension
 *      that is genuinely on the meridian at that instant on the meridian.
 *
 * At this epoch LST is 290.6 degrees, so RA 19.4h is overhead: the galactic
 * centre (RA 17.8h) falls about 1.6h west of the meridian and therefore low in
 * the south-west, and Cygnus (RA 20.7h) rides high near the zenith. That is
 * where the late-August Milky Way is, and it was not placed there by eye.
 */
export function starMapRotation(): THREE.Matrix3 {
  const latRad = (SITE_LATITUDE * Math.PI) / 180
  const spinRad = ((90 - localSiderealDeg()) * Math.PI) / 180

  const tilt = new THREE.Matrix4().makeRotationX(Math.PI / 2 - latRad)
  const spin = new THREE.Matrix4().makeRotationY(spinRad)
  const m = spin.multiply(tilt)

  return new THREE.Matrix3().setFromMatrix4(m)
}

let cached: THREE.Texture | null = null

/** Load (once) the equirectangular star map. */
export function getStarMap(): THREE.Texture {
  if (cached) return cached
  const tex = new THREE.TextureLoader().load("/sky/starmap-2020-1k.jpg")
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  cached = tex
  return cached
}
