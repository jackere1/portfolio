# AILCHIN — continuation brief for a fresh Claude Code session

Paste this as the opening message of a new conversation.

---

**Read `CLAUDE.md` in full before touching anything.** It is the standing brief and it
carries 26 numbered "things that are true and will break if you fix them" — each one cost
real debugging time. In particular: the sky must stay authored (not Preetham), exposure
runs **before** bloom, AgX never ACES, ground normals come from the height function never
`computeVertexNormals`, grass wraps toroidally and culls per **tuft**, the cloud field is
defined exactly once and shared by sky and ground shadows, and the crown of the ger may
never be capped.

Use **pnpm**. `pnpm exec tsc --noEmit` must print **zero** errors. After any
`package.json` change, run `pnpm install --lockfile-only` (a full install fails at
bin-linking in this environment) and verify with `pnpm install --frozen-lockfile
--lockfile-only`, which is exactly the check Vercel runs.

Drive the journey with `window.__ailchin.seek(t)`. `?diag=1` prints the GPU tier probe and
`?tier=mobile|high|flat` forces a tier.

## Where things stand

The world, the light arc, the ger, the interior, the chrome, audio, the flat tier and the
mobile tier are all shipped and live on `encold.guru`. Recent work: phones now get the 3D
world (a capability gate was demanding an extension the site never used); the phone is a
true magic-window camera driven by the device quaternion; and WebGL context loss now
recovers instead of leaving a black canvas.

**A full asset audit has been done.** Every object was measured for its actual on-screen
pixel size at all nine stops and checked against real screenshots. `HANDOVER-DESIGN.md` is
the resulting brief for designed 3D assets. This document is the code half.

---

## Part 1 — bugs to fix NOW, before any asset arrives

These are all correctness problems found by the audit. Several are one-line. Ranked by how
much they damage the frame.

1. **The uni poles penetrate the roof cover along their whole length.** The ger reads as a
   *striped corrugated tank* at stops 03 and 05 — the loudest single wrongness in the
   world. The arithmetic is exact: perpendicular cover clearance is 0.028 m at the eave and
   0.019 m at the crown, and the pole radius is 0.028 and 0.019 at exactly those points, so
   the poles are tangent everywhere; then `fabricSag` pulls the felt inward by up to
   0.029 m over half the circumference. Fix by raising the cover offset above the pole
   radius **plus** the maximum sag.

2. **The khana lattice runs a full 2π with no door gap.** At stop 05 — the hero shot — you
   look through the open doorway at a diamond grille instead of into the house. The fix
   reuses the `doorHalf` value the cover already computes.

3. **Both tension bands are full circles too**, crossing the same open doorway at y = 0.64
   and y = 1.17. Same fix. Also drop them to ~4×24 segments: they are currently 1,152
   triangles for a feature 2–3 px tall.

4. **The urkh roll pokes through the roof cover** and hangs into the room as a hard grey
   polygonal slab at stops 06 and 07; its half-drawn state reads as sheet steel across the
   crown.

5. **Bare terrain shows through the felt floor.** `heightAt` over the ger footprint ranges
   −0.0255 to +0.0267 m and the floor disc sits at y = 0.012, so ground pokes through as a
   gravel patch in the middle of stop 06. Either lower the terrain under the footprint or
   raise the floor above the maximum.

6. **There is no environment map anywhere.** `environment.tsx` has only a hemisphere and a
   directional light, so **every** surface with metalness > 0.5 renders near-black — the
   milk cans, the stove, the saddle bosses, the pail. Either add a small procedural env map
   driven from the sun state, or drop the metalness values and fake the glints.

7. **There is no antialiasing anywhere** (`antialias: false`, `multisampling: 0`, no SMAA
   pass), so every thin object shimmers as the camera moves: corral posts are 1.5–2 px
   wide, plus the uni poles, the tension bands and the grass. **One SMAA pass fixes all of
   them at once** and is the highest value-per-line change on this list.

8. **The aaruul tray is on the wrong side of the roof.** The code uses the `ger.ts` theta
   convention (θ = 0 at +Z = south, increasing east), so θ = 152° is compass bearing 28° —
   north-north-east — while the comment claims south-east "right where stop 05 puts the
   camera under it". It is fully occluded there. Set θ = 28° for a genuine compass 152°,
   and tilt it toward the camera so it presents area rather than an edge.

