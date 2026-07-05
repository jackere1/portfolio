import * as THREE from "three"

// ── The one golden-hour sun ──────────────────────────────────────────────────
// A single low, warm sun sitting near the far horizon (down the shaft, in −z), so
// it BACKLIGHTS the meadow: the grass glows at its edges, the mountains fall into
// hazy silhouette, the sky burns warm toward it. Its direction drives the
// procedural sky, the mountain rim, the grass backlight and the scene light — one
// light, one hour, enforced here so nothing on the surface disagrees.

// Direction FROM the meadow TOWARD the sun: low (~12°) and slightly right, in −z
// (ahead of the camera), so the field is lit from behind toward the viewer.
export const SUN_DIR = new THREE.Vector3(0.5, 0.62, -3.0).normalize()

// Far placement for the directional light + the sky's sun disc.
export const SUN_POS: [number, number, number] = [
  SUN_DIR.x * 300,
  SUN_DIR.y * 300,
  SUN_DIR.z * 300,
]

// ── Sky (sunset gradient + sun) ──────────────────────────────────────────────
// Golden hour is many colours bleeding together, not one wash: deep violet-blue
// overhead, a dusky purple, a rose/magenta band, then burning orange-gold at the
// horizon by the sun.
export const SKY_ZENITH = "#26265c"    // deep blue-violet overhead
export const SKY_HIGH = "#6d5c9e"      // dusky purple-blue
export const SKY_MID = "#d17e7f"       // dusty rose band
export const SKY_HORIZON = "#ff9a48"   // burning orange-gold at the horizon
export const SKY_SUN_GLOW = "#ffb355"  // warm halo around the sun
export const SKY_SUN_DISC = "#fff2d2"  // bright sun core
export const CLOUD_LIT = "#ffd7a2"      // cloud tops catching the sun
export const CLOUD_SHADOW = "#5c4f72"   // cooler, darker cloud bodies (read against the warm sky)

// ── Light ────────────────────────────────────────────────────────────────────
export const SUN_COLOR = "#ffbf76"      // warm golden directional key
export const SKY_FILL = "#6a76a0"       // cool sky bounce into the shadows
export const GROUND_BOUNCE = "#4a4130"  // warm earth fill from below

// The ONE aerial colour: fog, the far mountains and the horizon haze all resolve
// to this warm gold so the whole distance reads as one lit air.
export const HAZE = "#e7bd8e"

// Aerial perspective for the surface: near grass crisp, the far field dissolves
// into the same mist the mountains sit in (so there's no seam between them).
export const SURFACE_FOG_NEAR = 28
export const SURFACE_FOG_FAR = 82

// ── Grass (muted olive body, soft golden backlight) ──────────────────────────
// Tuned to sit in the SAME misty golden light as the photo backdrop: muted and
// warm, not vivid green; a soft (not neon) backlight; a lifted shadow so it reads
// low-contrast like the photograph rather than punchy CG.
export const GRASS_BASE = "#5c6a34"     // muted warm olive body
export const GRASS_SHADOW = "#33401f"   // lifted olive root (not near-black)
export const GRASS_RIM = "#e8d094"      // soft warm-gold backlight
export const GRASS_DRY = "#7a7238"       // dry-gold variation on some blades

// ── Ground ───────────────────────────────────────────────────────────────────
export const GROUND_GREEN = "#365a22"
export const GROUND_WARM = "#6f6234"
