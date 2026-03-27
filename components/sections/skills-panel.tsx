import { Html } from "@react-three/drei"
import { useScrollStore, getSectionProgress } from "@/hooks/use-scroll-store"
import { skillCategories } from "@/lib/data"

export function SkillsPanel() {
  const progress = useScrollStore((s) => s.progress)
  const sectionProgress = getSectionProgress(progress, "skills")

  const opacity =
    sectionProgress < 0.05
      ? sectionProgress * 20
      : sectionProgress > 0.92
        ? (1 - sectionProgress) * 12.5
        : 1

  return (
    <Html
      position={[0, -18, 2]}
      center
      distanceFactor={8}
      style={{
        opacity: Math.max(0, Math.min(1, opacity)),
        transition: "opacity 0.3s",
        pointerEvents: opacity < 0.1 ? "none" : "auto",
      }}
    >
      <div className="blueprint-panel corner-tr w-[560px] select-none">
        <div className="section-header">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_75)]">
            Skills
          </h2>
        </div>

        <div className="space-y-5">
          {skillCategories.map((category, i) => {
            const catProgress = Math.max(
              0,
              Math.min(1, (sectionProgress - i * 0.08) * 5)
            )
            return (
              <div
                key={category.title}
                style={{
                  opacity: catProgress,
                  transform: `translateY(${(1 - catProgress) * 15}px)`,
                  transition: "opacity 0.5s, transform 0.5s",
                }}
              >
                {/* Category header with bar */}
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xs font-semibold text-[oklch(0.78_0.18_75)] whitespace-nowrap">
                    {category.title}
                  </h3>
                  <div className="flex-1 h-px bg-[oklch(0.78_0.18_75/0.15)]" />
                  <span className="text-[9px] font-mono text-[oklch(0.55_0.02_80/0.5)]">
                    {category.skills.length}
                  </span>
                </div>

                {/* Skills as inline flow */}
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {category.skills.map((skill, j) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 rounded bg-[oklch(0.78_0.18_75/0.06)] border border-[oklch(0.78_0.18_75/0.08)] px-2 py-1 text-[11px] text-[oklch(0.55_0.02_80)] hover:bg-[oklch(0.78_0.18_75/0.12)] hover:text-[oklch(0.78_0.18_75)] hover:border-[oklch(0.78_0.18_75/0.2)] transition-all cursor-default"
                      style={{
                        transitionDelay: `${j * 30}ms`,
                      }}
                    >
                      <span className="w-1 h-1 rounded-full bg-[oklch(0.78_0.18_75/0.4)]" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Html>
  )
}
