"use client"

import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

const skillCategories = [
  {
    title: "Backend & Systems",
    skills: ["Go", "Node.js", "Python", "PostgreSQL", "Redis", "gRPC", "REST APIs", "GraphQL"],
    icon: "⚡",
  },
  {
    title: "Frontend & Mobile",
    skills: ["React", "Next.js", "TypeScript", "React Native", "Tailwind CSS"],
    icon: "🎨",
  },
  {
    title: "DevOps & Infrastructure",
    skills: ["Docker", "Kubernetes", "CI/CD", "AWS", "Linux", "Nginx"],
    icon: "🚀",
  },
  {
    title: "Specialized",
    skills: ["Payment Systems", "WebRTC", "SIP Protocol", "High Concurrency", "System Design", "AI/LLM"],
    icon: "🔧",
  },
]

function SkillCategory({ category, index }: { category: (typeof skillCategories)[0]; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.2 })

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 group",
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
      )}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <div className="gradient-border p-5 rounded-xl hover:scale-[1.02] transition-transform duration-300">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="text-lg">{category.icon}</span>
          {category.title}
        </h3>
        <ul className="flex flex-wrap gap-2">
          {category.skills.map((skill, skillIndex) => (
            <li
              key={skill}
              className={cn(
                "transition-all duration-300",
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              )}
              style={{ transitionDelay: `${index * 150 + skillIndex * 50}ms` }}
            >
              <span className="inline-flex items-center rounded-full bg-secondary/80 px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:scale-110 hover:shadow-lg hover:shadow-primary/20 cursor-default">
                {skill}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function SkillsSection() {
  return (
    <section id="skills" className="mb-16 scroll-mt-24 lg:mb-24">
      <div className="sticky top-0 z-20 -mx-6 mb-4 bg-background/80 px-6 py-5 backdrop-blur lg:sr-only lg:relative lg:top-auto lg:mx-0 lg:w-full lg:px-0 lg:py-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground lg:sr-only">Skills</h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {skillCategories.map((category, index) => (
          <SkillCategory key={category.title} category={category} index={index} />
        ))}
      </div>
    </section>
  )
}
