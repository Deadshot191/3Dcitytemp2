import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useCityStore } from '../../store/cityStore';
import { Location } from '../../types/city';
import * as THREE from 'three';

interface BuildingsLayerProps {
  locations: Location[];
}

// Building type configurations for instancing
const BUILDING_CONFIGS: Record<string, { width: number; height: number; depth: number; color: string }> = {
  Building: { width: 2, height: 4, depth: 2, color: '#60a5fa' },
  Hospital: { width: 3, height: 3, depth: 3, color: '#ef4444' },
  School: { width: 3, height: 2, depth: 3, color: '#fb923c' },
  Hotel: { width: 2, height: 5, depth: 2, color: '#06b6d4' },
  Shop: { width: 2, height: 1.5, depth: 2, color: '#a78bfa' },
  Restaurant: { width: 2, height: 1.5, depth: 2, color: '#fbbf24' },
  Library: { width: 2.5, height: 2, depth: 2.5, color: '#84cc16' },
  Cafe: { width: 1.5, height: 1.2, depth: 1.5, color: '#f97316' },
  Museum: { width: 3, height: 2, depth: 3, color: '#f472b6' },
};

// Instanced buildings for each type
function InstancedBuildingType({ 
  type, 
  locations,
  selectedLocation,
  onLocationClick,
  onLocationHover
}: { 
  type: string;
  locations: Location[];
  selectedLocation: Location | null;
  onLocationClick: (location: Location) => void;
  onLocationHover: (location: Location | null) => void;
}) {
  const buildingMeshRef = useRef<THREE.InstancedMesh>(null);
  const windowMeshRef = useRef<THREE.InstancedMesh>(null);
  const { timeOfDay, weather } = useCityStore();
  
  const config = BUILDING_CONFIGS[type];
  const isNight = timeOfDay < 6 || timeOfDay > 18;
  
  // Filter locations by type
  const typeLocations = useMemo(() => 
    locations.filter(loc => loc.type === type && loc.type !== 'Park'),
  [locations, type]);

  // Setup instance matrices
  useEffect(() => {
    if (!buildingMeshRef.current || typeLocations.length === 0) return;

    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3(1, 1, 1);

    typeLocations.forEach((location, i) => {
      tempPosition.set(location.position[0], location.position[1] + config.height / 2, location.position[2]);
      tempQuaternion.identity();
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      buildingMeshRef.current!.setMatrixAt(i, tempMatrix);
    });

    buildingMeshRef.current.instanceMatrix.needsUpdate = true;
    buildingMeshRef.current.count = typeLocations.length;
  }, [typeLocations, config]);

  // Setup window instances
  useEffect(() => {
    if (!windowMeshRef.current || typeLocations.length === 0) return;

    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();

    let windowIndex = 0;
    typeLocations.forEach((location) => {
      const rows = Math.floor(config.height / 0.6);
      const cols = Math.floor(config.width / 0.4);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const isLit = isNight ? Math.random() > 0.4 : Math.random() > 0.7;
          
          tempPosition.set(
            location.position[0] + (col - (cols - 1) / 2) * 0.4,
            location.position[1] + row * 0.6 + 0.3,
            location.position[2] + config.depth / 2 + 0.01
          );
          tempQuaternion.identity();
          tempScale.set(0.3, 0.4, 0.05);
          
          tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
          windowMeshRef.current!.setMatrixAt(windowIndex, tempMatrix);
          
          // Set color for lit/unlit windows
          const color = isLit ? new THREE.Color('#ffd700') : new THREE.Color('#333333');
          windowMeshRef.current!.setColorAt(windowIndex, color);
          
          windowIndex++;
        }
      }
    });

    windowMeshRef.current.instanceMatrix.needsUpdate = true;
    if (windowMeshRef.current.instanceColor) {
      windowMeshRef.current.instanceColor.needsUpdate = true;
    }
    windowMeshRef.current.count = windowIndex;
  }, [typeLocations, config, isNight]);

  // Animate selected building
  useFrame((state) => {
    if (!buildingMeshRef.current || !selectedLocation) return;
    
    const selectedIndex = typeLocations.findIndex(loc => loc.id === selectedLocation.id);
    if (selectedIndex === -1) return;

    const time = state.clock.getElapsedTime();
    const tempMatrix = new THREE.Matrix4();
    buildingMeshRef.current.getMatrixAt(selectedIndex, tempMatrix);
    
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    tempMatrix.decompose(position, quaternion, scale);
    
    // Add floating animation
    position.y = config.height / 2 + Math.sin(time * 3) * 0.1;
    tempMatrix.compose(position, quaternion, scale);
    
    buildingMeshRef.current.setMatrixAt(selectedIndex, tempMatrix);
    buildingMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Handle click/hover on instances
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!event.instanceId || event.instanceId >= typeLocations.length) {
      onLocationHover(null);
      return;
    }
    onLocationHover(typeLocations[event.instanceId]);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.instanceId !== undefined && event.instanceId < typeLocations.length) {
      onLocationClick(typeLocations[event.instanceId]);
    }
  };

  // Determine color based on weather
  const buildingColor = useMemo(() => {
    let baseColor = config.color;
    if (weather === 'rain') {
      return new THREE.Color(baseColor).multiplyScalar(0.8);
    } else if (weather === 'snow') {
      return new THREE.Color(baseColor).lerp(new THREE.Color('#ffffff'), 0.3);
    }
    return new THREE.Color(baseColor);
  }, [config.color, weather]);

  // Calculate total windows needed
  const totalWindows = useMemo(() => {
    const rows = Math.floor(config.height / 0.6);
    const cols = Math.floor(config.width / 0.4);
    return typeLocations.length * rows * cols;
  }, [typeLocations.length, config]);

  if (typeLocations.length === 0) return null;

  return (
    <group>
      {/* Instanced buildings - single draw call per type */}
      <instancedMesh 
        ref={buildingMeshRef}
        args={[undefined, undefined, typeLocations.length]}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerOut={() => onLocationHover(null)}
      >
        <boxGeometry args={[config.width, config.height, config.depth]} />
        <meshStandardMaterial 
          color={buildingColor}
          metalness={0.2}
          roughness={0.8}
        />
      </instancedMesh>

      {/* Instanced windows - single draw call per building type */}
      <instancedMesh 
        ref={windowMeshRef}
        args={[undefined, undefined, totalWindows]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          emissive="#ffd700"
          emissiveIntensity={isNight ? 0.5 : 0}
          metalness={0.8}
          roughness={0.2}
        />
      </instancedMesh>
    </group>
  );
}

