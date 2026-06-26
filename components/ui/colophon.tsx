"use client"

import { useEffect, useRef } from "react"
import { useScrollStore } from "@/hooks/use-scroll-store"
import { colophon } from "@/lib/content"
import {
  personalInfo,
  experiences,
  projects,
  skillCategories,
  contactLinks,
} from "@/lib/data"

/**
 * The colophon — the part not permitted to lie.
 *
 * Everything else on the site performs and drifts. This one buried layer does
 * not: flat monospace, no amber, no glow, no radius. It states the hard facts —
 * the record, the work, the tools — plainly. Reached only by crossing the held
 * line. Surface is felt; this is checked.
 */
function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-4 py-1">
      <span className="w-28 shrink-0 text-[oklch(0.5_0.02_80)]">{k}</span>
      <span className="text-[oklch(0.86_0.01_80)]">{v}</span>
    </div>
  )
}

function Heading({ label }: { label: string }) {
  return (
    <div className="mt-10 mb-3 border-t border-[oklch(0.92_0.01_80/0.12)] pt-3 text-[0.625rem] uppercase tracking-[0.28em] text-[oklch(0.5_0.02_80)]">
      {label}
    </div>
  )
}

export function Colophon() {
  const open = useScrollStore((s) => s.colophonOpen)
  const setOpen = useScrollStore((s) => s.setColophonOpen)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      className="colophon"
      role="dialog"
      aria-modal="true"
      aria-label="Colophon — the record"
    >
      <div className="mx-auto max-w-2xl px-6 py-14 text-[0.78rem] leading-relaxed">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-[0.7rem] uppercase tracking-[0.32em] text-[oklch(0.86_0.01_80)]">
              {colophon.title}
            </h2>
            <p className="mt-3 max-w-md text-[oklch(0.5_0.02_80)]">
              {colophon.note}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close the colophon"
            className="shrink-0 cursor-pointer border border-[oklch(0.92_0.01_80/0.2)] px-3 py-1 text-[0.625rem] uppercase tracking-[0.18em] text-[oklch(0.7_0.01_80)] hover:border-[oklch(0.92_0.01_80/0.4)] hover:text-[oklch(0.92_0.01_80)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.92_0.01_80/0.6)]"
          >
            close · esc
          </button>
        </div>

        <Heading label="identity" />
        <Field k="name" v={`${personalInfo.name.first} ${personalInfo.name.last}`} />
        <Field k="location" v={personalInfo.location} />
        <Field k="email" v={personalInfo.email} />

        <Heading label="record" />
        <div className="space-y-4">
          {experiences.map((e, i) => (
            <div key={i}>
              <div className="flex flex-wrap gap-x-3 text-[oklch(0.86_0.01_80)]">
                <span className="text-[oklch(0.5_0.02_80)]">{e.period}</span>
                <span>
                  {e.title} · {e.company}
                </span>
              </div>
              <p className="mt-1 text-[oklch(0.6_0.02_80)]">{e.description}</p>
              <p className="mt-1 text-[oklch(0.5_0.02_80)]">
                {e.technologies.join(" · ")}
              </p>
            </div>
          ))}
        </div>

        <Heading label="built" />
        <div className="space-y-4">
          {projects.map((p, i) => (
            <div key={i}>
              <div className="flex flex-wrap items-baseline gap-x-3 text-[oklch(0.86_0.01_80)]">
                <span>{p.title}</span>
                {p.link && (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[oklch(0.5_0.02_80)] underline decoration-dotted underline-offset-2 hover:text-[oklch(0.86_0.01_80)]"
                  >
                    {p.link.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
              <p className="mt-1 text-[oklch(0.6_0.02_80)]">{p.description}</p>
              <p className="mt-1 text-[oklch(0.5_0.02_80)]">
                {p.technologies.join(" · ")}
              </p>
            </div>
          ))}
        </div>

        <Heading label="tools" />
        <div className="space-y-2">
          {skillCategories.map((c) => (
            <div key={c.title} className="flex flex-wrap gap-x-3">
              <span className="w-40 shrink-0 text-[oklch(0.5_0.02_80)]">
                {c.title}
              </span>
              <span className="text-[oklch(0.78_0.01_80)]">
                {c.skills.join(" · ")}
              </span>
            </div>
          ))}
        </div>

        <Heading label="reach" />
        <div className="space-y-1">
          {contactLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target={l.href.startsWith("mailto") ? undefined : "_blank"}
              rel={l.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
              className="block text-[oklch(0.78_0.01_80)] underline decoration-dotted underline-offset-2 hover:text-[oklch(0.92_0.01_80)]"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="mt-12 border-t border-[oklch(0.92_0.01_80/0.12)] pt-3 text-[0.625rem] text-[oklch(0.4_0.02_80)]">
          encold.guru — built at night, in Ulaanbaatar.
        </div>
      </div>
    </div>
  )
}
