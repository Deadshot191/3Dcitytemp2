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
  const { weather } = useCityStore();

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

  // Determine road surface properties based on weather
  const getRoadSurfaceProps = (roadType: 'main' | 'secondary' | 'residential') => {
    const baseColors = {
      main: '#0f172a',
      secondary: '#334155',
      residential: '#64748b'
    };
    
    if (weather === 'rain') {
      return {
        color: baseColors[roadType],
        opacity: 0.9
      };
    } else if (weather === 'snow') {
      return {
        color: roadType === 'main' ? '#334155' : '#64748b',
        opacity: 0.8
      };
    } else {
      return {
        color: baseColors[roadType],
        opacity: 1.0
      };
    }
  };

  // Enhanced roundabout component
  const Roundabout = ({ position, size = 2.5 }) => {
    return (
      <group position={[position[0], position[1], position[2]]}>
        {/* Main roundabout circle */}
        <Circle args={[size]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <meshStandardMaterial 
            color="#1e293b"
            roughness={0.6}
            metalness={0.4}
          />
        </Circle>
        
        {/* Inner traffic circle */}
        <Circle args={[size - 0.8]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <meshStandardMaterial 
            color="#475569"
            roughness={0.7}
            metalness={0.3}
          />
        </Circle>
        
        {/* Center island with landscaping */}
        <group position={[0, 0.07, 0]}>
          <Circle args={[size - 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#4ade80" />
          </Circle>
        </group>
      </group>
    );
  };

  return (
    <>
      {/* Road surfaces */}
      {roads.map((road) => {
        const fromLocation = locations.find(loc => loc.id === road.from);
        const toLocation = locations.find(loc => loc.id === road.to);

        if (!fromLocation || !toLocation) return null;

        const splinePoints = generateSplinePoints(
          fromLocation.position,
          toLocation.position,
          road.type
        );

        const curve = new CatmullRomCurve3(splinePoints);
        const curvePoints = curve.getPoints(50);

        // Road width based on type
        const width = road.type === 'main' ? 2.5 : 
                     road.type === 'secondary' ? 2 : 1.5;
                     
        const surfaceProps = getRoadSurfaceProps(road.type);

        return (
          <group key={`road-${road.id}`}>
            {/* Road surface */}
            <Line
              points={curvePoints}
              color={surfaceProps.color}
              lineWidth={width}
              position={[0, 0.05, 0]}
            />
            
            {/* Road markings */}
            {road.type === 'main' && (
              <>
                {/* Center line */}
                <Line
                  points={curvePoints}
                  color="#ffffff"
                  lineWidth={0.2}
                  dashed
                  dashScale={10}
                  dashSize={2}
                  gapSize={1}
                  position={[0, 0.06, 0]}
                />
              </>
            )}
            
            {/* Road shadows */}
            <Line
              points={curvePoints}
              color="#000000"
              lineWidth={width + 0.3}
              transparent
              opacity={0.2}
              position={[0, 0.04, 0]}
            />
          </group>
        );
      })}

      {/* Roundabouts at major intersections */}
      {locations.map((location) => {
        const connectedMainRoads = roads.filter(
          road => (road.from === location.id || road.to === location.id) && road.type === 'main'
        );
        
        if (connectedMainRoads.length >= 2) {
          return (
            <Roundabout
              key={`roundabout-${location.id}`}
              position={location.position}
              size={3}
            />
          );
        }
        return null;
      })}
    </>
  );
}