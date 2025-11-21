import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCityStore } from '../../store/cityStore';
import { Location, Road } from '../../types/city';
import * as THREE from 'three';

interface InstancedVegetationProps {
  locations: Location[];
  roads: Road[];
}

// Vegetation configurations
const VEGETATION_CONFIGS = {
  trees: {
    instances: 200,
    geometry: [0.1, 1, 0.1], // trunk
    foliageGeometry: [0.5, 0.5, 0.5], // foliage
    colors: ['#2d5a27', '#22c55e', '#16a34a'],
    trunkColor: '#4a3728'
  },
  grass: {
    instances: 1000,
    geometry: [0.05, 0.3, 0.05],
    colors: ['#3a5a40', '#2e7d32', '#4caf50']
  },
  bushes: {
    instances: 150,
    geometry: [0.3, 0.3, 0.3],
    colors: ['#22c55e', '#16a34a', '#15803d']
  },
  flowers: {
    instances: 300,
    geometry: [0.02, 0.1, 0.02],
    colors: ['#f472b6', '#ec4899', '#db2777', '#fbbf24', '#f59e0b']
  }
};

// Spatial grid for collision detection
class SpatialGrid {
  private grid: Map<string, Set<{ x: number; z: number; radius: number }>> = new Map();
  private cellSize: number;

  constructor(cellSize: number = 10) {
    this.cellSize = cellSize;
  }

  private getKey(x: number, z: number): string {
    const gridX = Math.floor(x / this.cellSize);
    const gridZ = Math.floor(z / this.cellSize);
    return `${gridX},${gridZ}`;
  }

  addObstacle(x: number, z: number, radius: number) {
    const key = this.getKey(x, z);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add({ x, z, radius });
  }

  isNearObstacle(x: number, z: number, minDistance: number): boolean {
    const key = this.getKey(x, z);
    const obstacles = this.grid.get(key);
    
    if (!obstacles) return false;
    
    for (const obstacle of obstacles) {
      const dx = x - obstacle.x;
      const dz = z - obstacle.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < minDistance + obstacle.radius) {
        return true;
      }
    }
    return false;
  }
}

// Individual vegetation type component
function InstancedVegetationType({ 
  type, 
  config, 
  positions, 
  scales,
  rotations 
}: { 
  type: string; 
  config: any; 
  positions: THREE.Vector3[]; 
  scales: number[];
  rotations: number[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const foliageMeshRef = useRef<THREE.InstancedMesh>(null);
  const { weather, timeOfDay } = useCityStore();
  
  const windIntensity = weather === 'rain' ? 0.15 : 
                       weather === 'snow' ? 0.08 : 0.05;

  // Update instance matrices
  useMemo(() => {
    if (meshRef.current && positions.length > 0) {
      const tempMatrix = new THREE.Matrix4();
      const tempPosition = new THREE.Vector3();
      const tempQuaternion = new THREE.Quaternion();
      const tempScale = new THREE.Vector3();

      positions.forEach((position, i) => {
        tempPosition.copy(position);
        tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotations[i]);
        tempScale.setScalar(scales[i]);
        
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        meshRef.current!.setMatrixAt(i, tempMatrix);
      });
      
      meshRef.current.instanceMatrix.needsUpdate = true;
      meshRef.current.count = positions.length;
    }

    // Handle foliage for trees
    if (type === 'trees' && foliageMeshRef.current && positions.length > 0) {
      const tempMatrix = new THREE.Matrix4();
      const tempPosition = new THREE.Vector3();
      const tempQuaternion = new THREE.Quaternion();
      const tempScale = new THREE.Vector3();

      positions.forEach((position, i) => {
        tempPosition.copy(position);
        tempPosition.y += 1.2; // Lift foliage above trunk
        tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotations[i]);
        tempScale.setScalar(scales[i]);
        
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        foliageMeshRef.current!.setMatrixAt(i, tempMatrix);
      });
      
      foliageMeshRef.current.instanceMatrix.needsUpdate = true;
      foliageMeshRef.current.count = positions.length;
    }
  }, [positions, scales, rotations, type]);

  // Wind animation
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const tempMatrix = new THREE.Matrix4();
    
    for (let i = 0; i < positions.length; i++) {
      meshRef.current.getMatrixAt(i, tempMatrix);
      
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      tempMatrix.decompose(position, quaternion, scale);
      
      // Apply wind sway
      const sway = Math.sin(time + position.x * 0.1) * windIntensity;
      const windQuaternion = new THREE.Quaternion();
      windQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), sway);
      quaternion.multiply(windQuaternion);
      
      tempMatrix.compose(position, quaternion, scale);
      meshRef.current.setMatrixAt(i, tempMatrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Determine color based on weather
  const vegetationColor = useMemo(() => {
    const baseColors = config.colors;
    const baseColor = baseColors[Math.floor(Math.random() * baseColors.length)];
    
    if (weather === 'snow') {
      return new THREE.Color(baseColor).lerp(new THREE.Color('#ffffff'), 0.3);
    } else if (weather === 'rain') {
      return new THREE.Color(baseColor).multiplyScalar(1.2);
    }
    return new THREE.Color(baseColor);
  }, [config.colors, weather]);

  if (positions.length === 0) return null;

  return (
    <group>
      {/* Main vegetation mesh */}
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, config.instances]}
        castShadow
        receiveShadow
      >
        {type === 'trees' ? (
          <cylinderGeometry args={config.geometry} />
        ) : type === 'grass' ? (
          <cylinderGeometry args={[0.05, 0, 0.3]} />
        ) : (
          <sphereGeometry args={config.geometry} />
        )}
        <meshStandardMaterial 
          color={type === 'trees' ? config.trunkColor : vegetationColor}
          roughness={0.8}
          metalness={0.1}
        />
      </instancedMesh>

      {/* Tree foliage */}
      {type === 'trees' && (
        <instancedMesh 
          ref={foliageMeshRef} 
          args={[undefined, undefined, config.instances]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={config.foliageGeometry} />
          <meshStandardMaterial 
            color={vegetationColor}
            roughness={0.7}
            metalness={0.1}
          />
        </instancedMesh>
      )}
    </group>
  );
}

