import { useScrollStore } from "@/hooks/use-scroll-store"

export function Environment() {
  const progress = useScrollStore((s) => s.progress)

  // Fog deepens as you descend
  const fogNear = 5 + progress * 10
  const fogFar = 40 + progress * 20

  return (
    <>
      {/* Ambient fill light */}
      <ambientLight intensity={0.15} color="#c8a050" />

      {/* Key light from above — warm amber */}
      <directionalLight
        position={[5, 20, 5]}
        intensity={0.4}
        color="#e8b040"
      />

      {/* Rim light — cool blue for depth contrast */}
      <directionalLight
        position={[-5, -10, 5]}
        intensity={0.2}
        color="#4060c0"
      />

      {/* Point light at the core — the heart of the machine */}
      <pointLight
        position={[0, 0, 0]}
        intensity={2}
        distance={30}
        decay={2}
        color="#e8a020"
      />

      {/* Fog */}
      <fog attach="fog" args={["#0a0a14", fogNear, fogFar]} />
    </>
  )
}
