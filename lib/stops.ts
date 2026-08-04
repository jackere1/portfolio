// The route. Positions are XZ only — the camera rig grounds them against the
// heightfield at runtime, so a change to the terrain can never leave a stop
// floating or buried.
//
// AFTERNOON THROUGH TO NIGHT, and the shape of it is cultural, not cinematic.
//
// It does NOT end inside looking up through the toono at the Milky Way. For
// Mongolians, stars seen through an uncovered crown signify poverty — the urkh
// is drawn over the toono after dark, and a ger that cannot cover its own
// crown is a poor one. Looking up through it at DAYLIGHT or the last blue is
// normal and iconic; it is specifically stars that carry the omen. So the
// interior beats happen while there is still light in the sky, and the visitor
// comes back OUT for the night. Warmth and enclosure first, then vastness.
//
// The circuit stays clockwise (нар зөв): the bearing of each camera position
// from the ger increases monotonically while the visitor is outside,
// approaching from the north, rounding the working east side at a respectful
// distance, and arriving at the south door.
//
// Inside, the guest sits WEST. West is the men's and guests' side; east is the
// women's and the family's. Putting a guest on the east side is a real error.

import { EYE_HEIGHT } from "./world"

export interface Stop {
  id: string
  index: number
  /** Journey progress at which this stop is composed. */
  t: number
  /** Short stencil label. */
  label: string
  /** World position, XZ. Ground height is sampled; `eye` is the offset above it. */
  x: number
  z: number
  eye: number
  /** Authored look direction: compass bearing and pitch, both degrees. */
  bearing: number
  pitch: number
  /** How far pointer free-look may stray here, in degrees. Wider at rest. */
  yawRange: number
  pitchRange: number
  /**
   * Fraction of the segment LEAVING this stop that the camera holds still for.
   *
   * Used once, at the arrival: you call and then you WAIT, and you do not
   * approach until the household has come out. Implemented as a dwell in the
   * scroll-to-pose mapping rather than as a refusal to scroll — the camera
   * moving one-to-one with the gesture is the anti-nausea contract, and a
   * scrollbar that stops responding reads as a bug, not as etiquette.
   */
  dwell?: number
}

