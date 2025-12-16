"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useRef, useMemo, useEffect, useState } from "react"
import * as THREE from "three"

function useScrollProgress() {
  const [scrollY, setScrollY] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      setScrollY(currentScrollY)
      setScrollProgress(maxScroll > 0 ? currentScrollY / maxScroll : 0)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return { scrollY, scrollProgress }
}

function useMousePosition() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return mouse
}

function FloatingGeometry({ scrollProgress, mouse }: { scrollProgress: number; mouse: { x: number; y: number } }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const wireframeRef = useRef<THREE.LineSegments>(null)
  const targetRotation = useRef({ x: 0, y: 0 })

  // Morph between geometries based on scroll
  const geometries = useMemo(
    () => ({
      icosahedron: new THREE.IcosahedronGeometry(2.5, 1),
      octahedron: new THREE.OctahedronGeometry(2.5, 0),
      dodecahedron: new THREE.DodecahedronGeometry(2, 0),
    }),
    [],
  )

  const currentGeometry = useMemo(() => {
    if (scrollProgress < 0.33) return geometries.icosahedron
    if (scrollProgress < 0.66) return geometries.octahedron
    return geometries.dodecahedron
  }, [scrollProgress, geometries])

  const edges = useMemo(() => new THREE.EdgesGeometry(currentGeometry), [currentGeometry])

  useFrame((state) => {
    if (meshRef.current && wireframeRef.current) {
      // Mouse influence on rotation
      targetRotation.current.x = mouse.y * 0.5
      targetRotation.current.y = mouse.x * 0.5

      // Smooth rotation with time and mouse influence
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        Math.sin(state.clock.elapsedTime * 0.3) * 0.2 + targetRotation.current.x,
        0.05,
      )
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        state.clock.elapsedTime * 0.15 + targetRotation.current.y,
        0.05,
      )

      // Scale based on scroll
      const scale = 1 + scrollProgress * 0.3
      meshRef.current.scale.setScalar(scale)

      // Position based on scroll - moves closer as you scroll
      meshRef.current.position.z = -2 + scrollProgress * 3
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3

      // Sync wireframe
      wireframeRef.current.rotation.copy(meshRef.current.rotation)
      wireframeRef.current.scale.copy(meshRef.current.scale)
      wireframeRef.current.position.copy(meshRef.current.position)
    }
  })

  return (
    <group position={[3, 0, 0]}>
      <mesh ref={meshRef} geometry={currentGeometry}>
        <meshBasicMaterial color="#0d9488" transparent opacity={0.05 + scrollProgress * 0.05} />
      </mesh>
      <lineSegments ref={wireframeRef} geometry={edges}>
        <lineBasicMaterial color="#0d9488" transparent opacity={0.2 + scrollProgress * 0.2} />
      </lineSegments>
    </group>
  )
}

function FloatingTorus({ scrollProgress, mouse }: { scrollProgress: number; mouse: { x: number; y: number } }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      // Rotation influenced by scroll and mouse
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2 + scrollProgress * Math.PI
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.1 + mouse.x * 0.3

      // Position changes with scroll
      meshRef.current.position.y = Math.cos(state.clock.elapsedTime * 0.4) * 0.5 - 2 + scrollProgress * 4
      meshRef.current.position.x = -4 + mouse.x * 0.5

      // Scale grows with scroll
      const scale = 1 + scrollProgress * 0.5
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <mesh ref={meshRef} position={[-4, -2, -3]}>
      <torusGeometry args={[1.5, 0.02, 16, 100]} />
      <meshBasicMaterial color="#0d9488" transparent opacity={0.3} />
    </mesh>
  )
}