export function InstancedVegetation({ locations, roads }: InstancedVegetationProps) {
  // Create spatial grid for collision detection
  const spatialGrid = useMemo(() => {
    const grid = new SpatialGrid(10);
    
    // Add buildings as obstacles
    locations.forEach(location => {
      const radius = location.type === 'Park' ? 3 : 
                    location.type === 'School' || location.type === 'Hospital' ? 4 : 2;
      grid.addObstacle(location.position[0], location.position[2], radius);
    });
    
    // Add roads as obstacles
    roads.forEach(road => {
      const from = locations.find(l => l.id === road.from);
      const to = locations.find(l => l.id === road.to);
      if (!from || !to) return;
      
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = from.position[0] + (to.position[0] - from.position[0]) * t;
        const z = from.position[2] + (to.position[2] - from.position[2]) * t;
        const radius = road.type === 'main' ? 3 : road.type === 'secondary' ? 2 : 1.5;
        grid.addObstacle(x, z, radius);
      }
    });
    
    return grid;
  }, [locations, roads]);

  // Generate vegetation data
  const vegetationData = useMemo(() => {
    const data: Record<string, {
      positions: THREE.Vector3[];
      scales: number[];
      rotations: number[];
    }> = {};

    Object.keys(VEGETATION_CONFIGS).forEach(type => {
      const positions: THREE.Vector3[] = [];
      const scales: number[] = [];
      const rotations: number[] = [];
      const config = VEGETATION_CONFIGS[type];

      // Generate around parks with high density
      locations.forEach(location => {
        if (location.type === 'Park') {
          const count = type === 'trees' ? 20 : type === 'grass' ? 100 : type === 'bushes' ? 15 : 30;
          const radius = 8;
          
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.sqrt(Math.random()) * radius;
            const x = location.position[0] + Math.cos(angle) * distance;
            const z = location.position[2] + Math.sin(angle) * distance;
            
            if (!spatialGrid.isNearObstacle(x, z, 1)) {
              positions.push(new THREE.Vector3(x, 0, z));
              scales.push(0.8 + Math.random() * 0.4);
              rotations.push(Math.random() * Math.PI * 2);
            }
          }
        }
      });

      // Sparse vegetation in open areas
      const openAreaCount = type === 'trees' ? 50 : type === 'grass' ? 200 : type === 'bushes' ? 30 : 50;
      for (let i = 0; i < openAreaCount; i++) {
        const x = (Math.random() - 0.5) * 180;
        const z = (Math.random() - 0.5) * 180;
        
        if (!spatialGrid.isNearObstacle(x, z, 3)) {
          positions.push(new THREE.Vector3(x, 0, z));
          scales.push(0.6 + Math.random() * 0.4);
          rotations.push(Math.random() * Math.PI * 2);
        }
      }

      data[type] = { positions, scales, rotations };
    });

    return data;
  }, [locations, spatialGrid]);

  const { viewMode } = useCityStore();
  
  // Hide vegetation in Planning and Traffic modes
  if (viewMode === 'Planning' || viewMode === 'Traffic') {
    return null;
  }

  return (
    <group name="instanced-vegetation">
      {Object.entries(VEGETATION_CONFIGS).map(([type, config]) => (
        <InstancedVegetationType
          key={type}
          type={type}
          config={config}
          positions={vegetationData[type]?.positions || []}
          scales={vegetationData[type]?.scales || []}
          rotations={vegetationData[type]?.rotations || []}
        />
      ))}
    </group>
  );
}