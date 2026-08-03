// The seven stops. Positions are XZ only — the camera rig grounds them against
// the heightfield at runtime, so a change to the terrain can never leave a stop
// floating or buried.
//
// The circuit is genuinely clockwise: the bearing of each camera position from
// the ger increases monotonically (16 -> 24 -> 77 -> 176 degrees), approaching
// from the north, rounding the working east side, and arriving at the south
// door. See lib/world.ts for why the working spine is east.

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
}

export const STOPS: readonly Stop[] = [
  {
    id: "track",
    index: 1,
    t: 0.04,
    label: "The Track's End",
    // Out in the ungrazed grass, north-north-east of camp. The look is aimed
    // WNW into the setting sun: this is the backlit-Stipa frame, and the camp
    // is revealed later by the look track swinging south, not by moving.
    x: 18,
    z: -104,
    eye: EYE_HEIGHT,
    bearing: 288,
    pitch: -2,
    yawRange: 26,
    pitchRange: 14,
  },
  {
    id: "buuts",
    index: 2,
    t: 0.17,
    label: "The Buuts",
    x: 10,
    z: -34,
    eye: EYE_HEIGHT,
    bearing: 196,
    pitch: -3,
    yawRange: 24,
    pitchRange: 12,
  },
  {
    id: "corral",
    index: 3,
    t: 0.31,
    label: "The Corral",
    x: 10,
    z: -22,
    eye: EYE_HEIGHT,
    bearing: 145,
    pitch: -4,
    yawRange: 28,
    pitchRange: 12,
  },
  {
    id: "east-wall",
    index: 4,
    t: 0.47,
    label: "The East Wall",
    x: 5.9,
    z: -1.2,
    eye: 1.5,
    bearing: 249,
    // The spine passes at arm's length, which means looking DOWN at it. Held
    // level, everything on the ground sat below the frame and the whole beat
    // was a blank wall.
    pitch: -13,
    yawRange: 22,
    pitchRange: 14,
  },
  {
    id: "door",
    index: 5,
    t: 0.62,
    label: "The Door",
    x: 0.4,
    z: 6.2,
    eye: 1.55,
    bearing: 353,
    pitch: -1,
    yawRange: 20,
    pitchRange: 16,
  },
  {
    id: "threshold",
    index: 6,
    t: 0.78,
    label: "The Threshold",
    // Ducking under a 1.5 m frame. The step goes OVER the threshold, never on
    // it — the rule encoded as a camera move, felt and never explained.
    x: 0,
    z: 1.2,
    eye: 1.32,
    bearing: 0,
    pitch: -6,
    yawRange: 14,
    pitchRange: 10,
  },
  {
    id: "toono",
    index: 7,
    t: 0.93,
    label: "The Toono",
    // A seat by the stove. Free look opens fully here — this is the only place
    // the visitor may look straight up, and the frame they find is the logo.
    // Aimed THROUGH the crown, not merely upward. From a seat at (0.9, -0.6)
    // the toono centre at (0, 2.264, 0) sits on bearing 236 and 53 degrees up;
    // at 1.8 m away the 0.7 m ring subtends about 43 degrees, so it frames the
    // sky inside a 60 degree lens with room to spare. Aim anywhere else and you
    // are looking at the underside of a roof.
    x: 0.9,
    z: -0.6,
    eye: 0.85,
    bearing: 236,
    pitch: 53,
    yawRange: 70,
    // Kept under (90 - pitch) so free look can never tip past vertical and roll
    // the horizon over.
    pitchRange: 30,
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
