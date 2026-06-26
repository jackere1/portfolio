// The surface — the performing, drifting side.
//
// These are the rooms you scroll through: passions, philosophy, failures, in
// the owner's own voice. Nothing here states a job title or a tech stack — the
// experience is *felt* through the claims. The hard facts live only in the
// colophon (the part not permitted to lie), reached by crossing the boundary.
//
// Strings marked [SPECIFIC] are clearly-marked placeholders for real personal
// detail to drop in later without a redesign.

export type RoomId =
  | "gate"
  | "boundary"
  | "language"
  | "music"
  | "reflex"
  | "killdates"
  | "place"

export type ArtifactKind =
  | "gate"
  | "ledger"
  | "morphology"
  | "interval"
  | "reflex"
  | "killdates"
  | "localtime"

export interface Room {
  id: RoomId
  /** A depth coordinate, not a section name. The eyebrow ties each room to the descent. */
  marker: string
  /** The opening line, set large — the aphorism. */
  lead: string
  /** The rest of the paragraph (optional), set smaller. */
  body?: string
  /** Affordance label on the reveal control. */
  reveal: string
  /** Which concrete artifact lifts into view underneath. */
  artifact: ArtifactKind
}

// Ordered top → bottom. Markers are the room's world-Y; the Boundary room's
// "Y −8" is literally SEAM_Y — you cross the seam exactly there.
export const rooms: Room[] = [
  {
    id: "gate",
    marker: "Y +1",
    lead: "I don't trust discipline. I trust a gate that won't let me through.",
    reveal: "the gate",
    artifact: "gate",
  },
  {
    id: "boundary",
    marker: "Y −8",
    lead: "Most of what I make is an argument about where a system is allowed to be wrong.",
    body: "There's a part that guesses, drifts, sometimes hallucinates — and a part that is not permitted to lie, ever. The work is the line between them. My worst mistakes were all the same mistake: drawing that line one layer too high, trusting the guessing part to behave just this once. It never does. So now I build the boundary first and the cleverness second.",
    reveal: "the invariant",
    artifact: "ledger",
  },
  {
    id: "language",
    marker: "Y −11",
    lead: "A lot of the machines I work with were never meant to read my language.",
    body: "The grammar is the wrong shape for them — words that stack meaning end over end, search that breaks on its own morphology. So half of what I do is teach systems to read something nobody showed them, by ear and by measurement, refusing to believe it works until I've watched it hold on the exact cases that should have broken it.",
    reveal: "the word",
    artifact: "morphology",
  },
  {
    id: "music",
    marker: "Y −14",
    lead: "I could hear an interval before I could name one.",
    body: "Tension, resolution, a cadence your ear closes before your hands catch up — chords are just systems with a grammar you can feel, which is probably why I can't leave them alone either.",
    reveal: "the cadence",
    artifact: "interval",
  },
  {
    id: "reflex",
    marker: "Y −17",
    lead: "Two decades inside competitive games taught me the only mechanic you can actually use is the one you've drilled past thinking about.",
    body: "Under real pressure you don't rise to your intentions; you fall to your reflexes. Most of what I believe about engineering is downstream of that one fact.",
    reveal: "react",
    artifact: "reflex",
  },
  {
    id: "killdates",
    marker: "Y −20",
    lead: "Every project I care about has a date written on it — the day I've agreed in advance to kill it if it hasn't earned its life.",
    body: "I keep those dates. Building things is easy. The discipline is deciding beforehand what failure looks like, and being honest enough to call it when it shows up on schedule.",
    reveal: "the dates",
    artifact: "killdates",
  },
  {
    id: "place",
    marker: "Y −24",
    lead: "Most of this happens at night, alone, in a city most of the industry will never think about.",
    body: "The work I'm proudest of only matters here — built for people the big tools forgot to consider. That's not the limitation. It's most of the point.",
    reveal: "where",
    artifact: "localtime",
  },
]

export const roomById = (id: RoomId): Room =>
  rooms.find((r) => r.id === id) as Room

// ── Artifact data ──────────────────────────────────────────────────────────

// Gate (room 1): a value clamped at a bound. Push it; it refuses past the gate.
export const gate = {
  min: 0,
  max: 100,
  refusal: "the gate holds",
}

// Boundary (room 2): a two-column ledger that always sums to zero. Perturb one
// side and the other compensates — the invariant is not permitted to lie.
export const ledger = {
  rows: ["received", "settled", "in flight", "reversed"],
  invariant: "Σ = 0",
}

// Language (room 3): agglutinative morphology — meaning stacked end over end.
// [SPECIFIC] Verify the Mongolian forms/glosses with real morphology before launch.
export const morphology = {
  placeholder: true,
  base: "гэр",
  baseGloss: "a home",
  steps: [
    { add: "-т", form: "гэрт", gloss: "at a home" },
    { add: "-ээ", form: "гэртээ", gloss: "at one's own home" },
    { add: "-сээ", form: "гэртээсээ", gloss: "from one's own home" },
  ],
  // The search that breaks on its own morphology:
  query: "гэр",
  breaks: "the stem is buried under three suffixes — a naive index never finds it",
}

// Music (room 4): a cadence you can hear. Tension falls to resolution.
// [SPECIFIC] Swap for the chord/cadence he'd actually choose.
export const interval = {
  placeholder: true,
  label: "4 → 3",
  // Frequencies in Hz. A suspension (the 4) resolving down to the 3.
  tension: [261.63, 349.23, 392.0], // C4, F4, G4 — the held suspension
  resolution: [261.63, 329.63, 392.0], // C4, E4, G4 — C major, the 4 falls to the 3
}

// Reflex (room 5): the instant-snap foreground IS the proof. One still line,
// one zero-latency flip.
// [SPECIFIC] Name the games.
export const reflex = {
  placeholder: true,
  games: "[SPECIFIC — the games]",
  line: "The hand moves before the plan does.",
}

// Kill-dates (room 6): dates that hold. Some struck through — killed on schedule.
// [SPECIFIC] Replace with real bets and their real dates.
export const killdates = {
  placeholder: true,
  entries: [
    { name: "[SPECIFIC — a bet]", date: "2025-03-31", killed: true },
    { name: "[SPECIFIC — a bet]", date: "2026-09-30", killed: false },
    { name: "[SPECIFIC — a bet]", date: "2024-11-01", killed: true },
  ],
}

// Place (room 7): the ground truth. Real coordinate, live local time.
export const place = {
  city: "Ulaanbaatar",
  coordinate: "47.8864° N, 106.9057° E",
  timezone: "Asia/Ulaanbaatar",
}

// ── The held line + colophon ────────────────────────────────────────────────

// The one value that never moves: Ulaanbaatar's latitude, the immovable line's
// anchor. Its marker (∎, the QED tombstone) opens the colophon — cross the
// line and you reach the proof.
export const heldLine = {
  label: "47.8864° N",
  marker: "∎",
  open: "open the proof",
}

export const colophon = {
  // Flat, truthful, undecorated. The one place nothing performs.
  title: "COLOPHON",
  note: "The part not permitted to lie. Everything above is felt; everything here is checked.",
}
