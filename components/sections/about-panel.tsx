import { Html } from "@react-three/drei"
import { useScrollStore, getSectionProgress } from "@/hooks/use-scroll-store"

const paragraphs = [
  <>
    I&apos;m a software engineer with{" "}
    <span className="text-[oklch(0.92_0.01_80)] font-medium">
      4+ years of experience
    </span>{" "}
    building robust backend systems and scalable applications. My expertise
    lies in designing{" "}
    <span className="text-[oklch(0.78_0.18_75)] font-medium">
      payment and billing systems
    </span>
    ,{" "}
    <span className="text-[oklch(0.78_0.18_75)] font-medium">
      high-concurrency architectures
    </span>
    , and{" "}
    <span className="text-[oklch(0.78_0.18_75)] font-medium">
      real-time communication platforms
    </span>
    .
  </>,
  <>
    Currently, I&apos;m focused on building enterprise-grade billing systems at{" "}
    <span className="text-[oklch(0.78_0.18_75)] font-medium">ONDO LLC</span>,
    where I architect solutions that handle complex payment workflows and
    transaction processing at scale.
  </>,
  <>
    I&apos;ve worked across diverse domains &mdash; from{" "}
    <span className="text-[oklch(0.92_0.01_80)] font-medium">
      telecommunications
    </span>{" "}
    at Unitel Group building VOIP and SIP/RTC systems, to creating{" "}
    <span className="text-[oklch(0.92_0.01_80)] font-medium">
      crowdfunding platforms
    </span>{" "}
    and{" "}
    <span className="text-[oklch(0.92_0.01_80)] font-medium">
      CMMS for mining operations
    </span>
    .
  </>,
  <>
    I hold a{" "}
    <span className="text-[oklch(0.92_0.01_80)] font-medium">
      Bachelor&apos;s in Computer Science
    </span>{" "}
    from the National University of Mongolia, where I also served as an
    instructor.
  </>,
]

export function AboutPanel() {
  const progress = useScrollStore((s) => s.progress)
  const sectionProgress = getSectionProgress(progress, "about")

  const opacity =
    sectionProgress < 0.1
      ? sectionProgress * 10
      : sectionProgress > 0.85
        ? (1 - sectionProgress) * 6.67
        : 1

  return (
    <Html
      position={[1, 3, 2]}
      center
      distanceFactor={8}
      style={{
        opacity: Math.max(0, Math.min(1, opacity)),
        transition: "opacity 0.3s",
        pointerEvents: opacity < 0.1 ? "none" : "auto",
      }}
    >
      <div className="blueprint-panel corner-tr w-[500px] select-none">
        <div className="section-header">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_75)]">
            About
          </h2>
        </div>

        <div className="space-y-4">
          {paragraphs.map((p, i) => {
            const lineProgress = Math.max(
              0,
              Math.min(1, (sectionProgress - i * 0.12) * 5)
            )
            return (
              <div
                key={i}
                className="relative"
                style={{
                  opacity: lineProgress,
                  transform: `translateX(${(1 - lineProgress) * 30}px)`,
                  transition: "opacity 0.5s, transform 0.5s",
                }}
              >
                {/* Line number indicator */}
                <span className="absolute -left-4 top-0 text-[10px] font-mono text-[oklch(0.78_0.18_75/0.3)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-relaxed text-[oklch(0.55_0.02_80)] pl-2 border-l border-[oklch(0.78_0.18_75/0.15)]">
                  {p}
                </p>
              </div>
            )
          })}
        </div>

        {/* Decorative footer line */}
        <div className="mt-4 pt-3 border-t border-[oklch(0.78_0.18_75/0.1)] flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.78_0.18_75/0.4)]" />
          <span className="text-[9px] font-mono text-[oklch(0.55_0.02_80/0.4)] uppercase">
            Ulaanbaatar, Mongolia
          </span>
        </div>
      </div>
    </Html>
  )
}
