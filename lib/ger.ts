// The ger, from one parameterised generator.
//
// Correct geometry IS the realism here. The things that make a ger a ger and
// not a Turkic yurt are all measurable: a SHALLOW roof of DEAD STRAIGHT poles
// (never a dome), a wall about 1.5 m high, a wooden south-facing door (never a
// fabric flap), and in summer the khayaa — the skirt of the cover — rolled up
// so the orange lattice shows underneath.
//
// Everything is seeded and clamped, so every ger is identical on every load.

import * as THREE from "three"
import { makeRng, seededDrift } from "./prng"
import {
  DOOR_HEIGHT,
  DOOR_WIDTH,
  GER_RADIUS,
  GER_ROOF_PITCH_DEG,
  GER_WALL_HEIGHT,
  TOONO_HEIGHT,
  TOONO_RADIUS,
} from "./world"

export interface GerParams {
  /** Seed name — every ger in the world comes from this one generator. */
  seed: string
  radius: number
  wallHeight: number
  toonoRadius: number
  /** How far up the wall the summer khayaa is rolled, exposing the lattice. */
  khayaaRoll: number
  /** Roof poles. A 5-khana ger carries about eighty. */
  uniCount: number
  /** Laths per direction in the criss-cross wall lattice. */
  khanaPerFamily: number
}

export const HOST_GER: GerParams = {
  seed: "ger-host",
  radius: GER_RADIUS,
  wallHeight: GER_WALL_HEIGHT,
  toonoRadius: TOONO_RADIUS,
  khayaaRoll: 0.24,
  uniCount: 80,
  khanaPerFamily: 62,
}

export interface GerBuild {
  /** The felt crown flap: where it lies folded by day and drawn by night. */
  urkh: { size: number; folded: THREE.Vector3; drawn: THREE.Vector3 }
  /** Cover: the wall band and the straight-sided roof cone. */
  wallCover: THREE.BufferGeometry
  roofCover: THREE.BufferGeometry
  /** Frame, as instance matrices. */
  uni: THREE.Matrix4[]
  khana: THREE.Matrix4[]
  /** The crown. */
  toono: THREE.BufferGeometry
  toonoSpokes: THREE.Matrix4[]
  bagana: THREE.Matrix4[]
  /** Door frame pieces and the two leaves. */
  doorFrame: THREE.Matrix4[]
  doorLeaf: THREE.Matrix4[]
  doorWidth: number
  doorHeight: number
  doorZ: number
  /** Tension bands around the cover, and the stone-weighted roof ropes. */
  bands: { y: number; radius: number }[]
  ropeStones: THREE.Vector3[]
  /** Where the chimney leaves the roof. */
  chimney: { base: THREE.Vector3; height: number }
  stats: { triangles: number }
}

const UP = new THREE.Vector3(0, 1, 0)

/** Fabric is not a cone. A slow harmonic wobble in the radius, continuous
 *  around the full turn so the closed cover never opens a crack at its seam. */
function fabricSag(theta: number): number {
  return (
    Math.sin(theta * 3 + 0.7) * 0.016 +
    Math.sin(theta * 7 - 1.9) * 0.009 +
    Math.sin(theta * 13 + 2.6) * 0.004
  )
}

/** Weathering: canvas is dust-stained from the ground line up, and it is the
 *  gradient — not the base colour — that makes it read as owned rather than new. */
function coverColor(y: number, wallHeight: number, out: THREE.Color): void {
  const clean = new THREE.Color(0.5, 0.47, 0.41)
  const dusty = new THREE.Color(0.3, 0.26, 0.2)
  // Stain climbs roughly a third of the wall, fading out.
  const k = Math.max(0, Math.min(1, (y - 0.02) / (wallHeight * 0.55)))
  out.copy(dusty).lerp(clean, k * k * (3 - 2 * k))
}

function applyCoverShaping(
  geo: THREE.BufferGeometry,
  wallHeight: number
): void {
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const theta = Math.atan2(x, z)
    const r = Math.hypot(x, z)
    if (r > 1e-4) {
      const s = 1 + fabricSag(theta) / r
      pos.setX(i, x * s)
      pos.setZ(i, z * s)
    }
    coverColor(y, wallHeight, c)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
}

