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

- **The capsule** is fixed (the foreground that never moves — the rider, the constant).
- **The medium** (the shaft and its floors) moves through it (real parallax, not drift).
- **The descent is the argument**: from the guessing surface to the part that cannot lie.

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
  crosses it once, aligned to the Boundary level.
- `lib/world-config.ts` — `Y_SURFACE`, `Y_BEDROCK`, `SEAM_Y`, `MAX_DEPTH`, the
  `progress→depth` mapping, `regionFactor(y)` (0 below the seam = locked, 1 above = drift),
  and clamped drift amplitudes.
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
- `components/ui/proof-reveal.tsx` — surface → proof. Open by default now (we have the
  space); toggles instantly, no easing.
- `components/artifacts/*.tsx` — one concrete artifact per level that *demonstrates*
  rather than states (a gate that refuses, a ledger that sums to zero, Mongolian
  morphology, an audible cadence, a snapping reflex target, kill-dates, live UB time).
- `components/ui/colophon.tsx` — the buried truth. Flat monospace, no glow, no decoration.
  The real record, pulled from `lib/data.ts`. The one place that states plain fact.

### Content
- `lib/content.ts` — the **surface**: the seven levels' claims (the owner's voice), the
  artifact each one reveals, the held-line/colophon copy. `[SPECIFIC]` marks placeholders
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

The seven stages today, each its own world: **gate** (a barred lock), **boundary** (order
vs drift at the thermocline), **language** (vertical script columns), **music** (resonating
strings), **reflex** (a snapping targeting grid), **kill-dates** (a graveyard of dated
markers), **place** (Ulaanbaatar at night). They are first passes — detail them.

---

## Conventions (these are drilled habits; keep them under pressure)

- **Seeded, clamped randomness only.** It is the literal expression of the thesis. A
  `Math.random()` in this repo is a bug, not a shortcut.
- **No copy that explains the concept.** Evocative, never expository. If it narrates the
  metaphor, cut it.
- **Two speeds.** Scroll-/depth-driven = soft. Pointer-/keyboard-driven = instant
  (`transition: none`). Don't ease a foreground response.
- **Reduced motion + mobile are first-class.** Every motion gates on `useReducedMotion()`;
  the CSS guard in `globals.css` kills animation under `prefers-reduced-motion`. The
  mobile fallback (`components/ui/mobile-fallback.tsx`) carries the *same* dive with CSS
  only (capsule frame, depth readout, the two regions, levels as `<details>`, the colophon).
- **Performance is part of the aesthetic.** No heavy effect library for what a few lines of
  shader/canvas/CSS can do. Instance repeated geometry. Cap DPR.
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
