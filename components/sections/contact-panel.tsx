import { Html } from "@react-three/drei"
import { useScrollStore, getSectionProgress } from "@/hooks/use-scroll-store"
import { contactLinks, personalInfo } from "@/lib/data"
import { Mail, Linkedin, Github, MapPin, Send, Terminal } from "lucide-react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  linkedin: Linkedin,
  github: Github,
}

export function ContactPanel() {
  const progress = useScrollStore((s) => s.progress)
  const sectionProgress = getSectionProgress(progress, "contact")

  const opacity =
    sectionProgress < 0.1
      ? sectionProgress * 10
      : 1

  return (
    <Html
      position={[0, -21, 0.5]}
      center
      distanceFactor={7}
      style={{
        opacity: Math.max(0, Math.min(1, opacity)),
        transition: "opacity 0.3s",
        pointerEvents: opacity < 0.1 ? "none" : "auto",
      }}
    >
      <div className="crt-terminal w-[460px] select-none">
        {/* Terminal chrome */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[oklch(0.78_0.18_75/0.15)]">
          <div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.78_0.18_75)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.78_0.18_75/0.5)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.78_0.18_75/0.2)]" />
          <div className="ml-auto flex items-center gap-1.5">
            <Terminal className="h-3 w-3 text-[oklch(0.55_0.02_80/0.5)]" />
            <span className="text-[10px] text-[oklch(0.55_0.02_80)] font-mono">
              contact@encold.guru
            </span>
          </div>
        </div>

        {/* Terminal prompt */}
        <div className="text-[10px] font-mono text-[oklch(0.78_0.18_75/0.5)] mb-3">
          <span className="text-[oklch(0.78_0.18_75)]">$</span> cat ./reach-out.md
        </div>

        <p className="text-xs text-[oklch(0.55_0.02_80)] leading-relaxed mb-5 border-l-2 border-[oklch(0.78_0.18_75/0.15)] pl-3">
          I&apos;m always interested in hearing about new opportunities,
          challenging projects, or just connecting with fellow engineers.
          Feel free to reach out!
        </p>

        {/* Links with terminal-style prefix */}
        <div className="space-y-2.5">
          {contactLinks.map(({ href, label, type }) => {
            const Icon = iconMap[type] || Mail
            return (
              <a
                key={href}
                href={href}
                target={href.startsWith("mailto") ? undefined : "_blank"}
                rel={
                  href.startsWith("mailto")
                    ? undefined
                    : "noopener noreferrer"
                }
                className="flex items-center gap-3 text-[oklch(0.92_0.01_80)] hover:text-[oklch(0.78_0.18_75)] transition-all duration-300 group text-sm"
              >
                <span className="text-[10px] font-mono text-[oklch(0.78_0.18_75/0.4)]">{">"}</span>
                <Icon className="h-4 w-4 text-[oklch(0.55_0.02_80)] group-hover:text-[oklch(0.78_0.18_75)] transition-colors" />
                <span className="group-hover:translate-x-1 transition-transform duration-300 font-mono text-xs">
                  {label}
                </span>
                <Send className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-[oklch(0.78_0.18_75)]" />
              </a>
            )
          })}

          <div className="flex items-center gap-3 text-[oklch(0.55_0.02_80)] text-sm">
            <span className="text-[10px] font-mono text-[oklch(0.78_0.18_75/0.4)]">{">"}</span>
            <MapPin className="h-4 w-4" />
            <span className="font-mono text-xs">{personalInfo.location}</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[oklch(0.78_0.18_75/0.1)]">
          <a
            href={`mailto:${personalInfo.email}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[oklch(0.78_0.18_75)] text-[oklch(0.06_0.02_260)] font-medium text-sm hover:bg-[oklch(0.85_0.18_75)] transition-colors"
          >
            <Mail className="h-4 w-4" />
            Get in Touch
          </a>
        </div>

        {/* Terminal footer */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[10px] font-mono text-[oklch(0.78_0.18_75/0.3)]">
            &copy; {new Date().getFullYear()} Enkhbold Nyamdorj
          </span>
          <span className="text-[10px] font-mono text-[oklch(0.78_0.18_75/0.2)]">|</span>
          <span className="text-[10px] font-mono text-[oklch(0.78_0.18_75/0.2)]">
            encold.guru
          </span>
        </div>
      </div>
    </Html>
  )
}