function GridPlane({ scrollProgress }: { scrollProgress: number }) {
  const gridRef = useRef<THREE.GridHelper>(null)
  const planeRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (gridRef.current) {
      // Grid moves faster as you scroll
      gridRef.current.position.z = (state.clock.elapsedTime * (0.5 + scrollProgress)) % 1
      // Tilt based on scroll
      gridRef.current.rotation.x = -Math.PI / 2 + scrollProgress * 0.2
    }
    if (planeRef.current) {
      // Wave effect on the plane geometry
      const positions = planeRef.current.geometry.attributes.position
      const time = state.clock.elapsedTime
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i)
        const z = positions.getZ(i)
        positions.setY(
          i,
          Math.sin(x * 0.5 + time + scrollProgress * 5) * Math.cos(z * 0.5 + time) * 0.3 * scrollProgress,
        )
      }
      positions.needsUpdate = true
    }
  })

  return (
    <group>
      <gridHelper ref={gridRef} args={[30, 30, "#0d9488", "#0d9488"]} position={[0, -5, 0]} rotation={[0, 0, 0]}>
        <meshBasicMaterial transparent opacity={0.08 + scrollProgress * 0.05} />
      </gridHelper>
      <mesh ref={planeRef} position={[0, -5.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30, 32, 32]} />
        <meshBasicMaterial color="#0d9488" transparent opacity={0.02} wireframe />
      </mesh>
    </group>
  )
}

function FloatingPoints({ scrollProgress, mouse }: { scrollProgress: number; mouse: { x: number; y: number } }) {
  const pointsRef = useRef<THREE.Points>(null)
  const originalPositions = useRef<Float32Array | null>(null)

  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(800 * 3)
    for (let i = 0; i < 800; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return positions
  }, [])

  useEffect(() => {
    originalPositions.current = particlesPosition.slice()
  }, [particlesPosition])

  useFrame((state) => {
    if (pointsRef.current && originalPositions.current) {
      const positions = pointsRef.current.geometry.attributes.position
      const time = state.clock.elapsedTime

      // Particles expand outward based on scroll
      for (let i = 0; i < positions.count; i++) {
        const ix = i * 3
        const iy = i * 3 + 1
        const iz = i * 3 + 2

        const ox = originalPositions.current[ix]
        const oy = originalPositions.current[iy]
        const oz = originalPositions.current[iz]

        // Expansion based on scroll
        const expansion = 1 + scrollProgress * 0.5

        // Add subtle floating motion
        positions.setXYZ(
          i,
          ox * expansion + Math.sin(time + i) * 0.1,
          oy * expansion + Math.cos(time + i * 0.5) * 0.1,
          oz * expansion,
        )
      }
      positions.needsUpdate = true

      // Overall rotation with mouse influence
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02 + mouse.x * 0.2
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.01 + mouse.y * 0.2
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={800} array={particlesPosition} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04 + scrollProgress * 0.02}
        color="#0d9488"
        transparent
        opacity={0.4 + scrollProgress * 0.2}
        sizeAttenuation
      />
    </points>
  )
}

function OrbitalRing({
  radius,
  speed,
  offset,
  scrollProgress,
  mouse,
}: {
  radius: number
  speed: number
  offset: number
  scrollProgress: number
  mouse: { x: number; y: number }
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ringRef.current) {
      // Speed increases with scroll
      const dynamicSpeed = speed * (1 + scrollProgress * 3)

      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.3 + offset) * 0.3 + mouse.y * 0.2
      ringRef.current.rotation.z = state.clock.elapsedTime * dynamicSpeed + mouse.x * 0.1

      // Rings expand with scroll
      const scale = 1 + scrollProgress * 0.3
      ringRef.current.scale.setScalar(scale)
    }
    if (trailRef.current) {
      trailRef.current.rotation.copy(ringRef.current!.rotation)
      trailRef.current.scale.copy(ringRef.current!.scale)
    }
  })

  return (
    <group position={[0, 0, -5]}>
      <mesh ref={ringRef}>
        <torusGeometry args={[radius, 0.015, 16, 100]} />
        <meshBasicMaterial color="#0d9488" transparent opacity={0.2 + scrollProgress * 0.15} />
      </mesh>
      {/* Glowing trail effect */}
      <mesh ref={trailRef}>
        <torusGeometry args={[radius, 0.05, 16, 100]} />
        <meshBasicMaterial color="#0d9488" transparent opacity={0.05} />
      </mesh>
    </group>
  )
}

