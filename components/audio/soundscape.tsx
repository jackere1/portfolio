"use client"

import { useEffect, useRef } from "react"
import { journey, useJourneyStore } from "@/hooks/use-journey"
import { createSunState, writeSunState } from "@/lib/sun-arc"
import { makeRng } from "@/lib/prng"

// The soundscape, SYNTHESISED rather than sampled.
//
// Every layer here is filtered noise or a shaped oscillator built in WebAudio.
// That is not a compromise for lack of files — it is the better answer for
// this particular site: it downloads nothing, it is seeded and therefore
// identical on every load like the rest of the world, and it can be driven
// continuously by the journey scalar instead of crossfading between clips.
// A recording of a specific evening would also be a recording of a specific
// PLACE, and this place is composed, not photographed.
//
// Four beds and two one-shots, which is the cut the plan already committed to:
//
//   WIND      the ground layer. Filtered noise whose band and gain ride the
//             journey — brisker in the afternoon, easing at dusk as it does in
//             life, then thinning to almost nothing under the stars.
//   CRICKETS  late-summer stridulation, arriving with the sunset and thinning
//             again as the cold comes down.
//   FIRE      dung burns soft, so this is low crackle and hiss, and it is
//             audible only from the threshold inward.
//   ROOM      the muffled hush of being inside felt — everything outside
//             drops away the moment the door frame passes the camera.
//
//   DOG       one bark, at the arrival, because that is how you knock.
//   PAIL      a milk pail set down on the ground, once, at the corral.
//
// Muted until the entry gesture, because browsers require it and because the
// muted experience is complete by design.

interface Bed {
  gain: GainNode
  /** Target gain for a given journey progress. */
  at: (t: number, elevation: number) => number
}

