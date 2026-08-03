"use client"

// The mark is the toono — the crown ring of the ger, seen from directly below.
// It is the last frame of the journey, which means the visitor does not get
// shown the identity, they arrive at it.
//
// The counts are not decorative and they are checkable:
//   · 20 pole ticks, because the ger has 80 uni and 20 divides it,
//   · the four nearest the bottom burn brighter, because the door faces south,
//   · two blue chords and nothing else blue, because that is the whole budget.
//
// The centre is not a shape. It is a hole, and the hole is the sky.
//
// ONE RULE: it must never rotate. A ring with radiating ticks that spins is a
// loading spinner, and the moment it reads as one, all of this is gone.

const C = 32
const RIM_R = 19
const RIM_INNER_R = 15.2
const POLE_COUNT = 20
const POLE_INNER_R = 21.5
const POLE_OUTER_R = 27.5
const POLE_INNER_HALF = 0.95
const POLE_OUTER_HALF = 0.45

/** SVG degrees are y-down, so 90 is due south — the bottom of the mark. */
function polePath(k: number): string {
  const deg = 90 + k * (360 / POLE_COUNT)
  const r = (deg * Math.PI) / 180
  const dx = Math.cos(r)
  const dy = Math.sin(r)
  const px = -dy
  const py = dx

  const p = (rad: number, half: number, sign: number) =>
    `${(C + dx * rad + px * half * sign).toFixed(2)} ${(
      C +
      dy * rad +
      py * half * sign
    ).toFixed(2)}`

  return [
    `M${p(POLE_INNER_R, POLE_INNER_HALF, 1)}`,
    `L${p(POLE_INNER_R, POLE_INNER_HALF, -1)}`,
    `L${p(POLE_OUTER_R, POLE_OUTER_HALF, -1)}`,
    `L${p(POLE_OUTER_R, POLE_OUTER_HALF, 1)}`,
    "Z",
  ].join(" ")
}

/** The four poles flanking due south. A silent marker for the door side. */
const SOUTH_POLES = new Set([0, 1, POLE_COUNT - 1, POLE_COUNT - 2])

export function ToonoMark({
  size = 40,
  poles = true,
  chords = true,
  title,
}: {
  size?: number
  poles?: boolean
  chords?: boolean
  title?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-label={title}
    >
      {poles &&
        Array.from({ length: POLE_COUNT }, (_, k) => (
          <path
            key={k}
            d={polePath(k)}
            fill="var(--amber)"
            opacity={SOUTH_POLES.has(k) ? 1 : 0.85}
          />
        ))}

      <circle
        cx={C}
        cy={C}
        r={RIM_R}
        stroke="var(--amber)"
        strokeWidth={3}
        fill="none"
      />
      <circle
        cx={C}
        cy={C}
        r={RIM_INNER_R}
        stroke="var(--amber)"
        strokeWidth={0.9}
        opacity={0.42}
        fill="none"
      />

      {chords && (
        <g stroke="var(--khadag)" strokeWidth={1.1}>
          <path d="M22.45 22.45 L41.55 41.55" />
          <path d="M41.55 22.45 L22.45 41.55" />
        </g>
      )}
    </svg>
  )
}

// The dial is the SAME geometry doing a second job: the rim segmented into the
// seven stops. Circumference is 2 pi 19 = 119.38; seven segments with seven
// six-degree gaps gives 45.43 degrees each.
const CIRC = 2 * Math.PI * RIM_R
const SEGMENTS = 7
const GAP_DEG = 6
const SEG_DEG = (360 - GAP_DEG * SEGMENTS) / SEGMENTS
const SEG_LEN = (SEG_DEG / 360) * CIRC
const GAP_LEN = (GAP_DEG / 360) * CIRC

export function ToonoDial({
  size = 66,
  stopIndex,
  onSeek,
}: {
  size?: number
  /** 1-based index of the stop currently composed. */
  stopIndex: number
  onSeek?: (index: number) => void
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Unfilled track. */}
      <circle
        cx={C}
        cy={C}
        r={RIM_R}
        stroke="var(--stone-deep)"
        strokeWidth={2.4}
        fill="none"
        strokeDasharray={`${SEG_LEN.toFixed(2)} ${GAP_LEN.toFixed(2)}`}
        transform={`rotate(-90 ${C} ${C})`}
      />
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const reached = i + 1 <= stopIndex
        const rotation = -90 + i * (SEG_DEG + GAP_DEG)
        return (
          <circle
            key={i}
            cx={C}
            cy={C}
            r={RIM_R}
            stroke={reached ? "var(--amber)" : "transparent"}
            strokeWidth={2.4}
            fill="none"
            strokeDasharray={`${SEG_LEN.toFixed(2)} ${(
              CIRC - SEG_LEN
            ).toFixed(2)}`}
            transform={`rotate(${rotation} ${C} ${C})`}
            style={{ cursor: onSeek ? "pointer" : undefined }}
            onClick={onSeek ? () => onSeek(i) : undefined}
            pointerEvents={onSeek ? "stroke" : "none"}
          />
        )
      })}
      <g stroke="var(--khadag)" strokeWidth={1.1} opacity={0.75}>
        <path d="M25.6 25.6 L38.4 38.4" />
        <path d="M38.4 25.6 L25.6 38.4" />
      </g>
    </svg>
  )
}
