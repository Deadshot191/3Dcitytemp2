import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh } from '@react-three/drei';
import { useCityStore } from '../../store/cityStore';
import { Location, Road } from '../../types/city';
import * as THREE from 'three';

interface InstancedTrafficProps {
  locations: Location[];
  roads: Road[];
}

// Vehicle pool for efficient reuse
class VehiclePool {
  private vehicles: Array<{
    position: THREE.Vector3;
    rotation: number;
    speed: number;
    pathIndex: number;
    pathProgress: number;
    type: 'car' | 'bus' | 'truck';
    active: boolean;
  }> = [];

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      this.vehicles.push({
        position: new THREE.Vector3(),
        rotation: 0,
        speed: 0.05 + Math.random() * 0.05,
        pathIndex: 0,
        pathProgress: Math.random(),
        type: Math.random() < 0.7 ? 'car' : Math.random() < 0.5 ? 'bus' : 'truck',
        active: false
      });
    }
  }

  getVehicles() {
    return this.vehicles;
  }

  activateVehicle(index: number, pathIndex: number) {
    if (this.vehicles[index]) {
      this.vehicles[index].active = true;
      this.vehicles[index].pathIndex = pathIndex;
      this.vehicles[index].pathProgress = Math.random();
    }
  }

  deactivateVehicle(index: number) {
    if (this.vehicles[index]) {
      this.vehicles[index].active = false;
    }
  }
}

export function InstancedTraffic({ locations, roads }: InstancedTrafficProps) {
  const { timeOfDay, viewMode } = useCityStore();
  const carMeshRef = useRef<THREE.InstancedMesh>(null);
  const busMeshRef = useRef<THREE.InstancedMesh>(null);
  const truckMeshRef = useRef<THREE.InstancedMesh>(null);

  // Create vehicle pool
  const vehiclePool = useMemo(() => new VehiclePool(200), []);

  // Generate traffic paths with caching
  const trafficPaths = useMemo(() => {
    return roads.map(road => {
      const from = locations.find(l => l.id === road.from);
      const to = locations.find(l => l.id === road.to);
      
      if (!from || !to) return null;
      
      const points = [
        new THREE.Vector3(...from.position),
        new THREE.Vector3(...to.position)
      ];
      
      return {
        curve: new THREE.CatmullRomCurve3(points),
        type: road.type,
        length: from.position[0] - to.position[0] + from.position[2] - to.position[2]
      };
    }).filter(Boolean);
  }, [roads, locations]);

  // Calculate traffic density based on time
  const trafficDensity = useMemo(() => {
    const hour = timeOfDay;
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
      return 1.5; // Rush hour
    }
    if (hour >= 9 && hour <= 16) {
      return 1.0; // Business hours
    }
    if (hour >= 23 || hour <= 5) {
      return 0.3; // Night
    }
    return 0.7; // Default
  }, [timeOfDay]);

  // Temporary matrices for instancing
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempPosition = useMemo(() => new THREE.Vector3(), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const tempScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useFrame((state) => {
    const vehicles = vehiclePool.getVehicles();
    let carCount = 0;
    let busCount = 0;
    let truckCount = 0;

    vehicles.forEach((vehicle, index) => {
      if (!vehicle.active || !trafficPaths[vehicle.pathIndex]) return;

      const path = trafficPaths[vehicle.pathIndex];
      
      // Update vehicle position along path
      vehicle.pathProgress += vehicle.speed * state.clock.getDelta() * trafficDensity;
      if (vehicle.pathProgress > 1) {
        vehicle.pathProgress = 0;
        // Optionally switch to a different path
        vehicle.pathIndex = Math.floor(Math.random() * trafficPaths.length);
      }

      // Get position and direction from curve
      const currentPoint = path.curve.getPointAt(vehicle.pathProgress);
      const nextPoint = path.curve.getPointAt(Math.min(vehicle.pathProgress + 0.01, 1));
      
      vehicle.position.copy(currentPoint);
      vehicle.position.y += 0.2; // Lift above ground
      
      // Calculate rotation
      const direction = nextPoint.clone().sub(currentPoint).normalize();
      vehicle.rotation = Math.atan2(direction.x, direction.z);

      // Set matrix for instanced mesh
      tempPosition.copy(vehicle.position);
      tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), vehicle.rotation);
      
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

      // Apply to appropriate mesh based on vehicle type
      if (vehicle.type === 'car' && carMeshRef.current) {
        carMeshRef.current.setMatrixAt(carCount, tempMatrix);
        carCount++;
      } else if (vehicle.type === 'bus' && busMeshRef.current) {
        busMeshRef.current.setMatrixAt(busCount, tempMatrix);
        busCount++;
      } else if (vehicle.type === 'truck' && truckMeshRef.current) {
        truckMeshRef.current.setMatrixAt(truckCount, tempMatrix);
        truckCount++;
      }
    });

    // Update instance matrices
    if (carMeshRef.current) {
      carMeshRef.current.instanceMatrix.needsUpdate = true;
      carMeshRef.current.count = carCount;
    }
    if (busMeshRef.current) {
      busMeshRef.current.instanceMatrix.needsUpdate = true;
      busMeshRef.current.count = busCount;
    }
    if (truckMeshRef.current) {
      truckMeshRef.current.instanceMatrix.needsUpdate = true;
      truckMeshRef.current.count = truckCount;
    }
  });

  // Activate vehicles based on traffic density
  useMemo(() => {
    const vehicles = vehiclePool.getVehicles();
    const activeCount = Math.floor(vehicles.length * trafficDensity * 0.5);
    
    vehicles.forEach((vehicle, index) => {
      if (index < activeCount) {
        vehiclePool.activateVehicle(index, Math.floor(Math.random() * trafficPaths.length));
      } else {
        vehiclePool.deactivateVehicle(index);
      }
    });
  }, [trafficDensity, trafficPaths.length, vehiclePool]);

  return (
    <>
      {/* Instanced Cars */}
      <instancedMesh ref={carMeshRef} args={[undefined, undefined, 100]} castShadow>
        <boxGeometry args={[0.8, 0.4, 0.4]} />
        <meshStandardMaterial color="#ff4444" metalness={0.6} roughness={0.4} />
      </instancedMesh>

      {/* Instanced Buses */}
      <instancedMesh ref={busMeshRef} args={[undefined, undefined, 30]} castShadow>
        <boxGeometry args={[1.2, 0.6, 0.4]} />
        <meshStandardMaterial color="#4a90e2" metalness={0.6} roughness={0.4} />
      </instancedMesh>

      {/* Instanced Trucks */}
      <instancedMesh ref={truckMeshRef} args={[undefined, undefined, 50]} castShadow>
        <boxGeometry args={[1.0, 0.5, 0.4]} />
        <meshStandardMaterial color="#8b572a" metalness={0.6} roughness={0.4} />
      </instancedMesh>
    </>
  );
}