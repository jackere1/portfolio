import { Html } from "@react-three/drei"
import { useScrollStore, getSectionProgress } from "@/hooks/use-scroll-store"
import { experiences } from "@/lib/data"
import { useMemo } from "react"

export function ExperiencePanel() {
  const progress = useScrollStore((s) => s.progress)
  const sectionProgress = getSectionProgress(progress, "experience")

  const activeIndex = useMemo(() => {
    const idx = Math.floor(sectionProgress * experiences.length)
    return Math.min(idx, experiences.length - 1)
  }, [sectionProgress])

  const opacity =
    sectionProgress < 0.05
      ? sectionProgress * 20
      : sectionProgress > 0.92
        ? (1 - sectionProgress) * 12.5
        : 1

  return (
    <Html
      position={[2, -2, 1.5]}
      center
      distanceFactor={8}
      style={{
        opacity: Math.max(0, Math.min(1, opacity)),
        transition: "opacity 0.3s",
        pointerEvents: opacity < 0.1 ? "none" : "auto",
      }}
    >
      <div className="blueprint-panel corner-tr w-[460px] max-h-[540px] overflow-hidden select-none">
        <div className="section-header">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_75)]">
            Experience
          </h2>
        </div>

        {/* Timeline container */}
        <div className="relative pl-7">
          <div className="timeline-line" />

          {experiences.map((exp, i) => {
            const isActive = i === activeIndex
            return (
              <div
                key={i}
                className="relative pb-3 last:pb-0"
              >
                {/* Timeline dot */}
                <div
                  className={`timeline-dot ${isActive ? "active" : ""}`}
                  style={{ top: "4px" }}
                />

                <div
                  className={`rounded-lg transition-all duration-500 ${
                    isActive
                      ? "p-3 bg-[oklch(0.78_0.18_75/0.06)] border border-[oklch(0.78_0.18_75/0.2)]"
                      : "p-2 opacity-40 hover:opacity-60"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className={`font-medium text-[oklch(0.92_0.01_80)] ${isActive ? "text-sm" : "text-xs"}`}>
                      {exp.title}
                      <span className="text-[oklch(0.78_0.18_75)]">
                        {" "}@ {exp.company}
                      </span>
                    </h3>
                  </div>

                  {isActive && (
                    <div className="mt-2 overflow-hidden">
                      <p className="text-[10px] font-mono text-[oklch(0.78_0.18_75/0.6)] mb-2 flex items-center gap-2">
                        <span className="inline-block w-3 h-[1px] bg-[oklch(0.78_0.18_75/0.4)]" />
                        {exp.period}
                      </p>
                      <p className="text-xs leading-relaxed text-[oklch(0.55_0.02_80)]">
                        {exp.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {exp.technologies.map((tech) => (
                          <span key={tech} className="tech-tag">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Html>
  )
}
