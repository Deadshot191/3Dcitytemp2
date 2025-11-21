import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCityStore } from '../store/cityStore';
import { Location, Road } from '../types/city';
import * as THREE from 'three';

// Collision detection helper
function isNearStructure(point: [number, number, number], roads: Road[], locations: Location[], minDistance: number): boolean {
  // Check distance to buildings
  for (const location of locations) {
    const dx = point[0] - location.position[0];
    const dz = point[2] - location.position[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    let buildingSize = 1;
    if (location.type === 'School' || location.type === 'Hospital') buildingSize = 2;
    if (location.type === 'Hotel') buildingSize = 1.5;
    
    if (distance < minDistance + buildingSize) return true;
  }

  // Check distance to roads
  for (const road of roads) {
    const from = locations.find(l => l.id === road.from);
    const to = locations.find(l => l.id === road.to);
    if (!from || !to) continue;

    const roadVector = new THREE.Vector2(
      to.position[0] - from.position[0],
      to.position[2] - from.position[2]
    );
    const pointVector = new THREE.Vector2(
      point[0] - from.position[0],
      point[2] - from.position[2]
    );
    
    const roadLength = roadVector.length();
    const projection = pointVector.dot(roadVector) / roadLength;
    
    if (projection >= 0 && projection <= roadLength) {
      const distance = Math.abs(
        (to.position[0] - from.position[0]) * (from.position[2] - point[2]) -
        (from.position[0] - point[0]) * (to.position[2] - from.position[2])
      ) / roadLength;
      
      const roadWidth = road.type === 'main' ? 3 : 
                       road.type === 'secondary' ? 2 : 1.5;
      
      if (distance < minDistance + roadWidth) return true;
    }
  }

  return false;
}

// Terrain type helper
function getTerrainType(x: number, z: number): string {
  const biomeScale = 0.02;
  const biomeValue = Math.sin(x * biomeScale) * Math.cos(z * biomeScale);
  
  if (biomeValue > 0.7) return 'pine';
  if (biomeValue < -0.7) return 'palm';
  return 'normal';
}

interface VegetationProps {
  locations: Location[];
  roads: Road[];
}

// Instanced trees component
function InstancedTrees({ positions, scales, types }: { 
  positions: THREE.Vector3[];
  scales: number[];
  types: string[];
}) {
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const foliageMeshRef = useRef<THREE.InstancedMesh>(null);
  const { weather } = useCityStore();
  
  const windIntensity = weather === 'rain' ? 0.15 : 
                       weather === 'snow' ? 0.08 : 0.05;

  // Setup instance matrices
  useEffect(() => {
    if (!trunkMeshRef.current || !foliageMeshRef.current || positions.length === 0) return;

    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();

    positions.forEach((position, i) => {
      // Trunk
      tempPosition.copy(position);
      tempPosition.y += 0.5 * scales[i];
      tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
      tempScale.set(scales[i], scales[i], scales[i]);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      trunkMeshRef.current.setMatrixAt(i, tempMatrix);

      // Foliage
      tempPosition.copy(position);
      tempPosition.y += 1.2 * scales[i];
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      foliageMeshRef.current.setMatrixAt(i, tempMatrix);
    });

    trunkMeshRef.current.instanceMatrix.needsUpdate = true;
    trunkMeshRef.current.count = positions.length;
    foliageMeshRef.current.instanceMatrix.needsUpdate = true;
    foliageMeshRef.current.count = positions.length;
  }, [positions, scales]);

  // Wind animation
  useFrame((state) => {
    if (!trunkMeshRef.current || !foliageMeshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const tempMatrix = new THREE.Matrix4();
    
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      
      // Trunk sway
      trunkMeshRef.current.getMatrixAt(i, tempMatrix);
      const trunkPos = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      tempMatrix.decompose(trunkPos, quaternion, scale);
      
      const sway = Math.sin(time + position.x * 0.1) * windIntensity;
      const windQuaternion = new THREE.Quaternion();
      windQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), sway);
      quaternion.multiply(windQuaternion);
      
      tempMatrix.compose(trunkPos, quaternion, scale);
      trunkMeshRef.current.setMatrixAt(i, tempMatrix);

      // Foliage sway (more pronounced)
      foliageMeshRef.current.getMatrixAt(i, tempMatrix);
      const foliagePos = new THREE.Vector3();
      tempMatrix.decompose(foliagePos, quaternion, scale);
      
      const foliageSway = Math.sin(time * 1.2 + position.x * 0.1) * windIntensity * 1.5;
      windQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), foliageSway);
      quaternion.multiply(windQuaternion);
      
      tempMatrix.compose(foliagePos, quaternion, scale);
      foliageMeshRef.current.setMatrixAt(i, tempMatrix);
    }
    
    trunkMeshRef.current.instanceMatrix.needsUpdate = true;
    foliageMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  const foliageColor = weather === 'snow' ? '#a5d6a7' : 
                       weather === 'rain' ? '#2e7d32' : '#2d5a27';

  if (positions.length === 0) return null;

  return (
    <group>
      {/* Tree trunks - single draw call */}
      <instancedMesh 
        ref={trunkMeshRef}
        args={[undefined, undefined, positions.length]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.1, 0.2, 1]} />
        <meshStandardMaterial color="#4a3728" />
      </instancedMesh>

      {/* Tree foliage - single draw call */}
      <instancedMesh 
        ref={foliageMeshRef}
        args={[undefined, undefined, positions.length]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color={foliageColor} />
      </instancedMesh>
    </group>
  );
}

