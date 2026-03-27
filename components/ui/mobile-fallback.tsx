"use client"

import { personalInfo, experiences, projects, skillCategories, contactLinks } from "@/lib/data"
import { Github, Linkedin, Mail, ExternalLink, MapPin, Send } from "lucide-react"

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  GitHub: Github,
  LinkedIn: Linkedin,
  Email: Mail,
  Website: ExternalLink,
}

export function MobileFallback() {
  return (
    <div className="min-h-screen bg-[oklch(0.06_0.02_260)] text-[oklch(0.92_0.01_80)] px-6 py-12 overflow-auto">
      {/* Hero */}
      <header className="mb-16 stagger-children">
        <h1 className="text-3xl font-bold">
          {personalInfo.name.first}{" "}
          <span className="text-[oklch(0.78_0.18_75)]">{personalInfo.name.last}</span>
        </h1>
        <p className="mt-2 text-sm text-[oklch(0.78_0.18_75)] font-medium">
          {personalInfo.titles[0]}
        </p>
        <p className="mt-3 text-sm text-[oklch(0.55_0.02_80)] leading-relaxed">
          {personalInfo.tagline}
        </p>
        <div className="mt-5 flex gap-3">
          {personalInfo.stats.map((stat) => (
            <div key={stat.label} className="p-3 rounded-lg border border-[oklch(0.78_0.18_75/0.15)] bg-[oklch(0.08_0.02_260)]">
              <div className="text-lg font-bold text-[oklch(0.78_0.18_75)]">{stat.value}</div>
              <div className="text-[10px] text-[oklch(0.55_0.02_80)] uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-4">
          {personalInfo.socials.map(({ href, label }) => {
            const Icon = socialIcons[label] || ExternalLink
            return (
              <a key={label} href={href} target={href.startsWith("mailto") ? undefined : "_blank"} rel={href.startsWith("mailto") ? undefined : "noopener noreferrer"} className="text-[oklch(0.55_0.02_80)] hover:text-[oklch(0.78_0.18_75)]" aria-label={label}>
                <Icon className="h-5 w-5" />
              </a>
            )
          })}
        </div>
      </header>

      {/* About */}
      <section className="mb-16">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_75)] mb-4">About</h2>
        <div className="space-y-3 text-sm text-[oklch(0.55_0.02_80)] leading-relaxed">
          <p>
            I&apos;m a software engineer with <span className="text-[oklch(0.92_0.01_80)] font-medium">4+ years of experience</span> building robust backend systems and scalable applications. My expertise lies in designing <span className="text-[oklch(0.78_0.18_75)] font-medium">payment and billing systems</span>, <span className="text-[oklch(0.78_0.18_75)] font-medium">high-concurrency architectures</span>, and <span className="text-[oklch(0.78_0.18_75)] font-medium">real-time communication platforms</span>.
          </p>
          <p>
            Currently, I&apos;m focused on building enterprise-grade billing systems at <span className="text-[oklch(0.78_0.18_75)] font-medium">ONDO LLC</span>, where I architect solutions that handle complex payment workflows and transaction processing at scale.
          </p>
          <p>
            I&apos;ve worked across diverse domains &mdash; from <span className="text-[oklch(0.92_0.01_80)] font-medium">telecommunications</span> at Unitel Group, to <span className="text-[oklch(0.92_0.01_80)] font-medium">crowdfunding platforms</span> and <span className="text-[oklch(0.92_0.01_80)] font-medium">CMMS for mining operations</span>.
          </p>
          <p>
            I hold a <span className="text-[oklch(0.92_0.01_80)] font-medium">Bachelor&apos;s in Computer Science</span> from the National University of Mongolia, where I also served as an instructor.
          </p>
        </div>
      </section>

      {/* Experience */}
      <section className="mb-16">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_75)] mb-4">Experience</h2>
        <div className="space-y-6">
          {experiences.map((exp, i) => (
            <div key={i} className="p-4 rounded-lg border border-[oklch(0.78_0.18_75/0.08)] bg-[oklch(0.08_0.02_260/0.5)]">
              <p className="text-[10px] font-mono text-[oklch(0.55_0.02_80)]">{exp.period}</p>
              <h3 className="text-sm font-medium mt-1">{exp.title} <span className="text-[oklch(0.78_0.18_75)]">@ {exp.company}</span></h3>
              <p className="text-xs text-[oklch(0.55_0.02_80)] mt-2 leading-relaxed">{exp.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {exp.technologies.map((t) => <span key={t} className="tech-tag">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section className="mb-16">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_75)] mb-4">Projects</h2>
        <div className="space-y-4">
          {projects.map((p, i) => (
            <div key={i} className="p-4 rounded-lg border border-[oklch(0.78_0.18_75/0.08)] bg-[oklch(0.08_0.02_260/0.5)]">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">{p.title}</h3>
                {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[oklch(0.78_0.18_75)]"><ExternalLink className="h-3.5 w-3.5" /></a>}
              </div>
              <p className="text-xs text-[oklch(0.55_0.02_80)] mt-2 leading-relaxed">{p.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.technologies.map((t) => <span key={t} className="tech-tag">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills */}
      <section className="mb-16">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_75)] mb-4">Skills</h2>
        <div className="grid grid-cols-2 gap-3">
          {skillCategories.map((cat) => (
            <div key={cat.title} className="p-3 rounded-lg border border-[oklch(0.78_0.18_75/0.06)] bg-[oklch(0.08_0.02_260/0.3)]">
              <h3 className="text-xs font-semibold text-[oklch(0.78_0.18_75)] mb-2">{cat.title}</h3>
              <div className="flex flex-wrap gap-1">
                {cat.skills.map((s) => (
                  <span key={s} className="inline-block rounded-full bg-[oklch(0.78_0.18_75/0.08)] px-2 py-0.5 text-[10px] text-[oklch(0.55_0.02_80)]">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_75)] mb-4">Contact</h2>
        <div className="space-y-3">
          {contactLinks.map(({ href, label }) => (
            <a key={href} href={href} target={href.startsWith("mailto") ? undefined : "_blank"} rel={href.startsWith("mailto") ? undefined : "noopener noreferrer"} className="flex items-center gap-3 text-sm text-[oklch(0.92_0.01_80)] hover:text-[oklch(0.78_0.18_75)] transition-colors">
              <span className="font-mono text-xs">{label}</span>
              <Send className="h-3 w-3 ml-auto opacity-50" />
            </a>
          ))}
          <div className="flex items-center gap-3 text-[oklch(0.55_0.02_80)] text-sm">
            <MapPin className="h-4 w-4" />
            <span className="font-mono text-xs">{personalInfo.location}</span>
          </div>
        </div>
        <a href={`mailto:${personalInfo.email}`} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[oklch(0.78_0.18_75)] text-[oklch(0.06_0.02_260)] font-medium text-sm">
          <Mail className="h-4 w-4" />
          Get in Touch
        </a>
      </section>

      <footer className="pt-6 border-t border-[oklch(0.78_0.18_75/0.1)]">
        <p className="text-[10px] text-[oklch(0.55_0.02_80/0.5)] font-mono">&copy; {new Date().getFullYear()} Enkhbold Nyamdorj</p>
      </footer>
    </div>
  )
}