export const STOPS: readonly Stop[] = [
  {
    id: "track",
    index: 1,
    t: 0.05,
    label: "The Track's End",
    // Mid-afternoon on open ground, out where the twin ruts come in. The camp
    // is a small white speck; you are being seen coming, which is the point.
    // Standing ON the ruts, not five metres beside them — the stop is named
    // after the track and it should be underfoot. From here the pair runs away
    // ahead and to the left, toward the camp.
    x: 22,
    z: -104,
    eye: EYE_HEIGHT,
    bearing: 190,
    pitch: -5,
    yawRange: 28,
    pitchRange: 14,
  },
  {
    id: "seen",
    index: 2,
    t: 0.17,
    label: "The Camp Seen",
    // Close enough to be noticed. A guest announces and WAITS — you never walk
    // straight in, and you never come round the back.
    x: 12,
    z: -38,
    eye: EYE_HEIGHT,
    bearing: 191,
    pitch: -3,
    yawRange: 26,
    pitchRange: 12,
    // You have announced yourself. Now you wait to be received.
    dwell: 0.45,
  },
  {
    id: "east-side",
    index: 3,
    t: 0.29,
    label: "The East Side",
    // The working side, but at a respectful radius rather than at arm's length.
    x: 9.5,
    z: -6.5,
    eye: 1.6,
    bearing: 233,
    pitch: -9,
    yawRange: 26,
    pitchRange: 14,
  },
  {
    id: "herd",
    index: 4,
    t: 0.41,
    label: "The Herd Comes Home",
    // Golden hour. The loudest beat of the day, and it is deliberately placed
    // before the world begins to empty.
    x: 7.4,
    z: 3.6,
    eye: 1.6,
    bearing: 47,
    pitch: -6,
    yawRange: 30,
    pitchRange: 14,
  },
  {
    id: "door",
    index: 5,
    t: 0.52,
    label: "The Door",
    // The south face, with the sun on the horizon behind you.
    x: 0.4,
    z: 6.2,
    eye: 1.55,
    bearing: 353,
    pitch: -2,
    yawRange: 20,
    pitchRange: 16,
  },
  {
    id: "threshold",
    index: 6,
    t: 0.62,
    label: "The Threshold",
    // Duck under the frame and step OVER the bosgo, never on it.
    x: 0,
    z: 1.35,
    eye: 1.32,
    bearing: 0,
    pitch: -6,
    yawRange: 14,
    pitchRange: 10,
  },
  {
    id: "hearth",
    index: 7,
    t: 0.72,
    label: "The Hearth",
    // Seated on the WEST side, the guests' side, looking up through the crown
    // at the LAST BLUE — there is still light in the sky, and there must be.
    // From (-0.95, -0.55) the crown centre at (0, 2.264, 0) bears 120 and sits
    // 52 degrees up, which frames it inside a 60 degree lens.
    // Seated further back on the west side, which lets the WHOLE crown fit.
    // From 1.1 m off the axis the ring subtends 43 degrees — most of a 60
    // degree lens — so it was always clipped. At 1.77 m it subtends 34, and
    // the frame carries the crown, the roof and the khoimor below it at once.
    // The stove pipe falls a few degrees off the ring's centre from here
    // rather than bisecting the shot.
    x: -1.55,
    z: -0.85,
    eye: 0.85,
    bearing: 119,
    // The crown sits 52 degrees up from this seat, so a 52 degree pitch puts
    // it dead centre and fills the rest of the frame with roof underside —
    // none of the room the guest was just led into is visible at all. Aiming
    // lower carries the crown in the upper third and the khoimor below it,
    // which is what someone sitting down actually sees.
    pitch: 33,
    yawRange: 60,
    // Kept under (90 - pitch) so free look can never tip past vertical.
    pitchRange: 34,
  },
  {
    id: "back-out",
    index: 8,
    t: 0.85,
    label: "Back Out",
    // Through the door again. Behind you the ger has sealed itself: the urkh
    // drawn over the crown, the khayaa rolled down, the door shut against the
    // cold. The only warm thing left in the world is a seam of light.
    // Far enough back that the WHOLE sealed ger reads — crown covered, khayaa
    // down, door shut with one seam of light in it. At two metres it was just
    // a door filling the frame, which is not the beat.
    x: 1.1,
    z: 9.2,
    eye: 1.62,
    bearing: 5,
    pitch: 8,
    yawRange: 34,
    pitchRange: 20,
  },
  {
    id: "under-it",
    index: 9,
    t: 0.95,
    label: "Under It",
    // Open ground, well clear of the camp, and the sky is the whole frame.
    // This is where a Mongolian actually meets the night — not through a hole
    // in a roof.
    // Placed by the sky rather than by taste. At this epoch the galactic core
    // stands about 10 degrees up in the south-south-west and Cygnus rides near
    // the zenith, so the band arcs up out of the SSW horizon. Standing NNE of
    // the camp puts the sealed ger low in that same frame: a small amber shape
    // with its crown covered, under the whole arc of the galaxy.
    // The band crosses the horizon at bearings 45 and 225 and arcs over the
    // zenith between them; the camp sits at 198 from here. Splitting the
    // difference carries both — the galaxy rising ahead and to the right, the
    // sealed ger low and to the left.
    // Sixteen metres out rather than twenty-one. A sealed ger at night is a
    // very dark object — the only light is what leaks under a shut door — and
    // at twenty metres it had shrunk to a chimney and a thread of smoke. From
    // here it subtends about twenty degrees and reads as a house.
    x: 6,
    z: -15,
    eye: 1.62,
    bearing: 209,
    pitch: 27,
    yawRange: 90,
    pitchRange: 38,
  },
]

export const STOP_BY_ID: Readonly<Record<string, Stop>> = Object.fromEntries(
  STOPS.map((s) => [s.id, s])
)

/** Total scroll the journey occupies, in viewport heights. */
export const JOURNEY_VH = 700

/** The stop nearest a given progress — drives the stencil label and the dial. */
export function activeStop(t: number): Stop {
  let best = STOPS[0]
  let bestD = Infinity
  for (const s of STOPS) {
    const d = Math.abs(s.t - t)
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}

/** Progress of the seam between stop `i` and `i+1`, used by the dial. */
export function segmentProgress(t: number, index: number): number {
  const a = STOPS[index]
  const b = STOPS[index + 1]
  if (!a || !b) return 0
  return Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)))
}
