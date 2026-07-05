# encold.guru

The personal site of Enkhbold Nyamdorj — a backend/systems engineer in Ulaanbaatar.
This file is the standing brief for anyone (human or model) who works on it. Read it
before you change anything. It is part architecture, part conscience.

---

## The one idea (build it, never narrate it)

The whole site is one argument: **there is a line between the part of a system that is
allowed to guess, drift, and be wrong, and the part that is never permitted to lie.**
The work is the line between them.

Everything here is downstream of that. It is not a portfolio. It does not list a stack
or sell a résumé. The experience and the skill are meant to be *felt* through the work,
never stated. The single place anything is stated plainly is the **colophon** — the
buried document of fact — because that is the part that is not permitted to lie.

There is a moral order to it, and the moral order is the design:

- **Build the boundary first, the cleverness second.** The gate comes before the trick.
- **Drift is allowed; lying is not.** Anything random must be *seeded and clamped* —
  reproducible, bounded chaos. Never unbounded, never different between two loads.
- **Decide what failure looks like in advance, and be honest enough to call it.**
- **You fall to your reflexes, not your intentions.** So the conventions below are not
  suggestions — they are the habits this codebase has drilled. Keep them under pressure.
- **It is built at night, in a city the big tools forgot.** It must work for everyone:
  reduced motion, touch, small screens, slow GPUs — not as an afterthought, as the point.

If you ever find yourself adding copy that *explains* the concept, stop. The idea is
felt, never narrated.

---

## What it is now: the dive

You ride a sealed capsule straight down a shaft. Scrolling lowers you; the world rises
past a fixed, rendered cage. You pass distinct **floors** (stages), cross a **thermocline**
(the boundary) from the drifting upper water into the still, locked deep, and settle on
the **foundation** at the bottom — which is the colophon, the bedrock the dive rests on.

The floors are **strata of the owner**, outer self → inner self. The surface is the
appearance — an open blue-sky steppe with a grazing herd, visual, nearly wordless, built
to be seen (no gate — the owner removed it). Each floor down is a layer closer
to the true nature: values, concerns, worries, carved as scenarios in his own voice,
wordiest at the bottom. The thermocline is where the performance stops: above it the shown
self (allowed to drift), below it the one not permitted to lie.

- **The capsule** is fixed (the foreground that never moves — the rider, the constant).
- **The medium** (the shaft and its floors) moves through it (real parallax, not drift).
- **The descent is the argument**: from the shown surface to the part that cannot lie.

Two speeds, always: the world drifts slow and soft; foreground responses (reveals, the
cursor, instruments) snap instantly with no easing. The contrast is deliberate.

---

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind v4
(theme lives in `app/globals.css` via `@theme`, not a JS config) · three.js via
`@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing` · Lenis
(smooth scroll) · Zustand (scroll state). Package manager: **pnpm**.

Fonts (three deliberate voices, wired in `app/layout.tsx`):
- **Space Grotesk** — display / instruments (mechanical, not corporate).
- **Fraunces** — the prose voice (the literary human inside the machine).
- **Geist Mono** — every exact value: depth, coordinates, the colophon. Fixed width is
  the part not permitted to lie.

`next.config.mjs` sets `typescript.ignoreBuildErrors: true`. The only standing type
errors are the project-wide "missing @types/three" (`TS7016`) on every three-importing
file and the JSX shader-material declarations — both pre-existing and harmless. Do not
let *new* errors hide behind that flag; run `pnpm exec tsc --noEmit` and confirm your
files add nothing beyond the known `three` noise.

---

## Architecture

Entry: `app/page.tsx` chooses `MobileFallback` (when `useGpuTier().isFallback` — mobile or
weak GPU) or the 3D `Experience` (dynamic import, SSR off).

`components/experience/index.tsx` is the spine:
- Lenis drives a `600vh` scroll; progress (0→1) lands in the Zustand store and on
  `window.__lenis` (use `window.__lenis.scrollTo(p * max, {immediate:true})` to jump to a
  depth when testing).
- A fixed `<Canvas>` holds the 3D **medium**; DOM siblings hold the fixed foreground:
  `Capsule`, `Levels`, `NavOverlay` (the depth gauge), `ScrollHint`, `Cursor`, `Colophon`.

The 3D scene (`Scene` in the same file): `CameraRig` · `Environment` · `Shaft` · `Seam` ·
`PostProcessing`.

### The medium (3D, behind glass)
- `components/experience/camera-rig.tsx` — a **straight vertical descent**. Only Y tracks
  scroll (`Y_SURFACE → Y_BEDROCK`), with a small pointer parallax. No swooping.
