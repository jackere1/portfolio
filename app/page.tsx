import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import { ExperienceSection } from "@/components/experience-section"
import { ProjectsSection } from "@/components/projects-section"
import { SkillsSection } from "@/components/skills-section"
import { ContactSection } from "@/components/contact-section"
import { Navigation } from "@/components/navigation"
import { Scene3D } from "@/components/scene-3d"
import { ScrollProgress } from "@/components/scroll-progress"
import { MouseFollower } from "@/components/mouse-follower"
import { ParticleField } from "@/components/particle-field"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background noise-overlay relative">
      {/* 3D Background Scene */}
      <div className="fixed inset-0 z-0">
        <Scene3D />
      </div>

      {/* Particle field overlay */}
      <ParticleField />

      {/* Mouse follower effect */}
      <MouseFollower />

      {/* Scroll progress indicator */}
      <ScrollProgress />

      <Navigation />

      <main className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
        <div className="lg:flex lg:gap-12">
          {/* Left sticky sidebar on desktop */}
          <aside className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-1/2 lg:flex-col lg:justify-between lg:py-24">
            <HeroSection />
          </aside>

          {/* Right scrollable content */}
          <div className="lg:w-1/2 lg:py-24">
            <AboutSection />
            <ExperienceSection />
            <ProjectsSection />
            <SkillsSection />
            <ContactSection />
          </div>
        </div>
      </main>
    </div>
  )
}
