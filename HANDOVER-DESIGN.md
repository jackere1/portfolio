# AILCHIN — 3D asset brief

Paste this into Claude Design. It is the complete brief for every asset the site
needs. Ranked: the top of the list changes the frame most.

---

## What the world is

`encold.guru` is a photoreal **Mongolian herder camp at dusk**, in the browser, in
three.js. The visitor arrives on foot as a **guest**, circles the camp clockwise the way
a guest actually would, steps over the threshold, and comes back out under the stars.
Nine stops, mid-afternoon (sun +25°) through to night (sun −19°).

**Realism is the goal and there is no metaphor to service.** Nothing here is symbolic.
It is a working household on the summer steppe, with everything a working household
actually has.

---

## Hard rules for every asset

**Format.** glTF 2.0 / `.glb`, PBR metal-rough. **Y-up. 1 unit = 1 metre.** Real-world
scale, no exceptions — the camera is a 1.65 m standing eye and everything is measured
against it.

**Origin.** Each asset's origin sits at the point it is placed by: feet on the ground for
creatures, base for objects. Facing **+Z**. (In world terms −Z is north, +X east.)

**Textures.** 1024² max, 512² preferred. Baked AO welcome. No emissive except where
stated. Ship albedo + normal + roughness; **no separate metalness map** unless the object
is genuinely metal.

**Albedo must be GREYSCALE or near-neutral wherever an asset is instanced many times.**
Per-instance colour is applied in code via `instanceColor`. A baked-in colour makes 120
clones. This is the single most important technical instruction here.

**No skeletons, no skinned animation.** The site's rule is that animals never walk on
camera — they go uncanny through motion, not shape. Deliver **separate baked poses as
separate meshes** and the code selects between them.

**LODs.** Where stated, ship LOD0/LOD1/LOD2 as separate meshes. Screen sizes are given
per asset and they are measured, not guessed — do not over-build for 20 px.

### Palette and light

Late-summer steppe: **gold, khaki, dusty olive, bleached bone, dry soil.** The one green
thing in the world is nettle, because nothing eats it. There is **no white anywhere** —
bone is the ceiling. Blue is sacred (Tengri) and is budgeted at a few square pixels; the
only blue objects are the ovoo's khadag and the jerrycans.

Most of the journey is **low sun, blue hour, or firelight**. Assets must read as
**silhouette first** — that is what carries them at these light levels.

### Banned, absolutely

Lush green grass · wheat-field waving · **eagle hunters** (Kazakh, far west, wrong region)
· **prayer-flag strings** (Tibetan, wrong culture) · fences · paved roads · streetlights ·
domed yurt roofs (a Mongolian ger is a **shallow straight-poled cone at 20°**, never a
Turkic dome) · any door not facing south · a ger with no working clutter around it.

Do **not** design: the sky, the sun, a Milky Way, or terrain ground geometry. Those are
continuous functions of the sun's arc in shader code and an authored image cannot carry
them. (The Milky Way in particular must remain the real NASA/SVS equatorial star map —
painting one would be an astronomical lie the site refuses to tell.)

---

# The assets

## TIER 1 — the living things

These are the weakest thing in every frame that contains them. Today the entire
population of this world is **nine spheres, thirteen cylinders and one capsule.**

### 1. Sheep — the flock body ★ highest priority

Today: **one ellipsoid.** A scaled sphere, 80 triangles, no head, no legs, no ears, no
tail. 120 of them, every one the identical colour. The code's own comment claims "a pale
mass with a dark head" — there is no head.

- **Need:** LOD0 **900–1500 tris**, LOD1 ~250, LOD2 ~40 (or a card).
- **Poses (separate meshes, no rig):** `graze` (head down, the default), `alert` (head
  up), `couched` (legs folded under, body on the ground, head tucked — a completely
  different silhouette, currently faked by lowering the ellipsoid 12 cm).
- **The read is the head and the legs.** A headless silhouette is wrong at 20 px as much
  as at 2 m. Mongolian sheep are fat-tailed — the rump is distinctive, use it.
