"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ParticleField({ count = 1400 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    // Deterministic pseudo-random (pure) so render stays side-effect free.
    const rand = (n: number) => {
      const x = Math.sin(n * 12.9898 + 7.13) * 43758.5453;
      return x - Math.floor(x);
    };
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribute in a flat-ish disc so it reads as drifting dust/embers.
      const r = Math.pow(rand(i * 3), 0.6) * 9;
      const theta = rand(i * 3 + 1) * Math.PI * 2;
      arr[i * 3] = Math.cos(theta) * r;
      arr[i * 3 + 1] = (rand(i * 3 + 2) - 0.5) * 7;
      arr[i * 3 + 2] = Math.sin(theta) * r;
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.04;
    // gentle bob driven by elapsed time
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#c8a04d"
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
}

export default function ParticleHero() {
  return (
    <Canvas
      className="!absolute inset-0"
      camera={{ position: [0, 0, 12], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <ParticleField />
    </Canvas>
  );
}
