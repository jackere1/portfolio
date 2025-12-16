"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
]

export function Navigation() {
  const [activeSection, setActiveSection] = useState("")
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: "-50% 0px -50% 0px" },
    )

    navItems.forEach(({ href }) => {
      const element = document.querySelector(href)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <nav className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-50">
      <ul className="flex flex-col gap-4">
        {navItems.map(({ label, href }, index) => {
          const isActive = activeSection === href.slice(1)
          const isHovered = hoveredItem === href

          return (
            <li key={href} style={{ animationDelay: `${index * 0.1}s` }} className="reveal-up">
              <a
                href={href}
                onMouseEnter={() => setHoveredItem(href)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  "flex items-center gap-3 text-sm transition-all duration-500 group relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* Animated line */}
                <span className="relative h-[2px] overflow-hidden">
                  <span
                    className={cn(
                      "block h-full transition-all duration-500 ease-out",
                      isActive ? "w-16 bg-primary" : isHovered ? "w-16 bg-foreground" : "w-8 bg-muted-foreground",
                    )}
                  />
                  {/* Glow effect */}
                  {isActive && <span className="absolute inset-0 bg-primary blur-sm animate-pulse" />}
                </span>

                {/* Label with slide effect */}
                <span
                  className={cn(
                    "uppercase tracking-widest text-xs font-medium transition-all duration-300",
                    isHovered || isActive ? "translate-x-1" : "translate-x-0",
                  )}
                >
                  {label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary pulse-ring" />
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
