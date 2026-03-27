import { create } from "zustand"

export type SectionName =
  | "hero"
  | "about"
  | "experience"
  | "projects"
  | "skills"
  | "contact"

interface ScrollState {
  /** 0-1 overall scroll progress */
  progress: number
  /** Current scroll velocity (for effects that react to scroll speed) */
  velocity: number
  /** Currently active section based on scroll position */
  activeSection: SectionName
  /** Whether the experience has finished loading */
  loaded: boolean

  setProgress: (p: number) => void
  setVelocity: (v: number) => void
  setActiveSection: (s: SectionName) => void
  setLoaded: (l: boolean) => void
}

/** Section scroll ranges (start, end) as fractions of total scroll */
export const SECTION_RANGES: Record<SectionName, [number, number]> = {
  hero: [0, 0.12],
  about: [0.12, 0.25],
  experience: [0.25, 0.48],
  projects: [0.48, 0.72],
  skills: [0.72, 0.88],
  contact: [0.88, 1.0],
}

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  velocity: 0,
  activeSection: "hero",
  loaded: false,
  setProgress: (p) => set({ progress: p }),
  setVelocity: (v) => set({ velocity: v }),
  setActiveSection: (s) => set({ activeSection: s }),
  setLoaded: (l) => set({ loaded: l }),
}))

/** Get progress within a specific section (0-1) */
export function getSectionProgress(
  globalProgress: number,
  section: SectionName
): number {
  const [start, end] = SECTION_RANGES[section]
  if (globalProgress <= start) return 0
  if (globalProgress >= end) return 1
  return (globalProgress - start) / (end - start)
}
