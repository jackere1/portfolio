"use client"

import { ExternalLink } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

const projects = [
  {
    title: "Tuslay.mn",
    description: "Platform focused on workflow automation and operational tooling.",
    technologies: ["Next.js", "Python", "PostgreSQL"],
    link: "https://tuslay.mn",
  },
  {
    title: "ONDO Billing System",
    description:
      "Enterprise-grade billing and payment processing system handling high-volume transactions with real-time reconciliation, multiple payment gateway integrations, and comprehensive reporting.",
    technologies: ["Go", "PostgreSQL", "Redis", "gRPC", "Kubernetes"],
    link: null,
  },
  {
    title: "TOKI - RTC Platform",
    description:
      "Real-time communication platform with VOIP capabilities, SIP protocol integration, and WebRTC-based audio/video calling. Handles thousands of concurrent connections with low latency.",
    technologies: ["WebRTC", "SIP", "Node.js", "React Native", "Redis"],
    link: null,
  },
  {
    title: "IkhGobiEnergy CMMS",
    description:
      "Computerized Maintenance Management System for mining operations. Tracks equipment lifecycle, preventive maintenance scheduling, work orders, and inventory management.",
    technologies: ["React", "Node.js", "PostgreSQL", "Redis", "Docker"],
    link: null,
  },
  {
    title: "ProFund.mn",
    description:
      "Crowdfunding platform connecting entrepreneurs with investors. Features secure payment processing, project management tools, and real-time funding progress tracking.",
    technologies: ["Next.js", "TypeScript", "PostgreSQL", "Stripe"],
    link: "https://profund.mn",
  },
]

function ProjectCard({ project, index }: { project: (typeof projects)[0]; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.2 })

  return (
    <li ref={ref} className="mb-12" style={{ transitionDelay: `${index * 100}ms` }}>
      <div
        className={cn(
          "group relative grid gap-4 pb-1 transition-all duration-700",
          "lg:hover:!opacity-100 lg:group-hover/list:opacity-50 perspective-card",
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12",
        )}
      >
        <div className="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition-all duration-500 motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-card/80 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:backdrop-blur-sm" />

        {/* Glow effect on hover */}
        <div className="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md lg:-inset-x-6 lg:block opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-xl" />
        </div>

        <div className="z-10 perspective-card-inner">
          <h3>
            <a
              href={project.link || "#"}
              target={project.link ? "_blank" : undefined}
              rel={project.link ? "noopener noreferrer" : undefined}
              className="inline-flex items-baseline font-medium leading-tight text-foreground hover:text-primary focus-visible:text-primary group/link transition-colors duration-300"
            >
              <span className="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block" />
              <span>
                {project.title}
                {project.link && (
                  <ExternalLink className="inline-block h-4 w-4 shrink-0 transition-transform duration-300 group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1" />
                )}
              </span>
            </a>
          </h3>

          <p className="mt-2 text-sm leading-normal text-muted-foreground">{project.description}</p>

          <ul className="mt-2 flex flex-wrap" aria-label="Technologies used">
            {project.technologies.map((tech, techIndex) => (
              <li key={tech} className="mr-1.5 mt-2" style={{ animationDelay: `${techIndex * 50}ms` }}>
                <div className="flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium leading-5 text-primary transition-all duration-300 hover:bg-primary/20 hover:scale-105">
                  {tech}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  )
}

export function ProjectsSection() {
  return (
    <section id="projects" className="mb-16 scroll-mt-24 lg:mb-24">
      <div className="sticky top-0 z-20 -mx-6 mb-4 bg-background/80 px-6 py-5 backdrop-blur lg:sr-only lg:relative lg:top-auto lg:mx-0 lg:w-full lg:px-0 lg:py-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground lg:sr-only">Projects</h2>
      </div>

      <div>
        <ul className="group/list">
          {projects.map((project, index) => (
            <ProjectCard key={index} project={project} index={index} />
          ))}
        </ul>
      </div>
    </section>
  )
}
