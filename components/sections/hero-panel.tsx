import { Html } from "@react-three/drei"
import { useEffect, useState } from "react"
import { useScrollStore, getSectionProgress } from "@/hooks/use-scroll-store"
import { personalInfo } from "@/lib/data"
import { Github, Linkedin, Mail, ExternalLink } from "lucide-react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  GitHub: Github,
  LinkedIn: Linkedin,
  Email: Mail,
  Website: ExternalLink,
}

function TypewriterTitle() {
  const { titles } = personalInfo
  const [titleIndex, setTitleIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentTitle = titles[titleIndex]
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (displayText.length < currentTitle.length) {
            setDisplayText(currentTitle.slice(0, displayText.length + 1))
          } else {
            setTimeout(() => setIsDeleting(true), 2000)
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText(displayText.slice(0, -1))
          } else {
            setIsDeleting(false)
            setTitleIndex((prev) => (prev + 1) % titles.length)
          }
        }
      },
      isDeleting ? 50 : 100
    )
    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, titleIndex, titles])

  return (
    <div className="mt-2 text-lg font-medium text-[oklch(0.78_0.18_75)] h-7 font-mono">
      <span className="text-[oklch(0.55_0.02_80)]">{">"} </span>
      <span>{displayText}</span>
      <span className="inline-block w-[2px] h-5 bg-[oklch(0.78_0.18_75)] ml-0.5 animate-pulse" />
    </div>
  )
}

export function HeroPanel() {
  const progress = useScrollStore((s) => s.progress)
  const sectionProgress = getSectionProgress(progress, "hero")
  const opacity = 1 - sectionProgress * 1.5

  return (
    <Html
      position={[0, 7, 3]}
      center
      distanceFactor={8}
      style={{
        opacity: Math.max(0, opacity),
        transition: "opacity 0.3s",
        pointerEvents: opacity < 0.1 ? "none" : "auto",
      }}
    >
      <div className="blueprint-panel scan-effect corner-tr w-[480px] select-none">
        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-[oklch(0.78_0.18_75)] animate-pulse" />
          <span className="text-[10px] font-mono text-[oklch(0.55_0.02_80)] uppercase tracking-wider">
            System Online
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-[oklch(0.92_0.01_80)]">
          <span>{personalInfo.name.first} </span>
          <span className="glow-text text-[oklch(0.78_0.18_75)]">
            {personalInfo.name.last}
          </span>
        </h1>

        <TypewriterTitle />

        <p className="mt-4 text-sm leading-relaxed text-[oklch(0.55_0.02_80)] max-w-md border-l-2 border-[oklch(0.78_0.18_75/0.3)] pl-3">
          {personalInfo.tagline}
        </p>

        {/* Stats */}
        <div className="mt-5 flex gap-3">
          {personalInfo.stats.map((stat) => (
            <div
              key={stat.label}
              className="gradient-border p-3 rounded-lg"
            >
              <div className="text-xl font-bold text-[oklch(0.78_0.18_75)] font-mono">
                {stat.value}
              </div>
              <div className="text-[10px] text-[oklch(0.55_0.02_80)] uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Social links */}
        <ul className="mt-5 flex items-center gap-4">
          {personalInfo.socials.map(({ href, label }) => {
            const Icon = iconMap[label] || ExternalLink
            return (
              <li key={label}>
                <a
                  href={href}
                  target={href.startsWith("mailto") ? undefined : "_blank"}
                  rel={href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                  className="block text-[oklch(0.55_0.02_80)] hover:text-[oklch(0.78_0.18_75)] transition-colors duration-300"
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </Html>
  )
}
