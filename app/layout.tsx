import type React from "react"
import type { Metadata, Viewport } from "next"
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

const description =
  "Enkhbold Nyamdorj — a backend and systems engineer in Ulaanbaatar. " +
  "The line between the part of a system allowed to guess and the part not permitted to lie."

export const metadata: Metadata = {
  metadataBase: new URL("https://encold.guru"),
  title: "Enkhbold Nyamdorj",
  description,
  authors: [{ name: "Enkhbold Nyamdorj" }],
  creator: "Enkhbold Nyamdorj",
  openGraph: {
    title: "Enkhbold Nyamdorj",
    description,
    url: "https://encold.guru",
    siteName: "encold.guru",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Enkhbold Nyamdorj",
    description,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a1120",
  colorScheme: "dark",
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
