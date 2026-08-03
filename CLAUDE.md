# encold.guru — AILCHIN, The Guest

The personal site of Enkhbold Nyamdorj — a backend/systems engineer in Ulaanbaatar.
This file is the standing brief for anyone, human or model, who works on it. Read it
before you change anything.

---

## What it is

A photoreal Mongolian herder camp at dusk. You arrive on foot as a **guest**, circle the
camp the way a guest actually would, step over the threshold, and end seated at the stove
watching the Milky Way wheel past the toono — the crown ring of the roof. That final frame
is also the logo, which means the visitor does not get shown the identity, they **arrive**
at it.

**Realism is the goal, and there is no metaphor to service.** The previous version of this
site was a dive capsule descending a shaft, where every object existed to argue a thesis
about which parts of a system are allowed to be wrong. It was scrapped, deliberately, for
being over-conceptual — the argument had to be decoded before the world could be enjoyed.
Do not reintroduce it.

**Portfolio content is deferred on purpose.** The world gets built first, and gets to be
good, before any of Enkhbold's actual material is mapped into it. `lib/data.ts` holds the
real record and is untouched, waiting. Do not invent metaphors to carry it.

---

## The route

**Nine stops, afternoon through to night.** Sun elevation runs +25° to −19°, monotonically.

**The journey does NOT end inside looking up through the toono at the Milky Way.** For
Mongolians, stars seen through an uncovered crown signify **poverty** — the urkh (the felt
flap) is drawn over the toono after dark, and a ger that cannot cover its own crown is a poor
one. Looking up through it at daylight or the last blue is normal and iconic; it is
specifically stars that carry the omen. So the interior beats happen while there is still
light in the sky, and the visitor comes back **out** for the night. Warmth first, then vastness.

