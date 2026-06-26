import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, Fraunces, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

// Three voices. Display grotesque for the claims, a serif for the prose voice,
// a strict monospace for everything that is not permitted to lie.
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--ff-display",
  display: "swap",
})
const prose = Fraunces({
  subsets: ["latin"],
  variable: "--ff-prose",
  display: "swap",
})
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--ff-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Enkhbold Nyamdorj",
  description:
    "The personal site of Enkhbold Nyamdorj — built at night, in Ulaanbaatar.",
  authors: [{ name: "Enkhbold Nyamdorj" }],
  openGraph: {
    title: "Enkhbold Nyamdorj",
    description:
      "The personal site of Enkhbold Nyamdorj — built at night, in Ulaanbaatar.",
    url: "https://encold.guru",
    siteName: "encold.guru",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${prose.variable} ${mono.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
