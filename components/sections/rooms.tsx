"use client"

import { Room } from "./room"
import { Gate } from "@/components/artifacts/gate"
import { Ledger } from "@/components/artifacts/ledger"
import { Morphology } from "@/components/artifacts/morphology"
import { Interval } from "@/components/artifacts/interval"
import { Reflex } from "@/components/artifacts/reflex"
import { KillDates } from "@/components/artifacts/killdates"
import { LocalTime } from "@/components/artifacts/localtime"

/**
 * The seven rooms anchored in 3D, near each camera keyframe and offset to one
 * side so the held line never bisects the prose. Positions are tuned by eye
 * against the camera path in lib/camera-path.ts.
 */
export function Rooms() {
  return (
    <>
      <Room id="gate" position={[2.2, 4, 3]} artifact={<Gate />} holdStart />
      <Room id="boundary" position={[-1.6, -6, 1.5]} artifact={<Ledger />} />
      <Room id="language" position={[-1.8, -9.5, 1.5]} artifact={<Morphology />} />
      <Room id="music" position={[1.8, -12.5, 1.5]} artifact={<Interval />} />
      <Room id="reflex" position={[-1.8, -15.5, 1.5]} artifact={<Reflex />} />
      <Room id="killdates" position={[1.8, -18.5, 1.5]} artifact={<KillDates />} />
      <Room id="place" position={[0, -22, 1]} artifact={<LocalTime />} />
    </>
  )
}
