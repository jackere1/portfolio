import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Enkhbold Nyamdorj | Software Engineer",
  description:
    "Software Engineer specializing in payment systems, high-concurrency architecture, and real-time communications. 4+ years of experience building scalable applications.",
  keywords: ["Software Engineer", "Backend Developer", "Payment Systems", "SIP", "WebRTC", "Mongolia"],
  authors: [{ name: "Enkhbold Nyamdorj" }],
  openGraph: {
    title: "Enkhbold Nyamdorj | Software Engineer",
    description:
      "Software Engineer specializing in payment systems, high-concurrency architecture, and real-time communications.",
    url: "https://encold.guru",
    siteName: "encold.guru",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