function noiseBuffer(ctx: AudioContext, seconds: number, seed: string) {
  const rng = makeRng(seed)
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  // Brown-ish noise: integrated white, which has the low-heavy spectrum that
  // actually sounds like moving air rather than like a hiss.
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = rng() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buf
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * How far inside the ger the visitor is, 0 to 1.
 *
 * Felt is a very good sound barrier — a metre of it is most of why a ger is
 * bearable in wind — so the outdoor beds have to duck as the door frame passes
 * the camera, not merely be joined by a fire. Leaving the wind at full level
 * inside is the audio equivalent of leaving the walls off: the room stops
 * reading as enclosed, and the one-second flip at the threshold, which is the
 * best beat in the piece, does not land at all.
 *
 * The edges are placed on the crossing itself and on the walk back out, so the
 * transition is the door, not a fade someone chose.
 */
function indoors(t: number): number {
  const enter = clamp01((t - 0.605) / 0.035)
  const leave = 1 - clamp01((t - 0.83) / 0.04)
  const k = Math.min(enter, leave)
  return k * k * (3 - 2 * k)
}

export function Soundscape() {
  const entered = useJourneyStore((s) => s.entered)
  const muted = useJourneyStore((s) => s.muted)
  const started = useRef(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const mutedRef = useRef(muted)

  useEffect(() => {
    if (!entered || started.current) return
    started.current = true

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return

    const ctx = new Ctor()
    ctxRef.current = ctx
    void ctx.resume()

    const master = ctx.createGain()
    masterRef.current = master
    master.gain.value = 0.0
    master.connect(ctx.destination)
    // Ease in rather than snapping on at full level — and stay silent if the
    // visitor arrived already muted from a previous visit.
    if (!mutedRef.current) {
      master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.4)
    }

    const beds: Bed[] = []

    // --- wind ---------------------------------------------------------------
    {
      const src = ctx.createBufferSource()
      src.buffer = noiseBuffer(ctx, 8, "wind")
      src.loop = true
      const band = ctx.createBiquadFilter()
      band.type = "bandpass"
      band.frequency.value = 420
      band.Q.value = 0.6
      const gain = ctx.createGain()
      gain.gain.value = 0
      src.connect(band).connect(gain).connect(master)
      src.start()

      // A slow gust, so the level is never flat.
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.07
      lfoGain.gain.value = 160
      lfo.connect(lfoGain).connect(band.frequency)
      lfo.start()

      beds.push({
        gain,
        // Brisk in the afternoon, easing through sunset exactly as it does on
        // the steppe, and nearly gone in the still air after dark. Ducked hard
        // behind felt — not to silence, because you can always hear the wind
        // on a ger, but to the muffled version of it.
        at: (t) =>
          (0.1 + 0.16 * (1 - clamp01((t - 0.1) / 0.7))) *
          (1 - indoors(t) * 0.82),
      })
    }

    // --- crickets -----------------------------------------------------------
    {
      const gain = ctx.createGain()
      gain.gain.value = 0
      gain.connect(master)

      const src = ctx.createBufferSource()
      src.buffer = noiseBuffer(ctx, 4, "crickets")
      src.loop = true
      const hp = ctx.createBiquadFilter()
      hp.type = "bandpass"
      hp.frequency.value = 4600
      hp.Q.value = 12
      // Stridulation is a pulse train, not a tone.
      const chop = ctx.createGain()
      chop.gain.value = 0.5
      const pulse = ctx.createOscillator()
      pulse.type = "square"
      pulse.frequency.value = 22
      const pulseGain = ctx.createGain()
      pulseGain.gain.value = 0.5
      pulse.connect(pulseGain).connect(chop.gain)
      src.connect(hp).connect(chop).connect(gain)
      src.start()
      pulse.start()

      beds.push({
        gain,
        // In with the sunset, thinning again as the temperature drops — and
        // essentially gone indoors, since a cricket in the grass outside is
        // exactly the kind of thin high sound felt kills completely.
        at: (t, elev) =>
          0.05 *
          clamp01((6 - elev) / 8) *
          (1 - clamp01((-elev - 8) / 10)) *
          (1 - indoors(t) * 0.96),
      })
    }

    // --- fire ---------------------------------------------------------------
    {
      const gain = ctx.createGain()
      gain.gain.value = 0
      gain.connect(master)
      const src = ctx.createBufferSource()
      src.buffer = noiseBuffer(ctx, 6, "fire")
      src.loop = true
      const lp = ctx.createBiquadFilter()
      lp.type = "lowpass"
      lp.frequency.value = 900
      src.connect(lp).connect(gain)
      src.start()

      beds.push({
        gain,
        // Dung burns soft. Audible from the threshold inward and nowhere else.
        at: (t) => 0.15 * indoors(t),
      })
    }

    // --- room tone ----------------------------------------------------------
    {
      const gain = ctx.createGain()
      gain.gain.value = 0
      gain.connect(master)
      const src = ctx.createBufferSource()
      src.buffer = noiseBuffer(ctx, 5, "room")
      src.loop = true
      const lp = ctx.createBiquadFilter()
      lp.type = "lowpass"
      lp.frequency.value = 260
      src.connect(lp).connect(gain)
      src.start()

      beds.push({
        gain,
        at: (t) => 0.11 * indoors(t),
      })
    }

    // --- one-shots ----------------------------------------------------------
    const fired = { dog: false, pail: false }

    const bark = () => {
      const now = ctx.currentTime
      const g = ctx.createGain()
      g.connect(master)
      const o = ctx.createOscillator()
      o.type = "sawtooth"
      o.frequency.setValueAtTime(150, now)
      o.frequency.exponentialRampToValueAtTime(72, now + 0.16)
      const lp = ctx.createBiquadFilter()
      lp.type = "lowpass"
      lp.frequency.value = 1100
      o.connect(lp).connect(g)
      g.gain.setValueAtTime(0.0001, now)
      g.gain.exponentialRampToValueAtTime(0.5, now + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
      o.start(now)
      o.stop(now + 0.45)
    }

    const pail = () => {
      const now = ctx.currentTime
      const g = ctx.createGain()
      g.connect(master)
      const o = ctx.createOscillator()
      o.type = "triangle"
      o.frequency.setValueAtTime(430, now)
      o.frequency.exponentialRampToValueAtTime(300, now + 0.5)
      o.connect(g)
      g.gain.setValueAtTime(0.0001, now)
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7)
      o.start(now)
      o.stop(now + 0.72)
    }

    // --- the driver ---------------------------------------------------------
    const sun = createSunState()
    let raf = 0
    const tick = () => {
      const t = journey.t
      writeSunState(sun, t)
      for (const b of beds) {
        const want = b.at(t, sun.elevationDeg)
        // setTargetAtTime rather than a jump: scrubbing must not click.
        b.gain.gain.setTargetAtTime(want, ctx.currentTime, 0.12)
      }

      // The bark lands as the dog rises, and only once per pass.
      if (!fired.dog && t > 0.135 && t < 0.3) {
        fired.dog = true
        bark()
      }
      if (t < 0.12) fired.dog = false

      if (!fired.pail && t > 0.4 && t < 0.5) {
        fired.pail = true
        pail()
      }
      if (t < 0.38) fired.pail = false

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      void ctx.close()
    }
  }, [entered])

  // The toggle rides the master gain rather than tearing the graph down, so
  // unmuting resumes the same continuous beds at the same phase.
  useEffect(() => {
    mutedRef.current = muted
    const ctx = ctxRef.current
    const master = masterRef.current
    if (!ctx || !master) return
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.12)
  }, [muted])

  return null
}