/** Build one ger. Deterministic: same params in, byte-identical matrices out. */
export function generateGer(params: GerParams): GerBuild {
  const rng = makeRng(params.seed)
  const { radius, wallHeight, toonoRadius, khayaaRoll } = params

  const pitch = (GER_ROOF_PITCH_DEG * Math.PI) / 180
  const apexY = wallHeight + (radius - toonoRadius) * Math.tan(pitch)

  // The cover sits just outside the frame it is stretched over.
  const coverR = radius + 0.03

  // --- the door gap in the wall cover ---------------------------------------
  // Three's cylinder puts theta = 0 at +Z, which is due south. The door faces
  // south, so the gap starts there and the cover wraps the rest of the way.
  const doorHalf = Math.asin(DOOR_WIDTH / 2 / radius) + 0.03
  const wallH = wallHeight - khayaaRoll

  const wallCover = new THREE.CylinderGeometry(
    coverR,
    coverR,
    wallH,
    64,
    2,
    true,
    doorHalf,
    Math.PI * 2 - doorHalf * 2
  )
  wallCover.translate(0, khayaaRoll + wallH / 2, 0)
  applyCoverShaping(wallCover, wallHeight)

  const roofH = apexY - wallHeight
  const roofCover = new THREE.CylinderGeometry(
    toonoRadius + 0.02,
    coverR,
    roofH,
    64,
    3,
    true
  )
  roofCover.translate(0, wallHeight + roofH / 2, 0)
  applyCoverShaping(roofCover, wallHeight)

  // --- uni: the roof poles, dead straight ----------------------------------
  const uni: THREE.Matrix4[] = []
  const q = new THREE.Quaternion()
  const dir = new THREE.Vector3()
  const mid = new THREE.Vector3()
  const scale = new THREE.Vector3()

  for (let i = 0; i < params.uniCount; i++) {
    const theta = (i / params.uniCount) * Math.PI * 2
    // A seeded hair of irregularity — hand-cut poles are not a lathe.
    const jitter = seededDrift(rng, 0.012)
    const sx = Math.sin(theta) * radius
    const sz = Math.cos(theta) * radius
    const ex = Math.sin(theta) * toonoRadius
    const ez = Math.cos(theta) * toonoRadius

    dir.set(ex - sx, apexY - wallHeight + jitter, ez - sz)
    const len = dir.length()
    dir.normalize()
    q.setFromUnitVectors(UP, dir)
    mid.set((sx + ex) / 2, (wallHeight + apexY) / 2 + jitter / 2, (sz + ez) / 2)
    scale.set(1, len, 1)
    uni.push(new THREE.Matrix4().compose(mid, q, scale))
  }

  // --- khana: the criss-cross willow wall ----------------------------------
  // Two families of laths leaning opposite ways, which is what makes the wall
  // an expanding lattice rather than a fence.
  const khana: THREE.Matrix4[] = []
  const lean = 0.335 // radians of arc swept over the wall's height
  for (let family = 0; family < 2; family++) {
    const sign = family === 0 ? 1 : -1
    for (let i = 0; i < params.khanaPerFamily; i++) {
      const theta = (i / params.khanaPerFamily) * Math.PI * 2
      const t0 = theta - (sign * lean) / 2
      const t1 = theta + (sign * lean) / 2
      const sx = Math.sin(t0) * radius
      const sz = Math.cos(t0) * radius
      const ex = Math.sin(t1) * radius
      const ez = Math.cos(t1) * radius

      dir.set(ex - sx, wallHeight, ez - sz)
      const len = dir.length()
      dir.normalize()
      q.setFromUnitVectors(UP, dir)
      mid.set((sx + ex) / 2, wallHeight / 2, (sz + ez) / 2)
      scale.set(1, len, 1)
      khana.push(new THREE.Matrix4().compose(mid, q, scale))
    }
  }

  // --- toono: the crown ----------------------------------------------------
  const toono = new THREE.TorusGeometry(toonoRadius, 0.055, 10, 40)
  toono.rotateX(Math.PI / 2)
  toono.translate(0, apexY, 0)

  // Radial spokes inside the ring, plus the two crossing bars. This is the
  // shape the whole site's mark is drawn from.
  const toonoSpokes: THREE.Matrix4[] = []
  const SPOKES = 8
  for (let i = 0; i < SPOKES; i++) {
    const theta = (i / SPOKES) * Math.PI
    dir.set(Math.sin(theta), 0, Math.cos(theta))
    q.setFromUnitVectors(UP, dir)
    mid.set(0, apexY + 0.012, 0)
    scale.set(1, toonoRadius * 2, 1)
    toonoSpokes.push(new THREE.Matrix4().compose(mid, q, scale))
  }

  // --- bagana: the two columns holding the crown ---------------------------
  // The two columns stand ON the ring, not inside it: the toono torus has
  // radius `toonoRadius`, so anything at a smaller x is holding up air. You
  // must never walk between them, which is also why the interior camera path
  // passes outside the west one.
  const bagana: THREE.Matrix4[] = []
  for (const sx of [-toonoRadius, toonoRadius]) {
    mid.set(sx, apexY / 2, 0)
    scale.set(1, apexY, 1)
    bagana.push(
      new THREE.Matrix4().compose(mid, new THREE.Quaternion(), scale)
    )
  }

  // --- the door: wooden, painted, south-facing, and low ---------------------
  const doorFrame: THREE.Matrix4[] = []
  const zFace = radius + 0.02
  const halfW = DOOR_WIDTH / 2 + 0.07
  // Two posts.
  for (const sx of [-halfW, halfW]) {
    mid.set(sx, DOOR_HEIGHT / 2, zFace)
    scale.set(0.09, DOOR_HEIGHT, 0.12)
    doorFrame.push(
      new THREE.Matrix4().compose(mid, new THREE.Quaternion(), scale)
    )
  }
  // Lintel, and the threshold you step over and never on.
  mid.set(0, DOOR_HEIGHT + 0.045, zFace)
  scale.set(halfW * 2 + 0.09, 0.09, 0.12)
  doorFrame.push(new THREE.Matrix4().compose(mid, new THREE.Quaternion(), scale))
  mid.set(0, 0.06, zFace)
  scale.set(halfW * 2 + 0.09, 0.12, 0.14)
  doorFrame.push(new THREE.Matrix4().compose(mid, new THREE.Quaternion(), scale))

  const doorLeaf: THREE.Matrix4[] = []
  for (const sx of [-DOOR_WIDTH / 4, DOOR_WIDTH / 4]) {
    mid.set(sx, DOOR_HEIGHT / 2 + 0.06, zFace + 0.005)
    scale.set(DOOR_WIDTH / 2 - 0.012, DOOR_HEIGHT - 0.12, 0.045)
    doorLeaf.push(
      new THREE.Matrix4().compose(mid, new THREE.Quaternion(), scale)
    )
  }

  // --- tension bands and the stone-weighted ropes --------------------------
  const bands = [
    { y: khayaaRoll + wallH * 0.32, radius: coverR + 0.012 },
    { y: khayaaRoll + wallH * 0.74, radius: coverR + 0.012 },
  ]

  const ropeStones: THREE.Vector3[] = []
  for (let i = 0; i < 4; i++) {
    const theta = (i / 4) * Math.PI * 2 + 0.4
    const r = radius + 0.18 + seededDrift(rng, 0.05)
    ropeStones.push(
      new THREE.Vector3(
        Math.sin(theta) * r,
        0.1 + seededDrift(rng, 0.02),
        Math.cos(theta) * r
      )
    )
  }

  // The urkh (өрх): the square of felt that covers the crown. Folded back over
  // the north slope through the day to let the sun in, drawn across after dark.
  // Its corner ropes run down over the cover to the ground.
  const urkhSize = toonoRadius * 2.1
  // Folded back onto the NORTH roof slope, and actually sitting on it: the
  // roof drops (radius - r) * tan(pitch) from the crown, so anything placed at
  // the crown's height floats above the felt it is supposed to be lying on.
  const urkhR = toonoRadius * 2.35
  const urkhFolded = new THREE.Vector3(
    0,
    wallHeight + (radius - urkhR) * Math.tan(pitch) + 0.035,
    -urkhR
  )
  const urkhDrawn = new THREE.Vector3(0, apexY + 0.035, 0)

  // The stove sits under the crown, so its chimney leaves through the toono.
  const chimney = {
    base: new THREE.Vector3(0, apexY - 0.05, 0.22),
    height: 0.7,
  }

  return {
    urkh: { size: urkhSize, folded: urkhFolded, drawn: urkhDrawn },
    wallCover,
    roofCover,
    uni,
    khana,
    toono,
    toonoSpokes,
    bagana,
    doorFrame,
    doorLeaf,
    doorWidth: DOOR_WIDTH,
    doorHeight: DOOR_HEIGHT,
    doorZ: zFace,
    bands,
    ropeStones,
    chimney,
    stats: {
      triangles:
        (wallCover.index?.count ?? 0) / 3 + (roofCover.index?.count ?? 0) / 3,
    },
  }
}

/** Apex height for a given ger — the toono plane. */
export function gerApexY(params: GerParams): number {
  return (
    params.wallHeight +
    (params.radius - params.toonoRadius) *
      Math.tan((GER_ROOF_PITCH_DEG * Math.PI) / 180)
  )
}

export { TOONO_HEIGHT }