// Instanced grass component
function InstancedGrass({ positions }: { positions: THREE.Vector3[] }) {
  const grassMeshRef = useRef<THREE.InstancedMesh>(null);
  const { weather } = useCityStore();
  
  const windIntensity = weather === 'rain' ? 0.25 : 
                       weather === 'snow' ? 0.1 : 0.15;

  // Setup instance matrices
  useEffect(() => {
    if (!grassMeshRef.current || positions.length === 0) return;

    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3(1, 1, 1);

    positions.forEach((position, i) => {
      tempPosition.copy(position);
      tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      grassMeshRef.current!.setMatrixAt(i, tempMatrix);
    });

    grassMeshRef.current.instanceMatrix.needsUpdate = true;
    grassMeshRef.current.count = positions.length;
  }, [positions]);

  // Wind animation
  useFrame((state) => {
    if (!grassMeshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const tempMatrix = new THREE.Matrix4();
    
    for (let i = 0; i < Math.min(positions.length, 100); i++) { // Animate subset for performance
      const position = positions[i];
      grassMeshRef.current.getMatrixAt(i, tempMatrix);
      
      const pos = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      tempMatrix.decompose(pos, quaternion, scale);
      
      const sway = Math.sin(time * 2 + position.x * 0.5) * windIntensity;
      const windQuaternion = new THREE.Quaternion();
      windQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), sway);
      quaternion.multiply(windQuaternion);
      
      tempMatrix.compose(pos, quaternion, scale);
      grassMeshRef.current.setMatrixAt(i, tempMatrix);
    }
    
    grassMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  const grassColor = weather === 'snow' ? '#a5d6a7' : 
                    weather === 'rain' ? '#2e7d32' : '#3a5a40';

  if (positions.length === 0) return null;

  return (
    <instancedMesh 
      ref={grassMeshRef}
      args={[undefined, undefined, positions.length]}
    >
      <cylinderGeometry args={[0.05, 0, 0.3]} />
      <meshStandardMaterial color={grassColor} />
    </instancedMesh>
  );
}

export function Vegetation({ locations, roads }: VegetationProps) {
  const vegetationData = useMemo(() => {
    const data = {
      treePositions: [] as THREE.Vector3[],
      treeScales: [] as number[],
      treeTypes: [] as string[],
      grassPositions: [] as THREE.Vector3[]
    };
    
    // Generate vegetation around parks and suitable areas
    locations.forEach(location => {
      const radius = location.type === 'Park' ? 15 : 8;
      const density = location.type === 'Park' ? 80 : 20;
      
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * radius;
        
        const x = location.position[0] + Math.cos(angle) * distance;
        const z = location.position[2] + Math.sin(angle) * distance;
        
        const point: [number, number, number] = [x, 0, z];
        
        if (!isNearStructure(point, roads, locations, location.type === 'Park' ? 3 : 5)) {
          if (Math.random() < 0.3) {
            data.treePositions.push(new THREE.Vector3(x, 0, z));
            data.treeScales.push(0.8 + Math.random() * 0.4);
            data.treeTypes.push(getTerrainType(x, z));
          } else {
            data.grassPositions.push(new THREE.Vector3(x, 0, z));
          }
        }
      }
    });
    
    // Add additional vegetation in suitable areas
    for (let i = 0; i < 200; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      const point: [number, number, number] = [x, 0, z];
      
      if (!isNearStructure(point, roads, locations, 5)) {
        if (Math.random() < 0.2) {
          data.treePositions.push(new THREE.Vector3(x, 0, z));
          data.treeScales.push(0.6 + Math.random() * 0.3);
          data.treeTypes.push(getTerrainType(x, z));
        } else {
          data.grassPositions.push(new THREE.Vector3(x, 0, z));
        }
      }
    }
    
    return data;
  }, [locations, roads]);

  return (
    <>
      {/* Instanced trees - single draw call for all trees */}
      <InstancedTrees 
        positions={vegetationData.treePositions}
        scales={vegetationData.treeScales}
        types={vegetationData.treeTypes}
      />
      
      {/* Instanced grass - single draw call for all grass */}
      <InstancedGrass 
        positions={vegetationData.grassPositions}
      />
    </>
  );
}
