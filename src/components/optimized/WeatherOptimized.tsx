import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Instance, Instances } from '@react-three/drei';
import { useCityStore } from '../../store/cityStore';
import { Location } from '../../types/city';
import * as THREE from 'three';

// Optimized rain drop with pooling
function RainDrop({ index }: { index: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const positionRef = useRef(new THREE.Vector3(
    (Math.random() - 0.5) * 80,
    30 + Math.random() * 10,
    (Math.random() - 0.5) * 80
  ));
  const velocityRef = useRef({
    y: -Math.random() * 0.2 - 0.2,
    x: (Math.random() - 0.5) * 0.02,
    z: (Math.random() - 0.5) * 0.02
  });

  useFrame(() => {
    if (!ref.current) return;
    
    const pos = positionRef.current;
    const vel = velocityRef.current;
    
    pos.y += vel.y;
    pos.x += vel.x;
    pos.z += vel.z;
    
    if (pos.y < 0) {
      pos.set(
        (Math.random() - 0.5) * 80,
        30 + Math.random() * 10,
        (Math.random() - 0.5) * 80
      );
    }
  });

  return <Instance ref={ref} position={positionRef.current} />;
}

// Optimized snow flake
function SnowFlake({ index }: { index: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const positionRef = useRef(new THREE.Vector3(
    (Math.random() - 0.5) * 80,
    30 + Math.random() * 10,
    (Math.random() - 0.5) * 80
  ));
  const velocityRef = useRef({
    y: -Math.random() * 0.05 - 0.03,
    x: (Math.random() - 0.5) * 0.02,
    z: (Math.random() - 0.5) * 0.02
  });

  useFrame(() => {
    if (!ref.current) return;
    
    const pos = positionRef.current;
    const vel = velocityRef.current;
    
    pos.y += vel.y;
    pos.x += vel.x;
    pos.z += vel.z;
    
    if (pos.y < 0) {
      pos.set(
        (Math.random() - 0.5) * 80,
        30 + Math.random() * 10,
        (Math.random() - 0.5) * 80
      );
    }
  });

  return <Instance ref={ref} position={positionRef.current} />;
}

// Simplified wet roads - fewer puddles
function WetRoads({ locations, roads }: { locations: Location[], roads: any[] }) {
  const puddles = useMemo(() => {
    const puddlePositions = [];
    
    // Only major intersections (reduced from every other to every third)
    for (let i = 0; i < roads.length; i += 3) {
      const road = roads[i];
      const from = locations.find(l => l.id === road.from);
      const to = locations.find(l => l.id === road.to);
      
      if (!from || !to) continue;
      
      const x = (from.position[0] + to.position[0]) / 2;
      const z = (from.position[2] + to.position[2]) / 2;
      
      puddlePositions.push({
        position: [x, 0, z] as [number, number, number],
        size: 0.5 + Math.random() * 0.8
      });
    }
    
    // Reduced random puddles (from 15 to 8)
    for (let i = 0; i < 8; i++) {
      puddlePositions.push({
        position: [
          (Math.random() - 0.5) * 100,
          0,
          (Math.random() - 0.5) * 100
        ] as [number, number, number],
        size: 0.3 + Math.random() * 0.7
      });
    }
    
    return puddlePositions;
  }, [roads.length, locations.length]);

  return (
    <>
      {puddles.map((puddle, i) => (
        <mesh 
          key={`puddle-${i}`}
          position={[puddle.position[0], 0.01, puddle.position[2]]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[puddle.size, 12]} />
          <meshStandardMaterial
            color="#4a90e2"
            metalness={0.9}
            roughness={0.1}
            opacity={0.8}
            transparent
            envMapIntensity={1.5}
          />
        </mesh>
      ))}
    </>
  );
}

// Optimized snow accumulation - fewer instances
function SnowAccumulation({ locations }: { locations: Location[] }) {
  // Only show snow on buildings if there are less than 50 locations
  const showBuildingSnow = locations.length < 50;
  
  return (
    <>
      {/* Snow on ground */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial 
          color="white" 
          transparent 
          opacity={0.6}
          roughness={0.9}
        />
      </mesh>
      
      {/* Snow on building roofs - limited */}
      {showBuildingSnow && locations.slice(0, 30).map((location, i) => (
        <mesh 
          key={`snow-roof-${i}`}
          position={[location.position[0], 3, location.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[2.5, 2.5]} />
          <meshStandardMaterial 
            color="white" 
            transparent 
            opacity={0.8}
            roughness={0.9}
          />
        </mesh>
      ))}
    </>
  );
}

interface WeatherOptimizedProps {
  locations: Location[];
}

export function WeatherOptimized({ locations }: WeatherOptimizedProps) {
  const { weather, roads } = useCityStore();
  const { scene } = useThree();
  
  // Dynamic fog based on weather
  useEffect(() => {
    if (weather === 'rain') {
      scene.fog = new THREE.FogExp2('#8ca9c0', 0.01);
    } else if (weather === 'snow') {
      scene.fog = new THREE.FogExp2('#e5e7eb', 0.008);
    } else {
      scene.fog = new THREE.FogExp2('#e0f2fe', 0.003);
    }
    
    return () => {
      scene.fog = null;
    };
  }, [weather, scene]);
  
  // Reduced particle count for better performance
  const particleCount = useMemo(() => {
    if (weather === 'rain') return 300; // Reduced from 500
    if (weather === 'snow') return 200; // Reduced from 300
    return 0;
  }, [weather]);

  if (!weather || weather === 'clear') return null;

  return (
    <>
      {weather === 'rain' && (
        <>
          <Instances limit={300}>
            <cylinderGeometry args={[0.005, 0.005, 0.1, 4]} />
            <meshBasicMaterial 
              color="#a8c8ff" 
              transparent 
              opacity={0.6}
            />
            {Array.from({ length: particleCount }, (_, i) => (
              <RainDrop key={`rain-${i}`} index={i} />
            ))}
          </Instances>
          <WetRoads locations={locations} roads={roads} />
        </>
      )}
      
      {weather === 'snow' && (
        <>
          <Instances limit={200}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial 
              color="white" 
              transparent 
              opacity={0.8}
            />
            {Array.from({ length: particleCount }, (_, i) => (
              <SnowFlake key={`snow-${i}`} index={i} />
            ))}
          </Instances>
          <SnowAccumulation locations={locations} />
        </>
      )}
    </>
  );
}