function DNAHelix({ scrollProgress, mouse }: { scrollProgress: number; mouse: { x: number; y: number } }) {
  const groupRef = useRef<THREE.Group>(null)

  const spheres = useMemo(() => {
    const items = []
    const count = 40
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 4
      items.push({
        position1: [Math.cos(t) * 1.5, i * 0.3 - 6, Math.sin(t) * 1.5] as [number, number, number],
        position2: [Math.cos(t + Math.PI) * 1.5, i * 0.3 - 6, Math.sin(t + Math.PI) * 1.5] as [number, number, number],
      })
    }
    return items
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2 + mouse.x * 0.3
      groupRef.current.position.x = -5 + scrollProgress * 2
      groupRef.current.position.y = scrollProgress * 3

      // Fade in based on scroll
      groupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          ;(child.material as THREE.MeshBasicMaterial).opacity = scrollProgress * 0.4
        }
      })
    }
  })

  if (scrollProgress < 0.1) return null

  return (
    <group ref={groupRef} position={[-5, 0, -3]}>
      {spheres.map((sphere, i) => (
        <group key={i}>
          <mesh position={sphere.position1}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#0d9488" transparent opacity={0} />
          </mesh>
          <mesh position={sphere.position2}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#14b8a6" transparent opacity={0} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function FloatingCodeBlocks({ scrollProgress }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null)

  const blocks = useMemo(
    () => [
      { position: [4, 2, -4] as [number, number, number], size: [1, 0.6, 0.02] as [number, number, number] },
      { position: [5, -1, -3] as [number, number, number], size: [0.8, 0.5, 0.02] as [number, number, number] },
      { position: [3.5, 0, -5] as [number, number, number], size: [1.2, 0.7, 0.02] as [number, number, number] },
    ],
    [],
  )

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          child.rotation.y = Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.1
          child.rotation.x = Math.cos(state.clock.elapsedTime * 0.3 + i) * 0.05
          child.position.y = blocks[i].position[1] + Math.sin(state.clock.elapsedTime + i) * 0.2
          ;(child.material as THREE.MeshBasicMaterial).opacity = scrollProgress * 0.3
        }
      })
    }
  })

  if (scrollProgress < 0.2) return null

  return (
    <group ref={groupRef}>
      {blocks.map((block, i) => (
        <mesh key={i} position={block.position}>
          <boxGeometry args={block.size} />
          <meshBasicMaterial color="#0d9488" transparent opacity={0} />
        </mesh>
      ))}
    </group>
  )
}

function SceneContent() {
  const { scrollProgress } = useScrollProgress()
  const mouse = useMousePosition()

  return (
    <>
      <ambientLight intensity={0.5} />
      <FloatingGeometry scrollProgress={scrollProgress} mouse={mouse} />
      <FloatingTorus scrollProgress={scrollProgress} mouse={mouse} />
      <FloatingPoints scrollProgress={scrollProgress} mouse={mouse} />
      <GridPlane scrollProgress={scrollProgress} />
      <OrbitalRing radius={4} speed={0.1} offset={0} scrollProgress={scrollProgress} mouse={mouse} />
      <OrbitalRing radius={5} speed={-0.08} offset={Math.PI / 3} scrollProgress={scrollProgress} mouse={mouse} />
      <OrbitalRing radius={6} speed={0.05} offset={Math.PI / 1.5} scrollProgress={scrollProgress} mouse={mouse} />
      <DNAHelix scrollProgress={scrollProgress} mouse={mouse} />
      <FloatingCodeBlocks scrollProgress={scrollProgress} />
    </>
  )
}

export function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true }}
    >
      <SceneContent />
    </Canvas>
  )
}