- `components/experience/environment.tsx` — a dim ambient, a faint surface light, and a
  **dive lamp** that rides with the camera. Fog tightens and darkens with depth (pressure).
- `components/world/shaft.tsx` — the shaft: continuous corner **rails** + faint **rungs**
  (passing structure / travel reference in the void) + a **divider** framing each cell +
  each cell's **stage**. Stages are compact; the rest of each cell is travel void.
- `components/world/seam.tsx` — the **thermocline**: a thin cool-blue beam at `SEAM_Y`. A
  line, never a plane (a plane washes the view — that was a mistake we fixed). The camera
  crosses it once, aligned to the Threshold level.
- `components/world/shaft-walls.tsx` — the walls are **strata in cross-section**: one
  band per floor cell below ground, each a shade denser than the one above, a thin
  sediment line at every boundary. Bands derive from `floors[]` — the geology always
  matches the levels.
- `components/world/grass.tsx` — **GPU grass** (`<GrassField>`). Tens of thousands of
  instanced blades placed once; the wind lives in the **vertex shader** (one `uTime`
  uniform + a pointer-parting uniform), so the CPU does nothing per blade. This is the
  pattern to reach for whenever a floor wants dense animated geometry: animate in the
  shader, never in a per-frame JS loop over instances. Lighting is cheap uniforms
  (sun/ambient/tip), matched to the scene by the caller.
- `lib/world-config.ts` — `Y_SURFACE`, `Y_BEDROCK`, `SEAM_Y`, `MAX_DEPTH`, the
  `progress→depth` mapping, `regionFactor(y)` (0 below the seam = locked, 1 above = drift),
  clamped drift amplitudes, and `stillnessAt(y)` — the **temperament gradient** (0 surface
  drift → 1 bedrock stillness). Every floor receives it as `FloorProps.stillness`; scale
  ambient amplitudes by `(1 − 0.65 × stillness)` whenever a scene's motion is touched.
- `lib/floors.ts` — derives each floor **cell** from `SECTION_RANGES` so the visible floor
  always matches the level in the HUD. Each floor gets a compact **stage band** (`yTop/
  yBottom/yCenter/height`) inside its cell; `center`-anchored stages float mid-cell,
  `floor`-anchored stages stand on the cell floor.

### The capsule (fixed foreground DOM)
- `components/ui/capsule.tsx` (+ `.capsule-*` in `globals.css`) — the rendered cage: a
  beveled porthole with brushed-metal struts, rivets, bolts, glass, a pressure vignette,
  and the **instruments**: live depth readout (the home for the coordinate number), the
  dive-site coordinate, a status that flips at the thermocline, and the **manifest** latch
  that opens the colophon.
- `components/ui/nav-overlay.tsx` — the **depth gauge** on the right strut: a tick per
  level, a thermocline marker, a cursor tracking depth; click a tick to dive there.

### The levels (the words)
- `components/sections/levels.tsx` — every level's content lives in **one fixed slot** in
  the viewport and cross-faders in at its depth (marker `NN / 07`, the claim in Fraunces,
  the body, and the proof artifact). The motion is the medium's; the words hold station.
  That consistency is the meaning — text must never again be scattered across 3D space.

### The proof (artifacts) and the truth (colophon)
- `components/ui/proof-reveal.tsx` — surface → proof. Open by default (`Room.revealOpen`
  overrides; only the surface floor starts closed — the appearance keeps its words few);
  toggles instantly, no easing.
- `components/artifacts/*.tsx` — one concrete artifact per level that *demonstrates*
  rather than states (a gate that refuses, a ledger that sums to zero, Mongolian
  morphology, an audible cadence, a snapping reflex target, kill-dates, live UB time).
- `components/ui/colophon.tsx` — the buried truth. Flat monospace, no glow, no decoration.
  The real record, pulled from `lib/data.ts`. The one place that states plain fact.

### Content
- `lib/content.ts` — the **strata**: the seven floors' confessions (the owner's voice,
  outer → inner), the artifact each one reveals, the held-line/colophon copy. `[SPECIFIC]`
  marks placeholders
  awaiting the owner's real material (named dead projects + real kill-dates, the games,
  the chord, **verified** Mongolian morphology — the гэр example is a guess and on a site
  about not lying it must be checked before launch).
- `lib/data.ts` — the **truth**: name, location, email, and the real experiences /
  projects / skills / contacts that the colophon prints. Do not turn this into surface copy.

---

## How to detail or add a floor

