import { useRef, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useCityStore } from '../../store/cityStore';
import * as THREE from 'three';

export function OptimizedLighting() {
  const { timeOfDay, weather } = useCityStore();
  const { gl } = useThree();
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  
  const isNight = timeOfDay < 6 || timeOfDay > 18;
  
  // Optimize shadow map settings
  useEffect(() => {
    if (gl.shadowMap) {
      // Use PCF shadow map (lighter than PCFSoft)
      gl.shadowMap.type = THREE.PCFShadowMap;
      gl.shadowMap.autoUpdate = false; // Manual update for better control
      gl.shadowMap.needsUpdate = true;
    }
  }, [gl]);
  
  // Update shadows every few frames, not every frame
  useEffect(() => {
    const interval = setInterval(() => {
      if (gl.shadowMap) {
        gl.shadowMap.needsUpdate = true;
      }
    }, 100); // Update shadows every 100ms instead of every frame
    
    return () => clearInterval(interval);
  }, [gl]);

  // Optimize directional light shadow camera
  useEffect(() => {
    if (directionalLightRef.current?.shadow) {
      const shadow = directionalLightRef.current.shadow;
      
      // Reduce shadow map resolution for better performance
      shadow.mapSize.width = 1024; // Reduced from default 2048
      shadow.mapSize.height = 1024;
      
      // Optimize shadow camera frustum
      shadow.camera.left = -50;
      shadow.camera.right = 50;
      shadow.camera.top = 50;
      shadow.camera.bottom = -50;
      shadow.camera.near = 0.5;
      shadow.camera.far = 200;
      
      // Add shadow bias to prevent artifacts
      shadow.bias = -0.0001;
      shadow.normalBias = 0.02;
      
      shadow.camera.updateProjectionMatrix();
    }
  }, []);

  const lightColor = useMemo(() => {
    if (isNight) {
      return '#6b7280'; // Dim gray-blue for night
    } else if (weather === 'rain') {
      return '#b0c4de'; // Lightened steel blue
    } else if (weather === 'snow') {
      return '#e0f2fe'; // Light cyan
    }
    return '#ffffff'; // Bright white for clear day
  }, [isNight, weather]);

  const lightIntensity = useMemo(() => {
    if (isNight) return 0.3;
    if (weather === 'rain') return 0.7;
    if (weather === 'snow') return 0.9;
    return 1.5;
  }, [isNight, weather]);

  const ambientIntensity = useMemo(() => {
    if (isNight) return 0.2;
    if (weather === 'rain' || weather === 'snow') return 0.4;
    return 0.6;
  }, [isNight, weather]);

  return (
    <>
      {/* Ambient light - global illumination */}
      <ambientLight intensity={ambientIntensity} color={lightColor} />
      
      {/* Main directional light (sun/moon) with optimized shadows */}
      <directionalLight
        ref={directionalLightRef}
        position={[50, 50, 50]}
        intensity={lightIntensity}
        color={lightColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-bias={-0.0001}
      />
      
      {/* Hemisphere light for more natural lighting */}
      <hemisphereLight
        color={isNight ? '#1e3a8a' : '#87ceeb'} // Sky color
        groundColor={isNight ? '#1c1917' : '#8b7355'} // Ground color
        intensity={isNight ? 0.3 : 0.5}
      />
      
      {/* Additional night lights */}
      {isNight && (
        <>
          <pointLight position={[20, 10, 20]} intensity={0.5} color="#fbbf24" distance={50} />
          <pointLight position={[-20, 10, -20]} intensity={0.5} color="#fbbf24" distance={50} />
        </>
      )}
    </>
  );
}
