import { Canvas } from '@react-three/fiber'

/** Eerste geraamte van de 3D-werkbank: een lege scène die alleen tekent als er iets verandert. */
export default function Bench3D() {
  return (
    <div data-testid="bench3d" className="h-full w-full">
      <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [0, 90, 90], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[40, 80, 30]} intensity={1.2} />
      </Canvas>
    </div>
  )
}
