# Surface floor redesign — the golden-hour meadow

**Date:** 2026-07-05
**Floor:** `surface` (the top floor / "the appearance")
**Status:** design agreed with owner, pending spec review

## Goal

Replace the current surface (a 6.5 MB Alpine HDRI backdrop with sparse, clashing 3D
props) with **one astonishing, living, golden-hour mountain-meadow view** — matching the
owner's reference: lush green backlit grass in the foreground, layered hazy mountains, a
dramatic low sun and warm sky.

Three non-negotiables, in the owner's words:
1. **Astonishing / realistic** — it must look like the reference, not like "3D things
   sprinkled on a photo."
2. **Real 3D** — the foreground must have genuine depth and life (parallax + motion), not
   be a flat picture.
3. **Runs on a CPU** — no heavy per-frame computation; the "astonishing view" must cost
   almost nothing, so it works on software rasterizers too.

The reconciliation (standard cinematic-web technique): **bake the distance, keep the
foreground live.** The far view (sky + mountains) is shown, not computed — cheap on any
device. Only the foreground grass is real-time 3D, and only it scales with the GPU.

## The composed frame (near → far)

- **Foreground — live 3D grass (the star):** dense *green* grass, wind-swayed, **backlit**
  by the low sun so the tips and edges glow warm (rim / translucency in the shader). Sits
  on a gently rolling green ground with an optional faint path. This is the only part the
  viewer reads as "3D," and the only part that scales with hardware.
- **Middle/far — static mountain image (baked):** a real hazy-mountain photograph, its
  **sky luminance-keyed away in a cheap fragment shader** so the procedural sky shows
  through behind it. Backlit golden-hour mountains read as layered hazy silhouettes with
  warm-rimmed crests — organic, "lively and random" (owner's reasoning for a photo over
  hand-built geometry), and one textured quad = ~free to draw. Placed as 1–2 depth layers,
  cooler/paler toward the back (aerial perspective).
- **Sky — procedural shader (baked-cheap):** a dramatic sunset gradient (deep blue-violet
  zenith → warm orange-gold horizon), a **low sun disc + soft glow** sitting between the
  ridges, and a few slow warm cloud bands. A few ops per pixel — cheap even on software.

## Lighting & grading

- One **warm low directional "sun"** whose direction matches the sky's sun; a **cool sky
  fill** (hemisphere) for the shadow side. This lights the grass/ground to sit under the
  same light as the sky and mountains.
- **Filmic tone mapping** (ACES, the r3f default) + a **touch of bloom** on the sun and
  grass rim on rich tiers only (the glow that sells golden hour). No real-time shadow maps.

## Motion (two-speed, per the site's rule)

Grass sways (wind, vertex shader); clouds drift slowly; the light barely breathes. Nothing
else moves — the view is *held*, alive, not busy. `useReducedMotion()` freezes all of it.
Off-screen (once the cab descends past the surface) all per-frame work freezes via the
existing `FLOOR_ACTIVE_MARGIN` guard.

## What is removed

- The **6.5 MB Alpine HDRI** (`landscape_2k.hdr`) — deleted from the render path. It was
  the #1 crash source and the wrong place.
- The **horse herd** and **PBR boulders** on the surface — the reference is pure
  landscape; the props are what made it read as clutter on a photo. (Reversible — the owner
  can ask for a distant herd later.)
- The 1.4 MB `steppe_1k.hdr` experiment — not used by this design.

## Components (files)

- `lib/surface-light.ts` — **single source of truth** for the sun direction, sky/haze
  colours, fog, and grass tones. Imported by every surface element so sky, mountains,
  grass and light share one golden-hour palette. (Already created; retune to golden hour.)
- `components/world/sky.tsx` — **procedural sunset sky** (dome shader: gradient + sun disc
  + glow) with slow drifting cloud bands. Replaces the drei-`Sky`/HDRI background. Fades
  out as the cab descends past the seam.
- `components/world/mountains.tsx` — **NEW.** A static hazy-mountain image on 1–2 backdrop
  quads, sky luminance-keyed in the fragment shader, haze-tinted per layer, warm rim near
  the sun. Behind an `AssetBoundary` (a failed image → the procedural sky alone, never a
  blank).
- `components/world/grass.tsx` — evolve the existing GPU grass: **green** body, warm
  **backlit rim** term keyed to the sun direction, root AO, **fog dissolve** toward the
  haze, denser and better blade shape. Density/height per tier.
- `components/world/floors/surface.tsx` — recompose: the rolling green ground (lit, fog to
  haze), the grass field, the mountains layer, and the sky. Remove herd/rocks/HDRI usage.
- `components/experience/index.tsx` — drop the `HdriEnvironment` branch; always render the
  procedural sky; keep per-asset boundaries; ensure filmic tone mapping.
- `components/experience/environment.tsx` — surface stop retuned to golden hour (warm low
  sun at the shared `SUN_DIR`, cool hemisphere fill, fog colour = shared HAZE). Deep stops
  untouched so the seven floors below are unaffected.

## Per-tier plan

- **full / high** (real GPU, incl. the owner's NVIDIA): dense grass (~5–8k blades), full
  backlit rim, 2 mountain layers, procedural sky + clouds, bloom, DPR ≤ 1.5.
- **reduced** (integrated GPU): medium grass (~3k), same shaders (coherence preserved), 1–2
  mountain layers, sky + fewer clouds, bloom optional.
- **minimal** (software / CPU — SwiftShader/llvmpipe): thin grass (~1–1.5k short blades, or
  a baked grass-card fringe if measured too heavy), mountains + procedural sky still show
  (they're near-free), **no bloom**, **no cloud overdraw**, DPR ≤ 0.65. Still the full
  astonishing view, lighter foreground. Measured on a real software path, not assumed.

## Robustness

- **Core scene is zero-download and procedural** (sky + grass + ground + light) → paints a
  complete view on the first frame with nothing to fetch or fail.
- The **one external asset** (the mountain image) sits behind an `AssetBoundary`; if it
  404s or fails to decode, the procedural sky stands alone — never a blank, never a crash.
- Keeps the session's earlier robustness work: per-asset `<Suspense>`, error boundaries,
  no `<Preload all/>`, DOM-level `CanvasCrashBoundary` → CSS dive.

## First-paint budget

- Core view: **~0 KB** (all procedural/geometry).
- Mountain image: a compressed LDR (target **< 400 KB**, streamed behind its boundary).
- No HDRI, no PBR boulder set, no grass PBR maps required for the base look.

## Open detail (finalized during implementation, with visual iteration)

- **The exact mountain photo.** Primary: a CC0 / public-domain hazy backlit mountain-range
  photo (Wikimedia Commons / Unsplash / Pexels free licence), sky luminance-keyed at
  runtime. Fallback if none is secured: a **procedural layered mountain silhouette**
  (seeded ridge geometry, haze-tinted) so the design is never blocked on an asset.
- Exact palette (greener vs more golden), cloud density, and whether the path stays —
  tuned live against the reference.

## Risks

- Procedural sunset + keyed-photo mountains reaching "astonishing": golden-hour backlit
  silhouettes are forgiving (detail hides in shadow/haze), and the grass backlight + sky
  glow carry it — but it needs careful colour/exposure tuning against the reference.
- Luminance-keying a photo's sky can fringe where haze meets the ridge; a soft threshold +
  a slight downward feather handles it. If a chosen photo keys poorly, pick another or fall
  back to the procedural silhouette.
- Grass fill-rate on software: the enemy is pixels, not blades — keep the field a modest
  near fringe on `minimal`, measured on a real SwiftShader path.
