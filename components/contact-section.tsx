"use client"

import { Mail, Linkedin, Github, MapPin, Send } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

export function ContactSection() {
  const { ref, isInView } = useInView({ threshold: 0.2 })

  return (
    <section id="contact" className="mb-16 scroll-mt-24 lg:mb-24" ref={ref}>
      <div className="sticky top-0 z-20 -mx-6 mb-4 bg-background/80 px-6 py-5 backdrop-blur lg:sr-only lg:relative lg:top-auto lg:mx-0 lg:w-full lg:px-0 lg:py-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground lg:sr-only">Contact</h2>
      </div>

      <div
        className={cn(
          "space-y-6 transition-all duration-700",
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
        <p className="text-muted-foreground leading-relaxed">
          I'm always interested in hearing about new opportunities, challenging projects, or just connecting with fellow
          engineers. Whether you have a question or just want to say hi, feel free to reach out!
        </p>

        <div className="space-y-4 stagger-children">
          {[
            { href: "mailto:enkhbold@tuslay.mn", icon: Mail, label: "enkhbold@tuslay.mn" },
            {
              href: "https://linkedin.com/in/enkhbold-nyamdorj",
              icon: Linkedin,
              label: "linkedin.com/in/enkhbold-nyamdorj",
            },
            { href: "https://github.com/jackere1", icon: Github, label: "github.com/jackere1" },
          ].map(({ href, icon: Icon, label }) => (
            <a
              key={href}
              href={href}
              target={href.startsWith("mailto") ? undefined : "_blank"}
              rel={href.startsWith("mailto") ? undefined : "noopener noreferrer"}
              className="flex items-center gap-3 text-foreground hover:text-primary transition-all duration-300 group p-3 -m-3 rounded-lg hover:bg-card/50"
            >
              <span className="relative">
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all duration-300 group-hover:scale-110" />
                <span className="absolute inset-0 bg-primary/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-300 opacity-0 group-hover:opacity-100" />
              </span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">{label}</span>
              <Send className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ml-auto" />
            </a>
          ))}

          <div className="flex items-center gap-3 text-muted-foreground p-3 -m-3">
            <MapPin className="h-5 w-5" />
            <span>Ulaanbaatar, Mongolia</span>
          </div>
        </div>

        <div className="pt-6">
          <a
            href="mailto:enkhbold@tuslay.mn"
            className="group relative inline-flex items-center gap-2 px-6 py-3 font-medium text-primary-foreground overflow-hidden rounded-lg"
          >
            <span className="absolute inset-0 bg-primary transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Get in Touch
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </span>
          </a>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-border">
        {/* <p className="text-sm text-muted-foreground">
          Built with{" "}
          <a
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors duration-300"
          >
            Next.js
          </a>
          ,{" "}
          <a
            href="https://threejs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors duration-300"
          >
            Three.js
          </a>
          , and{" "}
          <a
            href="https://tailwindcss.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors duration-300"
          >
            Tailwind CSS
          </a>
          .
        </p> */}
        <p className="mt-2 text-md text-muted-foreground">
          © {new Date().getFullYear()} Enkhbold Nyamdorj. All rights reserved.
        </p>
      </footer>
    </section>
  )
}
