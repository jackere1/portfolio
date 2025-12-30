"use client"

import { Github, Linkedin, Mail, ExternalLink } from "lucide-react"
import { useEffect, useState } from "react"

const titles = ["Software Engineer", "Backend Architect", "Payment Systems Expert", "Telecom Developer"]

export function HeroSection() {
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
      isDeleting ? 50 : 100,
    )

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, titleIndex])

  return (
    <header className="pt-24 pb-12 lg:pt-0 lg:pb-0 stagger-children">
      {/* Animated name with glow effect */}
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        <span className="inline-block hover:text-primary transition-colors duration-300">Enkhbold</span>{" "}
        <span className="inline-block glow-text text-primary">Nyamdorj</span>
      </h1>

      {/* Animated typing title */}
      <h2 className="mt-3 text-lg font-medium text-primary sm:text-xl lg:text-2xl h-8">
        <span>{displayText}</span>
        <span className="inline-block w-[2px] h-6 bg-primary ml-1 animate-pulse" />
      </h2>

      {/* Description with shimmer highlight */}
      <p className="mt-4 max-w-md leading-relaxed text-muted-foreground text-base lg:text-lg">
        I build <span className="shimmer font-medium">robust, scalable backend systems</span> and{" "}
        <span className="text-foreground font-medium">payment architectures</span> that handle millions of transactions
        with precision.
      </p>

      {/* Stats cards */}
      <div className="mt-8 flex gap-4">
        <div className="gradient-border p-4 rounded-lg">
          <div className="text-2xl font-bold text-primary">4+</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Years Exp</div>
        </div>
        <div className="gradient-border p-4 rounded-lg">
          <div className="text-2xl font-bold text-primary">20+</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Projects</div>
        </div>
        <div className="gradient-border p-4 rounded-lg">
          <div className="text-2xl font-bold text-primary">5+</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Industries</div>
        </div>
      </div>

      {/* Navigation for mobile */}
      <nav className="mt-12 lg:hidden">
        <ul className="flex flex-wrap gap-4">
          {["About", "Experience", "Projects", "Skills", "Contact"].map((item) => (
            <li key={item}>
              <a
                href={`#${item.toLowerCase()}`}
                className="text-sm text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Social Links with hover effects */}
      <ul className="mt-8 flex items-center gap-5">
        {[
          { href: "https://github.com/jackere1", icon: Github, label: "GitHub" },
          { href: "https://linkedin.com/in/enkhbold-nyamdorj", icon: Linkedin, label: "LinkedIn" },
          { href: "mailto:enkhbold@tuslay.mn", icon: Mail, label: "Email" },
          { href: "https://encold.guru", icon: ExternalLink, label: "Website" },
        ].map(({ href, icon: Icon, label }) => (
          <li key={label}>
            <a
              href={href}
              target={href.startsWith("mailto") ? undefined : "_blank"}
              rel={href.startsWith("mailto") ? undefined : "noopener noreferrer"}
              className="group relative block text-muted-foreground hover:text-foreground transition-all duration-300"
              aria-label={label}
            >
              <span className="absolute -inset-2 rounded-lg bg-primary/10 scale-0 group-hover:scale-100 transition-transform duration-300" />
              <Icon className="relative h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
            </a>
          </li>
        ))}
      </ul>
    </header>
  )
}
