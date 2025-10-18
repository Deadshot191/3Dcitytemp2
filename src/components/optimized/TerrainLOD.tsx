import { useMemo, useCallback, useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useCityStore } from '../../store/cityStore';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { Location, Road } from '../../types/city';

// Create noise generator (singleton)
const noise2D = createNoise2D();

// Improved noise function
function improvedNoise(x: number, y: number, scale = 1) {
  return noise2D(x * scale, y * scale);
}

interface TerrainLODProps {
  locations: Location[];
  roads: Road[];
}

// LOD configuration
const LOD_CONFIGS = {
  high: { size: 200, segments: 128 },    // 16,384 vertices (was 65,536)
  medium: { size: 200, segments: 64 },   // 4,096 vertices
  low: { size: 200, segments: 32 },      // 1,024 vertices
};

// Cache for terrain geometries
const geometryCache = new Map<string, THREE.BufferGeometry>();

function generateTerrainGeometry(
  size: number,
  segments: number,
  locations: Location[],
  roads: Road[],
  cacheKey: string
): THREE.BufferGeometry {
  // Check cache first
  if (geometryCache.has(cacheKey)) {
    return geometryCache.get(cacheKey)!.clone();
  }

  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  const positions = geo.attributes.position.array as Float32Array;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];

    // Calculate base terrain elevation
    const elevation =
      improvedNoise(x, z, 0.02) * 3.0 +
      improvedNoise(x, z, 0.04) * 1.5 +
      improvedNoise(x, z, 0.08) * 0.75 +
      improvedNoise(x, z, 0.16) * 0.35;

    // Calculate flattening influence from buildings and roads
    let flatteningFactor = 0;

    // Building influence (optimized with distance check)
    for (const location of locations) {
      const dx = x - location.position[0];
      const dz = z - location.position[2];
      const distanceSq = dx * dx + dz * dz;

      // Quick distance check before sqrt
      if (distanceSq > 100) continue; // Skip if too far

      const distance = Math.sqrt(distanceSq);

      let flatteningRadius = 8;
      if (location.type === 'School' || location.type === 'Hospital') {
        flatteningRadius = 10;
      } else if (location.type === 'Park') {
        flatteningRadius = 6;
      }

      const buildingInfluence = Math.max(0, 1 - distance / flatteningRadius);
      flatteningFactor = Math.max(flatteningFactor, buildingInfluence);
    }

    // Road influence (optimized)
    for (const road of roads) {
      const from = locations.find(l => l.id === road.from);
      const to = locations.find(l => l.id === road.to);
      if (!from || !to) continue;

      // Calculate distance to road segment
      const roadVector = new THREE.Vector2(
        to.position[0] - from.position[0],
        to.position[2] - from.position[2]
      );
      const pointVector = new THREE.Vector2(
        x - from.position[0],
        z - from.position[2]
      );

      const roadLength = roadVector.length();
      const projection = pointVector.dot(roadVector) / roadLength;

      if (projection >= 0 && projection <= roadLength) {
        const distance = Math.abs(
          (to.position[0] - from.position[0]) * (from.position[2] - z) -
          (from.position[0] - x) * (to.position[2] - from.position[2])
        ) / roadLength;

        const roadWidth = road.type === 'main' ? 8 : road.type === 'secondary' ? 6 : 5;
        const roadInfluence = Math.max(0, 1 - distance / roadWidth);
        flatteningFactor = Math.max(flatteningFactor, roadInfluence);
      }
    }

    // Apply elevation with flattening
    positions[i + 1] = elevation * (1 - flatteningFactor);
  }

  // Compute normals for proper lighting
  geo.computeVertexNormals();

  // Cache the geometry
  geometryCache.set(cacheKey, geo.clone());

  // Limit cache size
  if (geometryCache.size > 10) {
    const firstKey = geometryCache.keys().next().value;
    const oldGeo = geometryCache.get(firstKey);
    oldGeo?.dispose();
    geometryCache.delete(firstKey);
  }

  return geo;
}

export function TerrainLOD({ locations, roads }: TerrainLODProps) {
  const { isPlacingBuilding, addBuilding, weather } = useCityStore();
  const terrainRef = useRef<THREE.Mesh>(null);
  const [currentLOD, setCurrentLOD] = useState<'high' | 'medium' | 'low'>('high');

  // Generate cache key based on locations and roads
  const cacheKey = useMemo(
    () => `${locations.length}-${roads.length}-${currentLOD}`,
    [locations.length, roads.length, currentLOD]
  );

  // Memoize terrain geometry with LOD
  const geometry = useMemo(() => {
    const config = LOD_CONFIGS[currentLOD];
    return generateTerrainGeometry(
      config.size,
      config.segments,
      locations,
      roads,
      cacheKey
    );
  }, [locations, roads, cacheKey, currentLOD]);

  // Dynamic LOD based on camera distance
  useFrame(({ camera }) => {
    if (!terrainRef.current) return;

    const distance = camera.position.length();

    let newLOD: 'high' | 'medium' | 'low';
    if (distance < 30) {
      newLOD = 'high';
    } else if (distance < 60) {
      newLOD = 'medium';
    } else {
      newLOD = 'low';
    }

    if (newLOD !== currentLOD) {
      setCurrentLOD(newLOD);
    }
  });

  const handleTerrainClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!isPlacingBuilding) return;

      event.stopPropagation();
      const point = event.point;
      const name = `New Building at (${point.x.toFixed(1)}, ${point.z.toFixed(1)})`;
      addBuilding([point.x, 0, point.z], name);
    },
    [isPlacingBuilding, addBuilding]
  );

  // Terrain color based on weather
  const terrainProps = useMemo(() => {
    if (weather === 'snow') {
      return {
        color: '#e2e8f0',
        roughness: 0.9,
        metalness: 0.1,
      };
    } else if (weather === 'rain') {
      return {
        color: '#3d7260',
        roughness: 0.6,
        metalness: 0.3,
      };
    } else {
      return {
        color: '#4a9375',
        roughness: 0.8,
        metalness: 0.2,
      };
    }
  }, [weather]);

  return (
    <group>
      {/* Main terrain with LOD */}
      <mesh
        ref={terrainRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
        onClick={handleTerrainClick}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color={terrainProps.color}
          roughness={terrainProps.roughness}
          metalness={terrainProps.metalness}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Base ground plane (extends beyond terrain) */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial
          color={weather === 'snow' ? '#d1d5db' : '#3d7260'}
          roughness={1}
          metalness={0}
          envMapIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// Cleanup function to clear geometry cache
export function clearTerrainCache() {
  geometryCache.forEach(geo => geo.dispose());
  geometryCache.clear();
}
