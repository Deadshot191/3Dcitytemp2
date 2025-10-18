import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Preload } from '@react-three/drei';
import { Suspense, lazy } from 'react';
import { Location, Road } from '../types/city';
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
const WeatherOptimized = lazy(() => import('./optimized/WeatherOptimized').then(m => ({ default: m.WeatherOptimized })));
const TerrainLOD = lazy(() => import('./optimized/TerrainLOD').then(m => ({ default: m.TerrainLOD })));

interface CitySceneProps {
  locations: Location[];
  roads: Road[];
}

function SceneContent({ locations, roads }: CitySceneProps) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera 
        makeDefault 
        position={[20, 20, 20]} 
        fov={75}
        near={0.1}
        far={1000}
      />
      
      {/* Enhanced Camera Controls - Load First */}
      <Suspense fallback={null}>
        <SmoothCameraControls />
      </Suspense>
      
      {/* Core Scene - Priority Loading */}
      <Suspense fallback={null}>
        <FrustumCulling locations={locations}>
          {/* Environment layer - lighting, sky, fog */}
          <EnvironmentLayer />
          
          {/* Terrain base with LOD */}
          <TerrainLOD locations={locations} roads={roads} />
          
          {/* Buildings layer - critical */}
          <BuildingsLayer locations={locations} />
          
          {/* Roads layer - spline-based roads */}
          <RoadsLayer locations={locations} roads={roads} />
        </FrustumCulling>
      </Suspense>
      
      {/* Secondary Scene Elements - Deferred Loading */}
      <Suspense fallback={null}>
        <FrustumCulling locations={locations}>
          {/* Optimized instanced elements - single draw calls */}
          <InstancedStreetAssets locations={locations} roads={roads} />
          <InstancedVehicles locations={locations} roads={roads} />
          <InstancedVegetation locations={locations} roads={roads} />
        </FrustumCulling>
      </Suspense>
      
      {/* Weather Effects - Load Last */}
      <Suspense fallback={null}>
        <WeatherOptimized locations={locations} />
      </Suspense>
      
      {/* UI Layer - Load After Scene */}
      <Suspense fallback={null}>
        <UILayer locations={locations} />
      </Suspense>
      
      {/* Post-Processing - Load Last */}
      <Suspense fallback={null}>
        <EnhancedPostProcessing />
      </Suspense>
      
      {/* Preload critical assets */}
      <Preload all />
    </>
  );
}

export function CityScene({ locations, roads }: CitySceneProps) {
  return (
    <Canvas 
      shadows
      gl={{ 
        antialias: false, // Disable for better performance, SMAA will handle it
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
        // Shadow mapping
        shadowMap: {
          enabled: true,
          type: THREE.PCFShadowMap, // Faster than PCFSoft
          autoUpdate: false // Manual update for better control
        },
        // Pixel ratio optimization
        pixelRatio: Math.min(window.devicePixelRatio, 1.5), // Cap at 1.5 for performance
        // Color space
        outputColorSpace: THREE.SRGBColorSpace,
        // Tone mapping
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0
      }}
      camera={{ fov: 75, near: 0.1, far: 500 }} // Reduced far plane
      performance={{ min: 0.5 }}
      dpr={[1, 1.5]} // Cap device pixel ratio
      frameloop="always" // Changed from "demand" for smoother experience
    >
      <SceneContent locations={locations} roads={roads} />
    </Canvas>
  );
}