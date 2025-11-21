import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useCityStore } from '../../store/cityStore';
import * as THREE from 'three';
import { Location, Road } from '../../types/city';
import { createMergedRoadGeometry, createMergedRoundaboutGeometry } from '../../utils/mergeGeometries';

interface RoadsLayerProps {
  locations: Location[];
  roads: Road[];
}

export function RoadsLayer({ locations, roads }: RoadsLayerProps) {
  const { weather, viewMode } = useCityStore();

  // Generate spline points for roads
  const generateSplinePoints = (
    start: [number, number, number],
    end: [number, number, number],
    type: 'main' | 'secondary' | 'residential'
  ) => {
    const points: THREE.Vector3[] = [];
    const segments = type === 'main' ? 12 : type === 'secondary' ? 8 : 6;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = start[0] + (end[0] - start[0]) * t;
      const currentZ = start[2] + (end[2] - start[2]) * t;
      
      let y = 0.1; // Slight elevation above terrain
      
      // Add natural variation for non-main roads
      const variation = type === 'residential' ? 0.2 : type === 'secondary' ? 0.1 : 0;
      const offsetX = (Math.random() - 0.5) * variation;
      const offsetZ = (Math.random() - 0.5) * variation;
      
      // Calculate midpoint influence for more natural curves
      const midpointInfluence = Math.sin(t * Math.PI) * (type === 'residential' ? 0.8 : 0.4);
      
      // Add perpendicular offset for more natural curves
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const length = Math.sqrt(dx * dx + dz * dz);
      const perpX = -dz / length * midpointInfluence;
      const perpZ = dx / length * midpointInfluence;
      
      points.push(new THREE.Vector3(
        x + offsetX + perpX,
        y,
        currentZ + offsetZ + perpZ
      ));
    }
    
    return points;
  };

  // Determine road surface color based on weather
  const getRoadColor = (roadType: 'main' | 'secondary' | 'residential') => {
    const baseColors = {
      main: new THREE.Color('#0f172a'),
      secondary: new THREE.Color('#334155'),
      residential: new THREE.Color('#64748b')
    };
    
    if (weather === 'rain') {
      return baseColors[roadType].multiplyScalar(0.9);
    } else if (weather === 'snow') {
      return baseColors[roadType].lerp(new THREE.Color('#ffffff'), 0.2);
    }
    return baseColors[roadType];
  };

  // Create merged road geometry - OPTIMIZATION: Single draw call for all roads
  const { mainRoadGeometry, secondaryRoadGeometry, residentialRoadGeometry } = useMemo(() => {
    const mainSegments: Array<{ points: THREE.Vector3[]; width: number; color: THREE.Color }> = [];
    const secondarySegments: Array<{ points: THREE.Vector3[]; width: number; color: THREE.Color }> = [];
    const residentialSegments: Array<{ points: THREE.Vector3[]; width: number; color: THREE.Color }> = [];

    roads.forEach((road) => {
      const fromLocation = locations.find(loc => loc.id === road.from);
      const toLocation = locations.find(loc => loc.id === road.to);
      
      if (!fromLocation || !toLocation) return;

      const splinePoints = generateSplinePoints(
        fromLocation.position,
        toLocation.position,
        road.type
      );

      const width = road.type === 'main' ? 2.5 : 
                   road.type === 'secondary' ? 2 : 1.5;

      const segment = {
        points: splinePoints,
        width,
        color: getRoadColor(road.type)
      };

      if (road.type === 'main') {
        mainSegments.push(segment);
      } else if (road.type === 'secondary') {
        secondarySegments.push(segment);
      } else {
        residentialSegments.push(segment);
      }
    });

    return {
      mainRoadGeometry: createMergedRoadGeometry(mainSegments),
      secondaryRoadGeometry: createMergedRoadGeometry(secondarySegments),
      residentialRoadGeometry: createMergedRoadGeometry(residentialSegments)
    };
  }, [locations, roads, weather]);

  // Create merged roundabout geometry - OPTIMIZATION: Single draw call
  const roundaboutData = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    
    locations.forEach((location) => {
      const connectedMainRoads = roads.filter(
        road => (road.from === location.id || road.to === location.id) && road.type === 'main'
      );
      
      if (connectedMainRoads.length >= 2) {
        positions.push(new THREE.Vector3(location.position[0], 0, location.position[2]));
      }
    });

    return {
      positions,
      geometry: createMergedRoundaboutGeometry(positions, 3)
    };
  }, [locations, roads]);

  return (
    <>
      {/* Merged main roads - SINGLE DRAW CALL */}
      {mainRoadGeometry && (
        <mesh geometry={mainRoadGeometry} position={[0, 0.05, 0]} receiveShadow>
          <meshStandardMaterial 
            color={getRoadColor('main')}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* Merged secondary roads - SINGLE DRAW CALL */}
      {secondaryRoadGeometry && (
        <mesh geometry={secondaryRoadGeometry} position={[0, 0.05, 0]} receiveShadow>
          <meshStandardMaterial 
            color={getRoadColor('secondary')}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* Merged residential roads - SINGLE DRAW CALL */}
      {residentialRoadGeometry && (
        <mesh geometry={residentialRoadGeometry} position={[0, 0.05, 0]} receiveShadow>
          <meshStandardMaterial 
            color={getRoadColor('residential')}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* Merged roundabouts - SINGLE DRAW CALL */}
      {roundaboutData.geometry && (
        <group>
          {/* Main roundabout circle */}
          <mesh geometry={roundaboutData.geometry} receiveShadow>
            <meshStandardMaterial 
              color="#1e293b"
              roughness={0.6}
              metalness={0.4}
            />
          </mesh>
          
          {/* Center islands */}
          {roundaboutData.positions.map((position, i) => (
            <mesh 
              key={`island-${i}`} 
              position={[position.x, 0.07, position.z]} 
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[1.4, 32]} />
              <meshStandardMaterial color="#4ade80" />
            </mesh>
          ))}
        </group>
      )}

      {/* Road markings (kept as lines for dashed effect) */}
      {roads.filter(r => r.type === 'main').map((road) => {
        const fromLocation = locations.find(loc => loc.id === road.from);
        const toLocation = locations.find(loc => loc.id === road.to);
        
        if (!fromLocation || !toLocation) return null;

        const splinePoints = generateSplinePoints(
          fromLocation.position,
          toLocation.position,
          road.type
        );
        
        const curve = new THREE.CatmullRomCurve3(splinePoints);
        const curvePoints = curve.getPoints(50);

        return (
          <Line
            key={`marking-${road.id}`}
            points={curvePoints}
            color="#ffffff"
            lineWidth={0.2}
            dashed
            dashScale={10}
            dashSize={2}
            gapSize={1}
            position={[0, 0.11, 0]}
          />
        );
      })}
    </>
  );
}