| | | |
|---|---|---|
| 01 | **The Track's End** | Mid-afternoon on open ground; the camp is a white speck. You are being seen coming. *Sun +23°, 16:34* |
| 02 | **The Camp Seen** | Close enough to be noticed. A guest announces and waits. *Sun +15.5°, 17:28* |
| 03 | **The East Side** | The working spine, at a respectful radius rather than arm's length. *Sun +8.5°, 18:26* |
| 04 | **The Herd Comes Home** | Golden hour, the loudest beat, placed before the world empties. *Sun +3°, 19:21* |
| 05 | **The Door** | The south face with the sun on the horizon behind you. *Sun −0.6°, 20:06* |
| 06 | **The Threshold** | Duck under the frame, step *over* the bosgo, never on it. *Sun −3.2°, 20:29* |
| 07 | **The Hearth** | Seated on the **west** (guests') side, looking up through the crown at the **last blue**. *Sun −5°, 20:46* |
| 08 | **Back Out** | Behind you the ger has sealed itself: urkh drawn, khayaa down, door shut. *Sun −11.5°, 21:32* |
| 09 | **Under It** | Open ground, the sky the whole frame. Where a Mongolian actually meets the night. *Sun −17.5°, 22:19* |

**The circuit is genuinely clockwise and this is load-bearing.** The door faces south, and
compass clockwise is N→E→S→W, so the approach comes from the **north** and rounds the
**east** side to reach the door. The working spine is east because that is the women's
domain, where water, milk, dung fuel and cooking gear actually live; the saddle and tack
are west. An earlier draft put the spine on the west wall and was geometrically impossible.

---

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind v4 (theme in
`app/globals.css` via `@theme`, no JS config) · three 0.182 via `@react-three/fiber` v9 +
`drei` + `@react-three/postprocessing` · Lenis · Zustand. **pnpm.**

`@types/three` is pinned to `0.182.0` to match the runtime. `pnpm exec tsc --noEmit` is
expected to print **zero** errors — not "fewer". If it prints any, you added them.
`next.config.mjs` still sets `typescript.ignoreBuildErrors: true`; do not rely on it.

> Environment note: the pnpm store contains files owned by an unmapped UID, so
> `pnpm install` fails at the bin-linking step with `EPERM ... chmod`. Packages still
> resolve and land. Edit `package.json` directly and verify with `tsc`/`build`.

---

## Architecture

`app/page.tsx` routes on `useGpuTier()`: the flat tier (phones, weak GPUs,
`prefers-reduced-motion`) gets `FlatTier`; everyone else gets `Experience`.

### The spine — one scalar drives everything
- `lib/world.ts` — the site plan. **Axes: −Z north, +X east, +Y up, 1 unit = 1 metre.**
  Bearings are compass degrees. Everything downstream reads this; never re-derive it.
- `lib/sun-arc.ts` — the keyframed arc. `writeSunState(out, t)` fills a preallocated object
  with every light, fog, exposure, star-opacity and phase value. **Deliberately free of any
  three.js import** — the flat tier reads the same arc, and must not pull a renderer with it.
- `lib/stops.ts` — the seven stops, their `t` values and camera poses.
- `hooks/use-journey.ts` — `journey.t` is a plain mutable object written by Lenis and read
  in `useFrame`. It lives **outside React** so travelling costs zero re-renders. The zustand
  store carries only discrete state (active stop, phase) and only updates when those flip.

### The world
- `lib/heightfield.ts` — `heightAt(x, z)`, evaluated on the CPU so the camera, the grass and
  the props all ground against the exact same surface the mesh is built from.
- `lib/terrain-maps.ts` — bakes height, grass density, slope and bare-soil into one float
  `DataTexture`. Sampled with NEAREST and **bilinear-filtered by hand in the shader**: float
  textures are only linearly filterable behind an extension, and a silent fallback to point
  sampling steps the grass base height by a third of a metre.
- `components/world/sky.tsx` — the authored twilight dome (see below).
- `components/world/terrain.tsx` — the hero patch plus a square ANNULUS skirt that begins
  exactly where it ends. They share a height function, a colouring rule and world-space UVs,
  and they do not overlap at all — see note 11 below for why that matters.
- `components/world/grass.tsx` — `Vegetation`: three toroidally-wrapped instanced layers.
  Two are grazed stubble (dense underfoot, sparse out to the fog); the third is the
  hard plants, on its own density channel with its own stiffness.
- `lib/ger.ts` + `components/world/ger.tsx` — the one ger generator and its renderer.
- `components/world/hearth.tsx` — the fire, the door seams, the crown glow and the smoke.
- `components/world/camp.tsx` — the working spine: argal stack, solar panel, jerrycans and
  milk cans, the aaruul tray, the uyaa rail and saddle, and the khashaa corral.

### Chrome
- `components/ui/toono-mark.tsx` — the mark and the dial, one geometry doing both jobs.
- `components/ui/chrome.tsx` — instruments, dial, entry ritual.
- `components/ui/flat-tier.tsx` — the same seven stops, held still.

---

## Things that are true and will break if you "fix" them

These each cost real time to find. They are not stylistic.

1. **Preetham cannot render this site.** It is a daylight model, undefined below the
   horizon, and two of seven stops are blue hour. It also double tone-maps under a
   composer (its fragment bakes a display curve, and its tonemapping include becomes a
   no-op once the composer forces `NoToneMapping`), and its `vSunfade` pins to ~1.0 at any
   sane sun scale. The sky is an **authored** twilight model instead, and it renders the
   solar afterglow, the earth's shadow and the Belt of Venus explicitly.
2. **Exposure runs BEFORE bloom.** Bloom thresholds at luminance 1.0; if exposure is
   applied after, that threshold drifts against the image for the whole journey. Bloom is a
   convolution effect and takes its own pass, so an effect placed before it genuinely runs
   first rather than being merged into the same shader.
3. **AgX, never ACES.** ACES skews deep blues toward purple, and this is a navy sky for two
   thirds of its length.
4. **Use the `delta` argument in `useFrame`.** R3F already consumed the clock this frame;
   `state.clock.getDelta()` returns ~0 and freezes anything driven by it.
5. **`castShadow = false` does not free the shadow map.** Dispose it, or the one-shadow-
   system-at-a-time budget is a fiction.
6. **`fog={false}` on the sky dome and the grass.** Fog density rises exactly as the stars
   arrive; without this the night sky is quietly eaten by the haze meant to hide the horizon.
7. **The ground has no roughness map and roughness is pinned at 1.** Dry soil and dead grass
   have no specular lobe worth the name. With a roughness map it picks up a sun glitter and
   stops being ground and starts being a lake.
8. **Wind travels.** Gust waves are functions of `dot(worldXZ, windDir) − time` with 14 m and
   38 m wavelengths, and the bend is applied in **world space along the wind** *after* the
   blade's own Y-rotation. Bending before the rotation makes every blade lean whichever way
   it happens to face — a field blown in three hundred directions at once. Every blade also
   carries its own phase offset in **every** term, so the field is never synchronised.
9. **Never pass a `ref` to `<Bloom>`.** `@react-three/postprocessing` memoises effect args
   with `JSON.stringify(props)`, and in React 19 a ref serialises into a circular structure
   and throws.
10. **The Milky Way's structure must be smooth noise.** Hashing `floor(d * k)` directly
    quantises the sky into visible blocks a few degrees across.
11. **The hero patch and the skirt must not overlap.** They were once stacked, both displaced
    by the same height function and kept apart by `polygonOffset`. Polygon offset is
    depth-slope dependent, and a 1.65 m eye sees nearly everything at a grazing angle, so the
    skirt punched through in shifting patches that read as the ground texture randomly
    changing while you scrolled.
12. **Grass wraps toroidally; it does not snap.** Snapping the whole field to a grid teleports
    every blade at once and re-samples the density mask under it, so blades pop in and out
    mid-travel. Wrapping means a blade only relocates at the tile boundary, past the fade,
    where it is already invisible.
13. **Density culling is per TUFT (`iClump`), never per blade.** Testing per blade shreds
    every clump into scattered single stalks, which destroys the tussocks entirely — a
    tussock's whole character is that it is a dense standing clump.
14. **Ambient intensity is NOT where the light arc lives.** `SKY_COLOR` and `GROUND_COLOR`
    already fall by more than an order of magnitude across the journey, so a small ambient
    intensity on top dims everything twice and turns stops 03–05 into black silhouettes
    with every prop invisible. The intensity RISES as the sun crosses the horizon, because
    that is the moment the sky stops being a fill light and becomes the key light.
15. **The crown is the SUN and its wood is red-orange, never blue.** Mongolian ger woodwork is
    red and reddish-yellow; the toono in particular is coloured for the sun, with the uni as
    its rays. It should be the warmest wood in the ger. (An earlier version painted the spokes
    khadag blue, which inverted the symbolism.)
16. **The urkh is drawn after dark.** It is folded back over the north roof slope by day to let
    the sun in, and drawn across the crown when it gets dark — along with the khayaa rolling
    down and the door shutting. Both are driven off sun elevation in `lib/sun-arc.ts`, so the
    ger visibly seals itself while the guest is inside, and stop 08 walks back out into that.
17. **The bagana stand ON the toono ring** (x = ±`toonoRadius`), not inside it. And you must
    never walk between them — the interior camera path passes outside the west one.
18. **Nothing may fill the toono opening.** The crown glow is a RING at the rim. It was once
    a filled disc, which is a lid on the only hole the sky comes through, and stop 07 is
    that hole. The galactic plane in `sky.tsx` is also aimed so the band genuinely falls
    inside what the crown frames from the seat — check both if you move either.

---

## Conventions

- **Seeded, clamped randomness only.** `makeRng("name")` from `lib/prng.ts`. A
  `Math.random()` in this repo is a bug. The world is identical on every load.
- **Nothing reads wall-clock time except ambient motion.** The journey is a pure function of
  `t`, so it scrubs exactly, in both directions.
- **Zero re-renders while travelling, zero allocation in `useFrame`.** Mutate through refs
  and preallocated objects.
- **Two speeds.** The world is damped and soft; pointer and keyboard responses are instant.
- **The camera moves only while the user scrolls.** Constant FOV, zero roll, stable horizon.
  That is the whole anti-nausea contract.
- **Authenticity is not decoration.** The solar panel, dish, motorcycle and dung stack stay
  in frame — 70–90% of herder households have them, and omitting them is the romanticizing-
  tourist error. Grass is gold and khaki, never green. All doors face south. Uni poles are
  straight at 20°, never a Turkic dome. The Milky Way is grey-white, never purple.
  **Banned:** lush green grass, wheat-field waving, eagle hunters (Kazakh, far west),
  prayer-flag strings (Tibetan), fences, paved roads, streetlights.
- **There is almost no tall grass around a Mongolian camp, because the herd eats it.** The
  ground is cropped to stubble and bald soil for hundreds of metres and does not recover
  while the family is camped there. A waving knee-high sward outside a ger is one of the
  loudest tells that nobody who lives there built the scene. Every tall silhouette in this
  world is something nothing will eat: **халгай** (nettle), which wants nitrogen and so
  grows exactly where the dung is — which also makes it the only genuinely green thing in a
  gold landscape — and **дэрс** (chee grass) tussocks further out. `GRAZING` in
  `lib/world.ts` reaches to 190 m; `BUUTS` is only the visibly trampled ring.
- **Palette is a timeline, not a swatch grid.** Tokens are grouped by when in the sun arc
  they may exist; `--grass-gold` and `--belt-venus` die at t=0.48 and do not come back.
  There is no white anywhere, and no fourth surface colour — no cards, no panels. Depth is
  hairlines and vignette. Sacred blue is budgeted at ≤40px² per surface.
- **The mark never rotates.** A ring with radiating ticks that spins is a loading spinner.

---

## Commands

```bash
pnpm dev          # http://localhost:3000
pnpm build        # must exit 0
pnpm exec tsc --noEmit   # must print ZERO errors
```

Drive the journey directly with `window.__ailchin.seek(t)` and screenshot at
t = 0.04 (the backlit grass), 0.31 (the Belt of Venus, looking anti-solar), 0.62 (deep blue
hour) and 0.95 (the Milky Way). Confirm: the grass burns gold rather than white; the far
land has no seam; the sky never bands; 390px width gets the flat tier; zero console errors.

Measured 2026-08-03 on Intel Meteor Lake integrated graphics: 16.7 ms median, 17.5 ms worst
at stop 01 with 330k blades — vsync-locked, with headroom.

---

## Where it is now

**The world exists, the light arc works, and the ger stands.** Terrain, grass, sky, camera,
render pipeline, chrome, the flat tier and the host ger with its hearth are in.

The ger comes from `lib/ger.ts` — one parameterised generator producing the khana lattice,
80 straight uni poles, the toono and its blue-painted spokes, the cover with its dust-stain
gradient, tension bands, stone-weighted ropes and the south-facing painted door. The hearth
(`components/world/hearth.tsx`) is what makes stops 04–07 legible: one warm point light,
emissive-above-1 door seams and crown, all riding a single clamped seeded flicker so the
fire and everything it touches inhale together. Chimney smoke reads from stop 01.

The night sky is the **real** one: NASA/Goddard SVS *Deep Star Maps 2020*, in equatorial
coordinates, rotated by the actual local sidereal time of the moment the scene depicts
(`lib/starmap.ts`). It was chosen over the more obvious ESO Milky Way panorama precisely
because that one is in *galactic* coordinates — rotating it until the band looks right is an
aesthetic placement dressed up as an astronomical one, which this site cannot do. **Its
attribution must ship**; see `public/sky/CREDITS.md`.

**The host** (`components/world/people.tsx`) appears twice, and both are the culture's own
grammar. On arrival, someone steps out of the door — that is the permission, because you call
*нохой хор*, hold the dog, and you WAIT; you do not approach until the household receives
you. On departure, they stand at the door and cast milk into the air after you with a tsatsal,
"pouring out a white road ahead". The last thing the visitor gets is not their own gaze, it is
a blessing thrown at their back. They stay a **silhouette** at distance — a bad human reads far
worse than none.

**The ovoo** (`components/world/ovoo.tsx`) stands on a rise west-south-west of the camp. Its
khadag are the only blue in this world besides the sky, and that is the whole cool-colour
budget spent in one place.

**Still missing:** audio, the зэл (the foal tether line that says late summer), the horses,
and the arrival HOLD — the scroll should refuse to advance until the host comes out.

The full plan, including the v1 cut list and the phase order, is at
`~/.claude/plans/lets-build-everything-from-golden-tide.md`.

**A cultural review pass by the owner is a launch gate, not a nicety.** The route, the ger
proportions, the camp layout and the east/west domestic split are researched but not lived,
and on a site whose whole argument is about not lying, that check is load-bearing.