- Fleece: heavy, matted, dusty. Not fluffy, not clean.
- **Greyscale albedo** — the flock's colour mix (cream / brown / black) is applied per
  instance in code.
- Seen at: 22 m at stop 04 (~20 px tall), 6.9 m at stop 09, 268 m at stop 01.

### 2. Goat ★ highest priority — does not currently exist

There is a `goat` boolean on 45 of the 120 animals whose **only** effect is an 8% shrink.
Same sphere, same colour. The brief promises "leggier and darker" and delivers nothing.

The cashmere goat is the **economic backbone** of a modern Mongolian herd. A herd with no
visible goats is the same romanticising omission as leaving out the solar panel.

- **Need:** LOD0 **1000–1600 tris**, LOD1 ~300. Same pose set, same material/atlas as the
  sheep so it costs one geometry and no extra draw call.
- **The horns and the beard ARE the read.** Upright carriage, leggier, harder coat.
- Greyscale albedo; coats biased dark/piebald in code.

### 3. Bankhar — the guardian dog ★ highest priority

Today: **two spheres and two tiny spheres for brows.** A 0.52 m ball with a 0.28 m ball
stuck to it.

This animal is a *character*: it notices you, rises, and barks, and that beat is one of
the journey's best. It is also the one the audio is timed against.

- **Need:** LOD0 **1500–2500 tris**. It is seen at **3.0 m** (stop 05) and **5.2 m** near
  dead centre (stop 08) — this is the closest any creature gets and it needs to hold up.
- **Poses:** `lying` (relaxed, head on paws), `rising`, `standing-alert` (head up, barking).
- A bankhar is **large, long-bodied, deep-chested, thick double coat, heavy tail, drop
  ears, tan brow spots over the eyes** (the *dörvön nüdtei*, "four-eyed" marking — keep
  those, they are culturally specific and already in the code).
- Black-and-tan. Not a fluffy pet — a working livestock guardian.

### 4. The horse (and foal) ★ high priority

Today: a sphere body, a cylinder neck, a capsule head, four cylinder legs, a cylinder tail.

Mongolian horses are **short, stocky, thick-necked, short-legged, big-headed** — nearer a
Przewalski than a thoroughbred. Do not model a riding horse.

- **Need:** LOD0 **1200–2000 tris**, LOD1 ~350.
- **Poses:** `standing` (the mares, loose), `grazing`, and a **foal** variant at ~0.6 scale
  with proportionally longer legs, tethered at the зэл line.
- Thick manes, long tails, shaggy. Greyscale albedo; bay/dun/grey/black applied in code.

### 5. The host — a human silhouette ★ high priority

Today: four cylinders and two spheres.

Appears twice, and both are the culture's own grammar: stepping out of the door to receive
you (you call *нохой хор*, hold the dog, and **wait**), and at the end throwing milk after
you with a **tsatsal** — "pouring out a white road ahead."

- **Need:** LOD0 **2000–3000 tris**. Always seen at distance and always as a **silhouette**
  — a bad human reads far worse than none, so favour a correct outline over facial detail.
- **Poses:** `standing-at-door`, `arm-raised-casting` (holding the tsatsal, the nine-eyed
  milk ladle).
- Wearing a **deel** — the long belted robe, sash, boots. Not a costume: a work garment.
- Include the **tsatsal** as a small separate asset.

---

## TIER 2 — the objects the visitor gets close to

### 6. Interior furnishings ★ high priority

Stops 06 and 07 are **inside**, and these are the largest things on screen in the entire
journey — the chests are **986 × 271 px**. They are currently untextured flat-orange boxes
sharing two colours, so the room collapses into one orange mass.

- **Painted chests** (*авдар*) — orange/red lacquer with traditional polychrome ornament.
  This is the single biggest texture win in the site.
- **Low table** + stools, painted to match.
- **Beds** with folded felt and blankets.
- **Objects to put ON the table** — bowls, a thermos, a plate of aaruul. Right now nothing
  sits on it, which reads as a room nobody has been in.
- **Khokhuur** — the sewn cowhide airag bag: flat-sided, seamed, sagging. Currently a
  tapered cylinder, and it is 143 × 188 px in the seated view.

### 7. The stove and its pipe ★ medium

