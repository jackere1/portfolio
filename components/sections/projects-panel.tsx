import { Html } from "@react-three/drei"
import { useScrollStore, getSectionProgress } from "@/hooks/use-scroll-store"
import { projects } from "@/lib/data"
import { ExternalLink } from "lucide-react"

export function ProjectsPanel() {
  const progress = useScrollStore((s) => s.progress)
  const sectionProgress = getSectionProgress(progress, "projects")

  const opacity =
    sectionProgress < 0.05
      ? sectionProgress * 20
      : sectionProgress > 0.92
        ? (1 - sectionProgress) * 12.5
        : 1

  return (
    <Html
      position={[-1, -10, 2.5]}
      center
      distanceFactor={8}
      style={{
        opacity: Math.max(0, Math.min(1, opacity)),
        transition: "opacity 0.3s",
        pointerEvents: opacity < 0.1 ? "none" : "auto",
      }}
    >
      <div className="w-[500px] select-none">
        <div className="section-header mb-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_75)]">
            Projects
          </h2>
        </div>

        <div className="space-y-4">
          {projects.map((project, i) => {
            const cardProgress = Math.max(
              0,
              Math.min(1, (sectionProgress - i * 0.12) * 4)
            )
            return (
              <div
                key={i}
                className="blueprint-panel corner-tr"
                style={{
                  opacity: cardProgress,
                  transform: `translateX(${(1 - cardProgress) * 40}px)`,
                  transition: "opacity 0.6s, transform 0.6s",
                }}
              >
                {/* Project header with status dot */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[oklch(0.78_0.18_75)] shrink-0" />
                  <h3 className="text-sm font-semibold text-[oklch(0.92_0.01_80)]">
                    {project.title}
                  </h3>
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-[oklch(0.78_0.18_75)] hover:text-[oklch(0.90_0.12_240)] transition-colors shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-[oklch(0.55_0.02_80)] mb-3 pl-5">
                  {project.description}
                </p>

                {/* Tech stack as a horizontal bar */}
                <div className="pl-5 flex flex-wrap gap-1.5">
                  {project.technologies.map((tech) => (
                    <span key={tech} className="tech-tag">
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Decorative index */}
                <div className="absolute bottom-2 right-3 text-[9px] font-mono text-[oklch(0.78_0.18_75/0.2)]">
                  PRJ-{String(i + 1).padStart(2, "0")}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Html>
  )
}
