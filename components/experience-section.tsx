"use client"

import { ExternalLink } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

const experiences = [
  {
    period: "Jan 2025 - Present",
    title: "Software Engineer",
    company: "ONDO LLC",
    description:
      "Analyzed payment system bottlenecks, addressed single points of failure, and built third-party integration pathways for ONDO services.",
    technologies: ["Go", "PostgreSQL", "Redis", "Nginx"],
    link: "#",
  },
  {
    period: "Mar 2024 - Jan 2025",
    title: "Backend Developer",
    company: "Unitel Group",
    description:
      "Migrated TOKI from monolith to microservices, delivered UMoney and XYP/DAN integrations, and shipped APIs and SDKs for mini-app and recommendation systems. Built SIP proxy connectivity for RTC services.",
    technologies: ["Node.js", "Redis", "Kafka", "SIP", "WebRTC"],
    link: "#",
  },
  {
    period: "Feb 2024 - Jun 2024",
    title: "Lab Instructor",
    company: "National University of Mongolia",
    description: "Led lab sessions for Object-Oriented Programming and Internet Technologies courses.",
    technologies: ["OOP", "Web Fundamentals"],
    link: "#",
  },
  {
    period: "Oct 2023 - Feb 2024",
    title: "Full Stack Developer",
    company: "Chinggis Systems LLC",
    description:
      "Built the ProFund investor module using an Nx monorepo and AWS Serverless Framework.",
    technologies: ["Nx", "AWS Lambda", "API Gateway"],
    link: "https://profund.mn",
  },
  {
    period: "May 2023 - Sep 2023",
    title: "Full Stack Developer",
    company: "Mogul Group",
    description:
      "Developed an image processing service and parking gate recognition software with Angular and Spring Boot.",
    technologies: ["Angular", "Spring Boot", "Image Processing"],
    link: "#",
  },
  {
    period: "May 2022 - Aug 2022",
    title: "Full Stack Developer",
    company: "ONDO LLC",
    description: "Built admin tooling for number auctions and monitoring stalled auction flows.",
    technologies: ["Node.js", "PostgreSQL", "JavaScript"],
    link: "#",
  },
  {
    period: "2023",
    title: "Intern",
    company: "Nomadic Software Solutions",
    description: "Delivered the MVP for the Hoome payment loyalty system.",
    technologies: ["Payment Systems", "JavaScript"],
    link: "#",
  },
  {
    period: "2022",
    title: "Intern",
    company: "AND Solutions LLC",
    description: "Built the admin panel for the ONDO auction platform.",
    technologies: ["JavaScript", "PostgreSQL"],
    link: "#",
  },
]

function ExperienceCard({ exp, index }: { exp: (typeof experiences)[0]; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.2 })
  const hasLink = exp.link && exp.link !== "#"

  return (
    <li ref={ref} className="mb-12" style={{ transitionDelay: `${index * 100}ms` }}>
      <div
        className={cn(
          "group relative grid pb-1 transition-all duration-700 sm:grid-cols-8 sm:gap-8 md:gap-4",
          "lg:hover:!opacity-100 lg:group-hover/list:opacity-50",
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12",
        )}
      >
        {/* Animated background */}
        <div className="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition-all duration-500 motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-card/80 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:backdrop-blur-sm" />

        {/* Gradient border on hover */}
        <div className="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md lg:-inset-x-6 lg:block opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/20 via-transparent to-primary/20 blur-xl" />
        </div>

        <header className="z-10 mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:col-span-2">
          <span className="font-mono">{exp.period}</span>
        </header>

        <div className="z-10 sm:col-span-6">
          <h3 className="font-medium leading-snug text-foreground">
            <div>
              <a
                href={exp.link}
                target={hasLink ? "_blank" : undefined}
                rel={hasLink ? "noopener noreferrer" : undefined}
                className="inline-flex items-baseline font-medium leading-tight text-foreground hover:text-primary focus-visible:text-primary group/link transition-colors duration-300"
              >
                <span className="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block" />
                <span>
                  {exp.title} at{" "}
                  <span className="inline-block">
                    {exp.company}
                    {hasLink && (
                      <ExternalLink className="inline-block h-4 w-4 shrink-0 transition-transform duration-300 group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1" />
                    )}
                  </span>
                </span>
              </a>
            </div>
          </h3>

          <p className="mt-2 text-sm leading-normal text-muted-foreground">{exp.description}</p>

          <ul className="mt-2 flex flex-wrap" aria-label="Technologies used">
            {exp.technologies.map((tech, techIndex) => (
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

export function ExperienceSection() {
  return (
    <section id="experience" className="mb-16 scroll-mt-24 lg:mb-24">
      <div className="sticky top-0 z-20 -mx-6 mb-4 bg-background/80 px-6 py-5 backdrop-blur lg:sr-only lg:relative lg:top-auto lg:mx-0 lg:w-full lg:px-0 lg:py-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground lg:sr-only">Experience</h2>
      </div>

      <div>
        <ol className="group/list">
          {experiences.map((exp, index) => (
            <ExperienceCard key={index} exp={exp} index={index} />
          ))}
        </ol>
      </div>
    </section>
  )
}