This is the part future sessions will spend the most time on. The foundation is built so
a floor is an isolated, self-contained scene — you can go arbitrarily deep on one without
touching the rest.

A floor scene is `components/world/floors/<id>.tsx`, exporting
`Floor<Name>({ yTop, yBottom, yCenter, height }: FloorProps)`. The contract:

- It renders **only** three.js JSX (meshes / groups / instancedMesh / lines). No DOM, no
  `"use client"`.
- It builds inside its **stage band**: x,z ∈ [-4, 4] (the cell is `SHAFT_HALF = 5`),
  y ∈ [`yBottom`, `yTop`], front facing +z. The camera sits at z≈7 looking toward -z at
  (0, camY-3, 0), FOV 60 — compose for a porthole, centred, not too wide.
- **Palette**: amber `#e8a020` is primary — `meshStandardMaterial` with a dark base color
  + `emissive="#e8a020"` (intensity ~0.3–0.7) + metalness ~0.7 + roughness ~0.4 (a dive
  lamp + dim ambient light it). Cool blue `#4060c0` only as a rare, meaningful accent.
  No pure white.
- **Randomness is seeded and clamped**: `makeRng("floor-<id>")` from `@/lib/prng` inside a
  `useMemo`. Never `Math.random`. Never call `rng()` inside `useFrame`. Clamp every drift.
- **Motion** is slow and ambient (this is the drifting world) — except where instant snap
  *is* the meaning (see reflex). Drive it off `state.clock.elapsedTime` in `useFrame`.
- **Respect reduced motion**: `useReducedMotion()` → freeze when true.
- **Performance**: `instancedMesh` (reuse one `dummy` Object3D) for repeated elements.

To add a floor: add a room to `lib/content.ts` + a range to `SECTION_RANGES`
(`hooks/use-scroll-store.ts`), create the scene file, register it in the `sceneFor` map in
`shaft.tsx`, and add an artifact if it reveals one. `lib/floors.ts` derives the rest.

### The charter — each floor's foundation, and what to build on it

The foundations are laid: each floor has its claim, its stage, its interaction (the
pointer doctrine), and its temperament (`stillness`). What each floor still owes is its
**scenario** — one concrete moment, staged in the medium, that argues the claim without
saying it. Detail one floor per session; each is an isolated scene file. The scenario is
shown, never captioned.

1. **surface** — the appearance. Claim: what's shown is composed, calm, indifferent to
   being watched. Built (`floors/surface.tsx`): an open green steppe under the eternal
   blue sky — undulating textured ground, a dense **GPU grass** field rippling in the
   wind (`<GrassField>`, vertex-shader wind), a **snow-capped mountain range** on the
   horizon (one vertex-coloured cone geometry reused per peak — rock→snow up its height,
   no z-fighting), distant hazy hills, drifting clouds + **cloud shadows** crawling over
   the grass, a far flock, a worn trail, and a small horse **herd** grazing the mid-field
   (each `<GrazingHorse>` self-animates: graze drift, head nod, tail swish, contact
   shadow). Blue-sky daylight + a depth-fading hemisphere fill (see `sky-dome.tsx` +
   `environment.tsx` surface stop; keep `uSunDir` == `KEY_POS[0]`). There is deliberately
   **no gate** — the owner removed it; do not reintroduce a barrier. Rich elements gate on
   `rich = full || reducedTier` so integrated-GPU Chrome ("reduced" tier) still gets the
   full scene; only "minimal" is stripped. Build on: real cast shadows on capable tiers,
   seasonal light, richer herd behaviour — never clutter; the elegance is the openness.
2. **threshold** — where the performance stops. Claim: one self performs, one keeps the
   books. Scenario: the crossing itself — as the cab passes `SEAM_Y`, the drifting cubes
   above complete into the locked lattice below in one legible instant. Build on: the
   moment of crossing (the medium acknowledging the lock, once, exactly at the line).
3. **reflex** — before thought. Claim: under pressure you fall to what you drilled.
   Scenario: a round — a target called, hit at cadence, confirmed; the one mechanic that
   fires without deliberation. Build on: round structure (call → snap → confirm), and the
   `[SPECIFIC]` games named in the artifact.
4. **ear** — knowing before naming. Claim: felt first, checked second. Scenario: a
   suspension held a beat too long, then released — the cadence the ear closed early.
   Build on: tie the 3D strings to the artifact's Web Audio — pluck the medium, hear the
   interval in the cab (`[SPECIFIC]` the real chord).
5. **tongue** — the carried language. Claim/worry: a language machines treat as noise
   goes quiet where they run. Scenario: a word written stroke by stroke down a column —
   then a search pass sweeping the columns and finding nothing. Build on: the
   write-then-miss cycle; verified morphology (`[SPECIFIC]`).