// Park component (kept separate as it's unique)
function ParkComponent({ location }: { location: Location }) {
  const { selectedLocation, setSelectedLocation, weather } = useCityStore();
  const isSelected = selectedLocation?.id === location.id;
  const hasSnow = weather === 'snow';
  
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    setSelectedLocation(location);
  };

  // Generate tree positions (memoized for performance)
  const treePositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 1 + Math.random() * 1.5;
      positions.push([
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ]);
    }
    return positions;
  }, []);

  return (
    <group 
      position={location.position as [number, number, number]}
      onClick={handleClick}
    >
      {/* Ground */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[3, 3, 0.1, 32]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
      
      {/* Trees */}
      {treePositions.map((pos, i) => (
        <group key={i} position={[pos[0], 0, pos[2]]}>
          {/* Tree trunk */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 1]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          {/* Tree foliage */}
          <mesh position={[0, 1.2, 0]}>
            <sphereGeometry args={[0.5]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
        </group>
      ))}
      
      {/* Pathways */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1, 1.2, 32]} />
        <meshStandardMaterial color="#d6d3d1" />
      </mesh>
      
      {/* Snow layer */}
      {hasSnow && (
        <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3, 32]} />
          <meshStandardMaterial color="white" transparent opacity={0.8} />
        </mesh>
      )}
      
      {/* Selection highlight */}
      {isSelected && (
        <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.2, 3.6, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

export function BuildingsLayer({ locations }: BuildingsLayerProps) {
  const { setSelectedLocation } = useCityStore();
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null);
  
  const buildings = useMemo(() => locations.filter(loc => loc.type !== 'Park'), [locations]);
  const parks = useMemo(() => locations.filter(loc => loc.type === 'Park'), [locations]);
  const { selectedLocation } = useCityStore();

  // Group buildings by type
  const buildingTypes = useMemo(() => 
    Array.from(new Set(buildings.map(loc => loc.type))),
  [buildings]);

  return (
    <>
      {/* Instanced buildings by type - massive performance improvement */}
      {buildingTypes.map(type => (
        <InstancedBuildingType
          key={type}
          type={type}
          locations={buildings}
          selectedLocation={selectedLocation}
          onLocationClick={setSelectedLocation}
          onLocationHover={setHoveredLocation}
        />
      ))}
      
      {/* Selection highlight rings */}
      {selectedLocation && selectedLocation.type !== 'Park' && (
        <mesh 
          position={[
            selectedLocation.position[0],
            0.1,
            selectedLocation.position[2]
          ]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[
            (BUILDING_CONFIGS[selectedLocation.type]?.width || 2) + 0.5,
            (BUILDING_CONFIGS[selectedLocation.type]?.width || 2) + 0.8,
            32
          ]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
        </mesh>
      )}
      
      {/* Hover glow effect */}
      {hoveredLocation && hoveredLocation.type !== 'Park' && hoveredLocation.id !== selectedLocation?.id && (
        <mesh 
          position={[
            hoveredLocation.position[0],
            (BUILDING_CONFIGS[hoveredLocation.type]?.height || 2) / 2,
            hoveredLocation.position[2]
          ]}
        >
          <boxGeometry args={[
            (BUILDING_CONFIGS[hoveredLocation.type]?.width || 2) + 0.2,
            (BUILDING_CONFIGS[hoveredLocation.type]?.height || 2) + 0.2,
            (BUILDING_CONFIGS[hoveredLocation.type]?.depth || 2) + 0.2
          ]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* Parks rendered individually (they're unique) */}
      {parks.map((location) => (
        <ParkComponent 
          key={location.id} 
          location={location}
        />
      ))}
    </>
  );
}
