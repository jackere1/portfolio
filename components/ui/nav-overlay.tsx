"use client"

import { useCallback } from "react"
import { useScrollStore, SECTION_RANGES, type SectionName } from "@/hooks/use-scroll-store"
import type Lenis from "lenis"

const sections: { name: SectionName; label: string }[] = [
  { name: "gate", label: "Gate" },
  { name: "boundary", label: "Boundary" },
  { name: "language", label: "Language" },
  { name: "music", label: "Music" },
  { name: "reflex", label: "Reflex" },
  { name: "killdates", label: "Kill-dates" },
  { name: "place", label: "Place" },
]

export function NavOverlay() {
  const activeSection = useScrollStore((s) => s.activeSection)
  const loaded = useScrollStore((s) => s.loaded)

  const scrollToSection = useCallback((name: SectionName) => {
    const [start, end] = SECTION_RANGES[name]
    // Offset 20% into the section so content is fully visible when landing
    const target = name === "gate" ? 0 : start + (end - start) * 0.2
    const lenis = (window as Window & { __lenis?: Lenis }).__lenis
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    if (lenis) {
      lenis.scrollTo(target * scrollHeight, { duration: 1.5 })
    } else {
      window.scrollTo({ top: target * scrollHeight, behavior: "smooth" })
    }
  }, [])

  if (!loaded) return null

  return (
    <nav
      className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-end gap-4"
      aria-label="Section navigation"
    >
      {sections.map(({ name, label }) => {
        const isActive = activeSection === name
        return (
          <button
            key={name}
            type="button"
            onClick={() => scrollToSection(name)}
            className="flex items-center gap-3 group cursor-pointer bg-transparent border-none p-0"
            aria-label={`Go to ${label}`}
            aria-current={isActive ? "true" : undefined}
          >
            <span
              className={`text-[10px] font-mono uppercase tracking-wider ${
                isActive
                  ? "text-[oklch(0.78_0.18_75)] opacity-100 translate-x-0"
                  : "text-[oklch(0.55_0.02_80)] opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
              }`}
            >
              {label}
            </span>
            <div
              className={`nav-dot ${isActive ? "active" : ""}`}
            />
          </button>
        )
      })}
    </nav>
  )
}