9. **The ovoo is never seen.** Closest approach 103 m, never larger than ~25 × 28 px, and
   it is **not on a rise** (0.56 m above local mean, against a comment claiming "a dark
   notch on the skyline"). It spends 3,378 triangles and *the site's entire cool-colour
   budget* on khadag that are under half a pixel wide. Either move it onto the approach
   between stops 01 and 02 — where a guest would actually pass it, which would also make
   the clockwise circumambulation visible rather than merely documented — or cut it to ~25
   stones and 3 khadag and put it on real relief.

10. **The stone-weighted roof ropes do not exist.** The variable is named `ropeStones` and
    the comment promises them, but only four dodecahedra sit in the grass with nothing
    attached. Three or four catenary tubes from the crown down to those stones would add
    more to the exterior than the bands do, and would explain why the stones are there.

11. **The flock interpenetrates in the corral.** 120 animals of 0.39 m² are packed into
    58 m²: 110 of 120 overlap at least one neighbour, 154 overlapping pairs, worst
    penetration 99%. Stops 05–08 show a fused mass. Also: yaw is uniform random over 2π so
    no two neighbours agree, where a real grazing flock orients together.

12. **The flock has no tier gating** — 120 instances on a phone, identical to desktop,
    while `Vegetation` correctly cuts 383k to 156k on touch. And it calls
    `computeBoundingSphere()` every update while `frustumCulled` is `false`, which is dead
    work.

13. **The solar panel blows out to a white slab** at stop 05 — exactly the failure its own
    comment warns against. Roughly halve the gain and gate it harder on the panel actually
    facing the residual glow. It also has no cell grid, which is the one feature that
    identifies a PV panel at any distance.

14. **The vertical door seam renders as a dotted line** rather than continuous — it is
    z-fighting against the shut door leaves. Push it 5–10 mm proud.

15. **The `goat` flag is half-wired** — 45 of 120 animals carry it and its only effect is
    an 8% uniform shrink. This is exactly the class of bug CLAUDE.md note 20 warns about:
    the value exists, the brief claims it, the render never performs it. Either wire it to
    a real goat asset or delete the claim.

Also worth doing while in here: the terrain map bake blocks for ~2.5 s at load and could be
baked offline to a shipped 16-bit PNG/KTX2 loaded through the same `LoadingManager` — that
makes the progress bar honest and the mobile tier viable on genuinely weak hardware.

---

## Part 2 — the contract for incoming assets

Assets are being designed against `HANDOVER-DESIGN.md`. When they arrive:

- **glTF/GLB, Y-up, 1 unit = 1 metre, facing +Z**, origin at the placement point.
- Load through the **existing `LoadingManager`** so the entry button's fill — which *is*
  the progress bar — stays honest.
- **Keep every placement rule procedural and seeded.** `makeRng("flock")`, `makeRng(
  "bankhar")` etc. stay the only randomness; `Math.random()` is a bug. The world must be
  identical on every load.
- **Ground everything with `heightAt()`.** Never against a mesh.
- **Posing stays a pure function of `journey.t`.** No wall-clock, so the journey still
  scrubs exactly in both directions. Zero allocation in `useFrame`.
- **Instanced assets get greyscale albedo + `instanceColor`.** The flock's colour mix must
  be data, not three hex literals baked into a texture.
- **Add LOD selection by instance distance**, and gate counts on `quality.touch` the way
  `Vegetation` already does.
- Animals **never walk on camera** — select between baked poses, do not interpolate a rig.

## Part 3 — what must stay procedural

Do not let an asset replace any of these. Each is load-bearing and the audit confirmed the
coupling:

- **Terrain geometry.** `heightAt()` has eight consumers — camera grounding, the grass's
  baked height texture, prop placement, analytic normals, the skirt join, the density mask,
  the ground colouring, the entities. An authored mesh forks the world into two surfaces.
- **The ger generator.** It owns `apexY`, the door arc and the roof plane that `camp.tsx`
  and `interior.tsx` both re-derive, and three of its parts change shape across the day.
- **The sky dome, the sun disc, the light rig.** Continuous functions of elevation *and*
  azimuth, which move independently.
- **Cloud motion, lighting and shadows.** The ground queries the field at arbitrary world
  positions; the lit/dark colours are keyframed across the whole arc.
- **The hearth.** One seeded flicker drives the light, the door seams, the crown ring and
  the smoke together. The audit called it the best-executed thing in the repo. Leave it.
- **The khashaa corral, the argal heap, the khana, the twin-rut track.** In every case the
  win is upgrading the *unit* geometry and the material, never baking the system to a mesh.

## Verification

```bash
pnpm exec tsc --noEmit    # zero
pnpm build                # exit 0
pnpm install --frozen-lockfile --lockfile-only
```

Screenshot at t = 0.04, 0.31, 0.62, 0.95. Confirm the grass burns gold rather than white,
the far land has no seam, the sky never bands, and there are zero console errors. Check
390 × 844 as well as desktop — **a real phone caught the last two shipped bugs, and a
desktop had "verified" both of them.**
