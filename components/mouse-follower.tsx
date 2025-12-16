"use client"

import { useEffect, useState } from "react"

export function MouseFollower() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
      setIsVisible(true)
    }

    const handleMouseLeave = () => setIsVisible(false)
    const handleMouseEnter = () => setIsVisible(true)

    window.addEventListener("mousemove", updatePosition)
    document.body.addEventListener("mouseleave", handleMouseLeave)
    document.body.addEventListener("mouseenter", handleMouseEnter)

    return () => {
      window.removeEventListener("mousemove", updatePosition)
      document.body.removeEventListener("mouseleave", handleMouseLeave)
      document.body.removeEventListener("mouseenter", handleMouseEnter)
    }
  }, [])

  return (
    <>
      {/* Main cursor glow */}
      <div
        className="fixed pointer-events-none z-[60] mix-blend-screen transition-opacity duration-300"
        style={{
          left: position.x - 150,
          top: position.y - 150,
          opacity: isVisible ? 1 : 0,
        }}
      >
        <div className="w-[300px] h-[300px] rounded-full bg-gradient-radial from-primary/10 via-primary/5 to-transparent blur-2xl" />
      </div>

      {/* Small cursor dot */}
      <div
        className="fixed pointer-events-none z-[60] transition-all duration-75 ease-out"
        style={{
          left: position.x - 4,
          top: position.y - 4,
          opacity: isVisible ? 1 : 0,
        }}
      >
        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_2px] shadow-primary/50" />
      </div>
    </>
  )
}
