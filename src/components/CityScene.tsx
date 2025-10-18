import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Preload } from '@react-three/drei';
import { Suspense, lazy } from 'react';
import { Location, Road } from '../types/city';
import { LoadingFallback } from './LoadingManager';
import * as THREE from 'three';

// Lazy load components for better initial load time
const EnvironmentLayer = lazy(() => import('./layers/Environment').then(m => ({ default: m.EnvironmentLayer })));
const BuildingsLayer = lazy(() => import('./layers/Buildings').then(m => ({ default: m.BuildingsLayer })));
const RoadsLayer = lazy(() => import('./layers/Roads').then(m => ({ default: m.RoadsLayer })));
const UILayer = lazy(() => import('./layers/UI').then(m => ({ default: m.UILayer })));
const SmoothCameraControls = lazy(() => import('./optimized/SmoothCameraControls').then(m => ({ default: m.SmoothCameraControls })));
const EnhancedPostProcessing = lazy(() => import('./optimized/EnhancedPostProcessing').then(m => ({ default: m.EnhancedPostProcessing })));
const FrustumCulling = lazy(() => import('./optimized/FrustumCulling').then(m => ({ default: m.FrustumCulling })));
const InstancedStreetAssets = lazy(() => import('./optimized/InstancedStreetAssets').then(m => ({ default: m.InstancedStreetAssets })));
const InstancedVehicles = lazy(() => import('./optimized/InstancedVehicles').then(m => ({ default: m.InstancedVehicles })));
const InstancedVegetation = lazy(() => import('./optimized/InstancedVegetation').then(m => ({ default: m.InstancedVegetation })));
const Weather = lazy(() => import('./Weather').then(m => ({ default: m.Weather })));
const TerrainLOD = lazy(() => import('./optimized/TerrainLOD').then(m => ({ default: m.TerrainLOD })));

interface CitySceneProps {
  locations: Location[];
  roads: Road[];
}

function SceneContent({ locations, roads }: CitySceneProps) {
  return (
    <Suspense fallback={null}>
      {/* Camera */}
      <PerspectiveCamera 
        makeDefault 
        position={[20, 20, 20]} 
        fov={75}
        near={0.1}
        far={1000}
      />
      
      {/* Enhanced Camera Controls */}
      <SmoothCameraControls />
      
      {/* Frustum Culling Wrapper */}
      <FrustumCulling locations={locations}>
        {/* Environment layer - lighting, sky, fog */}
        <EnvironmentLayer />
        
        {/* Terrain base */}
        <Terrain locations={locations} roads={roads} />
        
        {/* Buildings layer - back to original with optimizations */}
        <BuildingsLayer locations={locations} />
        
        {/* Roads layer - spline-based roads */}
        <RoadsLayer locations={locations} roads={roads} />
        
        {/* Optimized instanced elements - single draw calls */}
        <InstancedStreetAssets locations={locations} roads={roads} />
        <InstancedVehicles locations={locations} roads={roads} />
        <InstancedVegetation locations={locations} roads={roads} />
        <Weather locations={locations} />
        
        {/* UI layer - tooltips and overlays */}
        <UILayer locations={locations} />
      </FrustumCulling>
      
      {/* Minimal Post-Processing */}
      <EnhancedPostProcessing />
    </Suspense>
  );
}

export function CityScene({ locations, roads }: CitySceneProps) {
  return (
    <Canvas 
      shadows
      gl={{ 
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        physicallyCorrectLights: true,
        // Enable shadow mapping
        shadowMap: {
          enabled: true,
          type: THREE.PCFSoftShadowMap
        },
        // Fix blurriness with proper pixel ratio
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        // Ensure proper color space
        outputColorSpace: THREE.SRGBColorSpace,
        // Improve rendering quality
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0
      }}
      camera={{ fov: 75, near: 0.1, far: 1000 }}
      performance={{ min: 0.5 }}
      dpr={[1, 2]}
      frameloop="demand" // Only render when needed
    >
      <SceneContent locations={locations} roads={roads} />
    </Canvas>
  );
}