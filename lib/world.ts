// The site plan. Everything downstream reads these numbers, so they are stated
// once, here, and never re-derived.
//
// AXES (three.js right-handed, Y up):
//     -Z = NORTH        +Z = SOUTH
//     +X = EAST         -X = WEST
//     +Y = UP           1 unit = 1 metre
//
// A camera with identity rotation looks down -Z, i.e. due north.
//
// BEARINGS are compass degrees: 0 = north, 90 = east, 180 = south, 270 = west,
// increasing clockwise when seen from above. `bearingToDirection` is the only
// permitted conversion — do not hand-roll the trigonometry at a call site.

/** The host ger stands at the origin. Its door faces due south. */
export const GER_ORIGIN = { x: 0, z: 0 } as const

/** 5-khana ger: ~5.6 m across. */
export const GER_RADIUS = 2.8
/** Top of the khana lattice — the wall/roof junction. */
export const GER_WALL_HEIGHT = 1.5
/** The doctrinal pitch. A Mongolian ger is a shallow straight-poled cone;
 *  a Turkic yurt is a dome. Do not round this to a convenient slope. */
export const GER_ROOF_PITCH_DEG = 20
/** The crown ring. */
export const TOONO_RADIUS = 0.7
/** Height of the toono above the floor, from the pitch and the wall height. */
export const TOONO_HEIGHT =
  GER_WALL_HEIGHT +
  (GER_RADIUS - TOONO_RADIUS) * Math.tan((GER_ROOF_PITCH_DEG * Math.PI) / 180)

/** The door faces south. This is not a style choice and never varies. */
export const DOOR_BEARING = 180
/** Adults duck. The frame is deliberately low. */
export const DOOR_HEIGHT = 1.5
export const DOOR_WIDTH = 0.78

/** Standing eye height. */
export const EYE_HEIGHT = 1.65

/**
 * The camp's working spine sits on the EAST side — the women's domain, where
 * water, milk cans, dung fuel and cooking gear actually live. The saddle and
 * tack sit west, the men's side, where firelight finds their brass through the
 * open door at stop 06.
 *
 * This is also what makes the circuit honest: the door faces south and compass
 * clockwise is N -> E -> S -> W, so approaching from the north and rounding
 * east to the door is genuinely clockwise. A west-wall spine would not be.
 */
export const WORKING_SIDE_BEARING = 90
export const TACK_SIDE_BEARING = 270

/** The khashaa corral, north-east of the ger. */
export const CORRAL = { x: 17, z: -12, radius: 5.5 } as const

/** The buuts: the bare, dung-flecked ring a home wears into the steppe. This is
 *  the *visibly trampled* ground only — it drives colour and terrain flattening. */
export const BUUTS = { inner: 9, outer: 30 } as const

/**
 * Grazing pressure, which reaches very much further than the trampled ring.
 *
 * This is the correction that matters most about this landscape: there is
 * almost no tall grass around a Mongolian camp, because the herd eats it. The
 * ground is cropped short and goes bald in patches for hundreds of metres, and
 * it does not recover while the family is camped there. A waving knee-high
 * sward outside a ger is one of the loudest tells that nobody who lives there
 * built the scene.
 */
export const GRAZING = { inner: 12, outer: 190 } as const

/**
 * The only things standing tall are the ones nothing will eat.
 *
 * халгай (nettle) wants nitrogen, so it grows exactly where the dung is — a
 * band around the camp — and because it is never grazed it stays genuinely
 * green, which makes it the only green in a gold landscape. дэрс (chee grass)
 * forms coarse unpalatable tussocks further out. Every tall silhouette in this
 * world is one of those two, never a field of grass.
 */
export const NETTLE_RING = { center: 15, width: 12 } as const

/** The hero terrain patch. Beyond this, low-density skirt rings shaded almost
 *  entirely by stepped blue-haze fog. */
export const TERRAIN_SIZE = 320
export const TERRAIN_SEGMENTS = 256
export const SKIRT_SIZE = 9000

/** Where the twin-rut track enters the world and where it dissolves into camp
 *  ground. No pavement, no signs, no paint — just ruts. */
export const TRACK_FROM = { x: 26, z: -150 } as const
export const TRACK_TO = { x: 6, z: -18 } as const

/** 47.8864 N, 106.9057 E — Ulaanbaatar. The dive site is a few hours out. */
export const SITE_LATITUDE = 47.8864
export const SITE_LONGITUDE = 106.9057

/** Convert a compass bearing (deg) into a world-space horizontal direction.
 *  Returns a unit vector in the XZ plane. */
export function bearingToDirection(bearingDeg: number): {
  x: number
  z: number
} {
  const r = (bearingDeg * Math.PI) / 180
  // North is -Z, east is +X, clockwise from above.
  return { x: Math.sin(r), z: -Math.cos(r) }
}

/** Inverse of `bearingToDirection`: the compass bearing from a to b. */
export function bearingBetween(
  from: { x: number; z: number },
  to: { x: number; z: number }
): number {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const deg = (Math.atan2(dx, -dz) * 180) / Math.PI
  return (deg + 360) % 360
}