6. **oath** — against self-deception. Claim: decide what failure looks like before love
   does. Scenario: a burial on schedule — one slab standing at its date, then lying down,
   never dramatized; the field is the record. Build on: slabs carrying the real dates
   (`[SPECIFIC]` the bets).
7. **place** — the deepest worry and its ground. Claim: honest work doesn't need the
   map's permission. Scenario: the city going about itself — windows cycling, smoke
   rising, no one performing for the visitor; only the benchmark answers, once. Build on:
   the city's slow life; the colophon latch stays the only exit.

---

## Conventions (these are drilled habits; keep them under pressure)

- **Seeded, clamped randomness only.** It is the literal expression of the thesis. A
  `Math.random()` in this repo is a bug, not a shortcut.
- **No copy that explains the concept.** Evocative, never expository. If it narrates the
  metaphor, cut it.
- **Understatement over aphorism.** The voice is quiet. If a line sounds quotable, proud,
  or like a movie trailer, flatten it or cut it — the scene and the artifact carry the
  claim. Words earn their place only where the visual can't speak; the deeper the floor,
  the more they're allowed to say, never the louder.
- **Two speeds.** Scroll-/depth-driven = soft. Pointer-/keyboard-driven = instant
  (`transition: none`). Don't ease a foreground response.
- **The pointer doctrine (in the medium).** Above the seam a floor may respond to the
  cursor softly, lagging, eased — the performer flirts (surface wind, threshold lean).
  Below the seam a response is instant and frame-exact (reflex snap, ear pluck, tongue
  caret, the benchmark's single pulse) — or deliberately absent (oath; the city). Nothing
  below the line eases toward the cursor. All pointer response stops under reduced motion.
- **Reduced motion + mobile are first-class.** Every motion gates on `useReducedMotion()`;
  the CSS guard in `globals.css` kills animation under `prefers-reduced-motion`. The
  mobile fallback (`components/ui/mobile-fallback.tsx`) carries the *same* dive with CSS
  only (capsule frame, depth readout, the two regions, levels as `<details>`, the colophon).
- **Performance is part of the aesthetic.** No heavy effect library for what a few lines of
  shader/canvas/CSS can do. Instance repeated geometry. Cap DPR.
- **Tiers, and the software path.** `hooks/use-gpu-tier.ts` detects the GPU and picks a
  `QualityConfig` (ultra/high/medium/low + `maxDpr`, wired into the `<Canvas dpr>`).
  Crucially it detects **software rasterizers** (SwiftShader / llvmpipe) by renderer string
  and forces the **low** tier — on software every pixel is drawn on the CPU, so fill-rate
  (grass overdraw, DPR, transparent planes) is the enemy, not vertex count. Scale dense/
  overdraw-heavy things down for low (the surface: fewer, shorter grass, no cloud planes,
  `maxDpr` 0.65); keep the rich version for real GPUs. `?tier=ultra|high|medium|low` forces
  a tier (testing on a software machine, or a power user). Measure real FPS on the software
  path (a headless/SwiftShader browser) — don't assume. `window.__diveDiag` reports the
  live decision; the DOM fallback prints it and, when WebGL is genuinely off, tells the
  visitor how to enable it.
- **The colophon is the only place that states fact.** Keep it flat, honest, undecorated.
- **Keep the amber-on-navy geometric DNA.** Evolve it; don't replace it. Cool blue is the
  boundary/instrument note — never ambient haze.

---

## Commands

```bash
pnpm dev      # http://localhost:3000
pnpm build    # production build (must exit 0)
pnpm exec tsc --noEmit   # confirm no new type errors beyond the known three/JSX noise
```

Verify visually by driving depth with `window.__lenis.scrollTo(p * max, {immediate:true})`
and screenshotting at: surface (0), the thermocline crossing (~0.2), a deep floor, and the
foundation (~0.98). Confirm the capsule and readout are pixel-fixed at every depth while
the medium rises; each level lands in the same slot; the thermocline reads as a line, not
a wash; reduced-motion freezes the drift; 390px width gets the mobile dive. Zero console
errors.

---

## A note to whoever comes next

This site is small and it is honest. It would be easy to make it more impressive and less
true — to add a particle storm, a bloom-soaked hero, a clever generative flourish that
drifts a little differently every time and means nothing. Resist it. The whole point is
the line: the part that may be beautiful and wrong, and the part that must be plain and
right. Build the boundary first. Then be as clever as you like on the correct side of it.
