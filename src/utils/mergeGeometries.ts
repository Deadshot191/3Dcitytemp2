import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';

/**
 * Creates merged geometry for roads to minimize draw calls
 */
export function createMergedRoadGeometry(
  roadSegments: Array<{
    points: THREE.Vector3[];
    width: number;
    color: THREE.Color;
  }>
): THREE.BufferGeometry | null {
  if (roadSegments.length === 0) return null;

  const geometries: THREE.BufferGeometry[] = [];

  roadSegments.forEach(segment => {
    const { points, width } = segment;
    
    // Create tube geometry for each road segment
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      Math.max(points.length * 2, 20), // segments
      width / 2, // radius
      8, // radial segments
      false // closed
    );
    
    // Rotate to lay flat
    tubeGeometry.rotateX(Math.PI / 2);
    
    geometries.push(tubeGeometry);
  });

  if (geometries.length === 0) return null;

  // Merge all road geometries into one
  return mergeBufferGeometries(geometries);
}

/**
 * Creates merged geometry for roundabouts
 */
export function createMergedRoundaboutGeometry(
  positions: THREE.Vector3[],
  size: number = 2.5
): THREE.BufferGeometry | null {
  if (positions.length === 0) return null;

  const geometries: THREE.BufferGeometry[] = [];

  positions.forEach(position => {
    const circleGeometry = new THREE.CircleGeometry(size, 32);
    circleGeometry.rotateX(-Math.PI / 2);
    circleGeometry.translate(position.x, position.y + 0.05, position.z);
    geometries.push(circleGeometry);
  });

  return mergeBufferGeometries(geometries);
}