Cast iron box stove, the pipe rising through the crown. Seen at close range at stops 06–07.
Needs real iron material and a door. **No emissive** — the fire's light is done in code.

### 8. The Mongolian saddle ★ medium

Currently **a box with two knobs**. The Mongolian saddle is one of the most distinctive
objects in the culture: **high pommel and cantle, silver studding, bright leather.** Only
~32 px wide on screen so it needs no detail — but it needs the right **silhouette**, and
it is the west side's entire claim to being the tack side.

### 9. Rocks and scree ★ medium — zero risk, real gain

**Three to five** stone forms, angular and weathered, granite/schist. Instanced and placed
in code by a rule that reads slope and bare-soil. Nothing in the world depends on a rock,
which makes this the safest asset on the list and the best near-field realism per triangle.

### 10. Argal — the dung cakes ★ medium

The stack currently reads as a pile of **firewood**, which is a meaningful miss: argal
versus wood is one of the quiet facts that says *treeless steppe*.

- **Two or three variants** of a single cake: an **irregular flattened patty with torn
  edges**, ~22 cm across. Not a disc. ~40 tris each.

---

## TIER 3 — materials and fields, not objects

### 11. Ground albedo ★ high priority

The current texture is a **green lawn photo** (mean RGB 96,109,48 — green above red) whose
colour has to be actively suppressed by three shader terms.

- **Need:** seamless tileable **1024²**, plus normal and roughness.
- **Dry steppe, cropped to stubble**: bitten-off grass, bare soil between, small stone,
  dung fleck. Gold/khaki/grey-brown. **No green.**
- **2–3 variants** so the anti-tiling blend mixes real variety instead of one image against
  itself.
- Mean-normalise it and **state the measured mean** with the asset.

### 12. Cloud thickness field ★ high priority

The clouds are currently 5-octave fbm — presence without shape language.

- **Need:** a **seamless tileable greyscale** cloud-thickness map, 1024² or 2048².
- **Fair-weather summer cumulus over a huge plain**: distinct rounded cauliflower tops,
  flat bases, real gaps of clear sky, clumping into streets.
- Value = thickness/depth, 0 = clear. It gets thresholded by a cover parameter, so it needs
  usable structure across the whole 0..1 range.

### 13. Distant mountain ridgelines ★ high priority

The far ranges are noise. Nothing in the world depends on their shape.

- **Need:** authored ridgeline profiles — either a heightmap tile or **2–3 explicitly
  separated ranges** at different distances so the blue-haze steps are real geometry rather
  than a fog gradient.
- Khangai character: **rounded, worn, treeless, long shoulders.** Not alpine, not jagged.

### 14. Grass blade profiles ★ medium

- **Cropped stubble blade with a bitten tip**, **curled dead leaf**, **seed head**.
- **Халгай** (nettle): paired broad leaves on a stem — the only genuinely green plant here.
- **Дэрс** (chee grass): a coarse tussock with a seed head.
- Very low poly, 4–10 tris each; they are instanced hundreds of thousands of times.

### 15. Felt and canvas material ★ medium

The ger cover is flat colour. It needs a real **weathered canvas/felt** albedo + normal:
weave, dust staining rising from the ground line, sun bleaching, rope-wear.

---

## What NOT to design

| | why |
|---|---|
| Sky dome / gradient | a function of sun elevation **and** azimuth, which move independently; free-look means no partial painting survives |
| Sun disc | keyframed HDR radiance feeding a real bloom convolution; a sprite substitutes a painted flare for a found one |
| Milky Way / star field | must remain the **real NASA SVS equatorial map**; a painted one is an astronomical lie |
| Terrain ground mesh | `heightAt()` has **eight** consumers; an authored mesh forks the world into two surfaces and everything floats |
| Ger frame geometry | one parameterised seeded generator; three parts **change shape across the day** (urkh, khayaa, door) |
| Cloud motion, lighting, shadows | ground shadows query the field at arbitrary positions; lit/dark colours are keyframed across the arc |
| Fire, door seams, crown glow | one seeded flicker drives light + emissives together, all authored above 1.0 to feed bloom |
