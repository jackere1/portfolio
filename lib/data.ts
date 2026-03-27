export const personalInfo = {
  name: { first: "Enkhbold", last: "Nyamdorj" },
  titles: [
    "Software Engineer",
    "Backend Architect",
    "Payment Systems Expert",
    "Telecom Developer",
  ],
  tagline:
    "I build robust, scalable backend systems and payment architectures that handle millions of transactions with precision.",
  stats: [
    { value: "4+", label: "Years Exp" },
    { value: "20+", label: "Projects" },
    { value: "5+", label: "Industries" },
  ],
  location: "Ulaanbaatar, Mongolia",
  email: "enkhbold@tuslay.mn",
  socials: [
    { href: "https://github.com/jackere1", label: "GitHub" },
    {
      href: "https://linkedin.com/in/enkhbold-nyamdorj",
      label: "LinkedIn",
    },
    { href: "mailto:enkhbold@tuslay.mn", label: "Email" },
    { href: "https://encold.guru", label: "Website" },
  ],
}

export const aboutParagraphs = [
  'I\'m a software engineer with <highlight>4+ years of experience</highlight> building robust backend systems and scalable applications. My expertise lies in designing <accent>payment and billing systems</accent>, <accent>high-concurrency architectures</accent>, and <accent>real-time communication platforms</accent>.',
  'Currently, I\'m focused on building enterprise-grade billing systems at <link href="#">ONDO LLC</link>, where I architect solutions that handle complex payment workflows and transaction processing at scale.',
  'In the past, I\'ve had the opportunity to work across diverse domains - from <highlight>telecommunications</highlight> at Unitel Group building VOIP and SIP/RTC communication systems, to creating <highlight>crowdfunding platforms</highlight> and <highlight>automation solutions</highlight>. I also contributed to CMMS development for <highlight>IkhGobiEnergy LLC</highlight>, a major local mining corporation.',
  'I hold a <highlight>Bachelor\'s in Computer Science</highlight> from the National University of Mongolia, where I also served as an instructor teaching software engineering principles.',
]

export interface Experience {
  period: string
  title: string
  company: string
  description: string
  technologies: string[]
  link: string | null
}

export const experiences: Experience[] = [
  {
    period: "Jan 2025 - Present",
    title: "Software Engineer",
    company: "ONDO LLC",
    description:
      "Analyzed payment system bottlenecks, addressed single points of failure, and built third-party integration pathways for ONDO services.",
    technologies: ["Go", "PostgreSQL", "Redis", "Nginx"],
    link: null,
  },
  {
    period: "Mar 2024 - Jan 2025",
    title: "Backend Developer",
    company: "Unitel Group",
    description:
      "Migrated TOKI from monolith to microservices, delivered UMoney and XYP/DAN integrations, and shipped APIs and SDKs for mini-app and recommendation systems. Built SIP proxy connectivity for RTC services.",
    technologies: ["Node.js", "Redis", "Kafka", "SIP", "WebRTC"],
    link: null,
  },
  {
    period: "Feb 2024 - Jun 2024",
    title: "Lab Instructor",
    company: "National University of Mongolia",
    description:
      "Led lab sessions for Object-Oriented Programming and Internet Technologies courses.",
    technologies: ["OOP", "Web Fundamentals"],
    link: null,
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
    link: null,
  },
  {
    period: "May 2022 - Aug 2022",
    title: "Full Stack Developer",
    company: "ONDO LLC",
    description:
      "Built admin tooling for number auctions and monitoring stalled auction flows.",
    technologies: ["Node.js", "PostgreSQL", "JavaScript"],
    link: null,
  },
  {
    period: "2023",
    title: "Intern",
    company: "Nomadic Software Solutions",
    description:
      "Delivered the MVP for the Hoome payment loyalty system.",
    technologies: ["Payment Systems", "JavaScript"],
    link: null,
  },
  {
    period: "2022",
    title: "Intern",
    company: "AND Solutions LLC",
    description:
      "Built the admin panel for the ONDO auction platform.",
    technologies: ["JavaScript", "PostgreSQL"],
    link: null,
  },
]

export interface Project {
  title: string
  description: string
  technologies: string[]
  link: string | null
}

export const projects: Project[] = [
  {
    title: "Tuslay.mn",
    description:
      "Platform focused on workflow automation and operational tooling.",
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
    technologies: ["WebRTC", "SIP", "Kamailio", "FreeSWITCH", "Redis"],
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

export interface SkillCategory {
  title: string
  skills: string[]
}

export const skillCategories: SkillCategory[] = [
  {
    title: "Web",
    skills: [
      "React (Vite)",
      "Next.js",
      "Angular",
      "A-Frame",
      "Three.js",
      "JavaScript",
      "TypeScript",
    ],
  },
  {
    title: "Backend",
    skills: [
      "Node.js",
      "NestJS",
      "Fastify",
      "Express",
      "Go (Gin)",
      "PHP (Symfony)",
    ],
  },
  {
    title: "Data & Storage",
    skills: ["PostgreSQL", "MongoDB", "DynamoDB", "S3", "SQL"],
  },
  {
    title: "Infra & DevOps",
    skills: [
      "Nginx",
      "Redis",
      "Kafka",
      "GitHub Actions",
      "GitLab CI/CD",
      "Nx Monorepo",
      "Docker Registry",
    ],
  },
  {
    title: "Cloud & Observability",
    skills: [
      "AWS Lambda",
      "API Gateway",
      "CloudFront",
      "DigitalOcean Droplets",
      "Spaces",
      "Prometheus",
      "Grafana",
      "Loki",
      "OpenTelemetry",
      "Jaeger",
    ],
  },
  {
    title: "Specialized",
    skills: ["Payment Systems", "RTC", "AR/VR", "AI/ML", "System Design"],
  },
]

export const contactLinks = [
  { href: "mailto:enkhbold@tuslay.mn", label: "enkhbold@tuslay.mn", type: "email" as const },
  {
    href: "https://linkedin.com/in/enkhbold-nyamdorj",
    label: "linkedin.com/in/enkhbold-nyamdorj",
    type: "linkedin" as const,
  },
  {
    href: "https://github.com/jackere1",
    label: "github.com/jackere1",
    type: "github" as const,
  },
]
