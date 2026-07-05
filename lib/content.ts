// The strata — one person, read top to bottom.
//
// The upper floors are the outer self: what you're shown, mostly visual, few
// words. Each floor down is a layer closer to the true nature — values,
// concerns, worries, carved as scenarios in the owner's own voice, densest at
// the bottom. Nothing here states a job title or a tech stack — the hard facts
// live only in the colophon (the part not permitted to lie), under it all.
//
// Strings marked [SPECIFIC] are clearly-marked placeholders for real personal
// detail to drop in later without a redesign.

export type RoomId =
  | "surface"
  | "threshold"
  | "reflex"
  | "ear"
  | "tongue"
  | "oath"
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
  /** Proof panel starts open. Omitted = open (only the surface starts closed). */
  revealOpen?: boolean
}

// Ordered top → bottom, outer self → inner self. Markers are depth coordinates
// tied to position, not to the room: the Threshold room's "Y −8" is literally
// SEAM_Y — the performance stops exactly there.
export const rooms: Room[] = [
  {
    id: "surface",
    marker: "Y +1",
    lead: "Everything is in order.",
    reveal: "try the gate",
    artifact: "gate",
    revealOpen: false,
  },
  {
    id: "threshold",
    marker: "Y −8",
    lead: "There's a version of me that performs, and a version that keeps the books.",
    body: "One is allowed to charm, to guess, to be wrong out loud. The other is not permitted to lie. Most of my real mistakes were the same mistake — letting the first one do the second one's job, just this once. It never holds.",
    reveal: "the invariant",
    artifact: "ledger",
  },
  {
    id: "reflex",
    marker: "Y −11",
    lead: "Under pressure I do what I've practiced, not what I intended.",
    body: "Twenty years of games showed me what's left in the quarter-second before thinking starts — and that it's trainable. So I watch what I repeat when nothing is at stake.",
    reveal: "react",
    artifact: "reflex",
  },
  {
    id: "ear",
    marker: "Y −14",
    lead: "Some things I knew before I had words for them.",
    body: "I could hear an interval before I could name one — tension leaning on resolution, the ear closing a cadence before the hands catch up. The feeling still arrives first. I follow it, then I check it.",
    reveal: "the cadence",
    artifact: "interval",
  },
  {
    id: "tongue",
    marker: "Y −17",
    lead: "My language stacks meaning end over end, and the machines were never taught to read it.",
    body: "Search breaks on our own morphology. Autocomplete gives up. Year by year, more of ordinary life runs through systems that treat my mother tongue as noise, and a language the machines can't read goes quiet in the places they run. Some nights I work on that.",
    reveal: "the word",
    artifact: "morphology",
  },
  {
    id: "oath",
    marker: "Y −20",
    lead: "Everything I start carries a date it has to answer.",
    body: "A date picked in advance — the day the thing is called dead if it hasn't earned its life. Deciding what failure looks like is easy before you're in love. So I pick the date before I start.",
    reveal: "the dates",
    artifact: "killdates",
  },
  {
    id: "place",
    marker: "Y −24",
    lead: "Most nights I work in a city the industry doesn't think about — and some nights I wonder if that means the work doesn't count.",
    body: "That's the oldest worry I have. The work gets done here anyway, night after night. Most days, that's answer enough.",
    reveal: "where",
    artifact: "localtime",
  },
]

export const roomById = (id: RoomId): Room =>
  rooms.find((r) => r.id === id) as Room

// ── Artifact data ──────────────────────────────────────────────────────────

// Gate (surface, floor 1): a value clamped at a bound. Push it; it refuses past the gate.
export const gate = {
  min: 0,
  max: 100,
  refusal: "the gate holds",
}

// Ledger (threshold, floor 2): a two-column ledger that always sums to zero. Perturb
// one side and the other compensates — the invariant is not permitted to lie.
export const ledger = {
  rows: ["received", "settled", "in flight", "reversed"],
  invariant: "Σ = 0",
}

// Morphology (tongue, floor 5): agglutinative morphology — meaning stacked end over end.
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

// Interval (ear, floor 4): a cadence you can hear. Tension falls to resolution.
// [SPECIFIC] Swap for the chord/cadence he'd actually choose.
export const interval = {
  placeholder: true,
  label: "4 → 3",
  // Frequencies in Hz. A suspension (the 4) resolving down to the 3.
  tension: [261.63, 349.23, 392.0], // C4, F4, G4 — the held suspension
  resolution: [261.63, 329.63, 392.0], // C4, E4, G4 — C major, the 4 falls to the 3
}

// Reflex (reflex, floor 3): the instant-snap foreground IS the proof. One still
// line, one zero-latency flip.
// [SPECIFIC] Name the games.
export const reflex = {
  placeholder: true,
  games: "[SPECIFIC — the games]",
  line: "The hand moves before the plan does.",
}

// Kill-dates (oath, floor 6): dates that hold. Some struck through — killed on schedule.
// [SPECIFIC] Replace with real bets and their real dates.
export const killdates = {
  placeholder: true,
  entries: [
    { name: "[SPECIFIC — a bet]", date: "2025-03-31", killed: true },
    { name: "[SPECIFIC — a bet]", date: "2026-09-30", killed: false },
    { name: "[SPECIFIC — a bet]", date: "2024-11-01", killed: true },
  ],
}

// Place (place, floor 7): the ground truth. Real coordinate, live local time.
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
