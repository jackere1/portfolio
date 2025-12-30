"use client"

import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

export function AboutSection() {
  const { ref, isInView } = useInView({ threshold: 0.2 })

  return (
    <section id="about" className="mb-16 scroll-mt-24 lg:mb-24" ref={ref}>
      <div className="sticky top-0 z-20 -mx-6 mb-4 bg-background/80 px-6 py-5 backdrop-blur lg:sr-only lg:relative lg:top-auto lg:mx-0 lg:w-full lg:px-0 lg:py-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground lg:sr-only">About</h2>
      </div>

      <div
        className={cn(
          "space-y-4 text-muted-foreground leading-relaxed transition-all duration-700",
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
        <p className="tilt-hover p-4 -m-4 rounded-lg transition-all duration-300 hover:bg-card/50">
          I'm a software engineer with{" "}
          <span className="text-foreground font-medium relative group">
            4+ years of experience
            <span className="absolute bottom-0 left-0 w-full h-[1px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          </span>{" "}
          building robust backend systems and scalable applications. My expertise lies in designing{" "}
          <span className="text-primary font-medium">payment and billing systems</span>,{" "}
          <span className="text-primary font-medium">high-concurrency architectures</span>, and{" "}
          <span className="text-primary font-medium">real-time communication platforms</span>.
        </p>

        <p className="tilt-hover p-4 -m-4 rounded-lg transition-all duration-300 hover:bg-card/50">
          Currently, I'm focused on building enterprise-grade billing systems at{" "}
          <a href="#" className="text-primary hover:underline font-medium inline-flex items-center gap-1 group">
            ONDO LLC
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">-&gt;</span>
          </a>
          , where I architect solutions that handle complex payment workflows and transaction processing at scale.
        </p>

        <p className="tilt-hover p-4 -m-4 rounded-lg transition-all duration-300 hover:bg-card/50">
          In the past, I've had the opportunity to work across diverse domains - from{" "}
          <span className="text-foreground font-medium">telecommunications</span> at Unitel Group building VOIP and
          SIP/RTC communication systems, to creating{" "}
          <span className="text-foreground font-medium">crowdfunding platforms</span> and{" "}
          <span className="text-foreground font-medium">automation solutions</span>. I also contributed to CMMS
          development for <span className="text-foreground font-medium">IkhGobiEnergy LLC</span>, a major local mining
          corporation.
        </p>

        <p className="tilt-hover p-4 -m-4 rounded-lg transition-all duration-300 hover:bg-card/50">
          I hold a <span className="text-foreground font-medium">Bachelor's in Computer Science</span> from the National
          University of Mongolia, where I also served as an instructor teaching software engineering principles.
        </p>
      </div>
    </section>
  )
}
