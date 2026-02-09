import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSphereProps {
  color?: string;
  count?: number;
  analyserRef?: React.MutableRefObject<AnalyserNode | null>;
}

const ParticleSphere = ({ color = '#4f46e5', count = 2000, analyserRef }: ParticleSphereProps) => {
  const points = useRef<THREE.Points>(null!);
  const materialRef = useRef<THREE.PointsMaterial>(null!);
  
  // Generate points on a sphere distribution
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const distance = 2.4; // Made bigger (was 1.8)
    
    for (let i = 0; i < count; i++) {
        const theta = THREE.MathUtils.randFloatSpread(360); 
        const phi = THREE.MathUtils.randFloatSpread(360); 

        const x = distance * Math.sin(theta) * Math.cos(phi);
        const y = distance * Math.sin(theta) * Math.sin(phi);
        const z = distance * Math.cos(theta);

        positions.set([x, y, z], i * 3);
    }
    
    return positions;
  }, [count]);

  const dataArray = useMemo(() => new Uint8Array(128), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    let frequencyFactor = 0;

    // React to Audio pitch/tone if available
    if (analyserRef && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        // Calculate average volume/amplitude
        const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        // Normalize (0-1 mostly)
        frequencyFactor = average / 128.0; 
    }

    // Default gentle rotation
    points.current.rotation.y = time * 0.15 + (frequencyFactor * 0.5); // Spin faster with audio
    points.current.rotation.x = time * 0.05 + (frequencyFactor * 0.2); 
    
    // Scale pulse based on bass/volume ("Make big")
    // Base scale 1, plus audio reaction. Audio reaction is stronger now.
    const s = 1 + Math.sin(time * 1.5) * 0.05 + (frequencyFactor * 0.4);
    points.current.scale.set(s, s, s);

    // Color intensity reaction (simulating 'tone' reaction via brightness)
    if (materialRef.current) {
        materialRef.current.opacity = 0.5 + Math.min(frequencyFactor * 1.5, 0.5);
        materialRef.current.size = 0.045 + (frequencyFactor * 0.03); // Particles get bigger with volume
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.045} // Slightly bigger base particles
        color={color}
        sizeAttenuation={true}
        transparent={true}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

interface OrbProps {
    className?: string;
    analyserRef?: React.MutableRefObject<AnalyserNode | null>;
}

const ParticleOrb: React.FC<OrbProps> = ({ className, analyserRef }) => {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }} // Camera pulled back slightly for larger orb presence
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]} 
      >
        <ambientLight intensity={0.5} />
        <ParticleSphere color="#3b82f6" analyserRef={analyserRef} /> {/* Blue-500 */}
        <ParticleSphere color="#06b6d4" count={1000} analyserRef={analyserRef} /> {/* Cyan-500 */}
        {/* Added a third layer for more density/complexity */}
        <ParticleSphere color="#8b5cf6" count={500} analyserRef={analyserRef} /> {/* Violet-500 */}
      </Canvas>
    </div>
  );
};

export default ParticleOrb;
