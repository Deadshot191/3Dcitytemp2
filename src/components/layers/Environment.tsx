import { useRef, useMemo, memo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Environment } from '@react-three/drei';
import { useCityStore } from '../../store/cityStore';
import { OptimizedLighting } from '../optimized/OptimizedLighting';
import * as THREE from 'three';

// Memoize environment layer to prevent unnecessary re-renders
export const EnvironmentLayer = memo(function EnvironmentLayer() {
  const { timeOfDay, weather } = useCityStore();
  const { scene } = useThree();
  const isNight = timeOfDay < 6 || timeOfDay > 18;

  // Sun position calculation
  const sunPosition = useMemo(() => {
    const angle = (timeOfDay - 12) * (Math.PI / 12);
    return [
      Math.cos(angle) * 100,
      Math.sin(angle) * 100,
      0
    ] as [number, number, number];
  }, [timeOfDay]);

  // Sky parameters
  const skyParams = useMemo(() => {
    if (isNight) {
      return {
        turbidity: 0.1,
        rayleigh: 0.3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
      };
    }
    
    const hour = timeOfDay % 24;
    const isSunrise = hour >= 5 && hour <= 7;
    const isSunset = hour >= 17 && hour <= 19;
    
    if (isSunrise || isSunset) {
      return {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.1,
        mieDirectionalG: 0.6,
      };
    }
    
    return {
      turbidity: 6,
      rayleigh: 1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
    };
  }, [timeOfDay, isNight]);

  // Fog parameters
  const fogParams = useMemo(() => {
    let color = isNight ? '#001122' : '#ffffff';
    let near = 10;
    let far = 200;
    
    if (weather === 'rain') {
      color = '#8ca9c0';
      near = 5;
      far = 100;
    } else if (weather === 'snow') {
      color = '#e5e7eb';
      near = 8;
      far = 150;
    }
    
    return { color, near, far };
  }, [weather, isNight]);

  // Apply fog (optimized - only when params change)
  useFrame(() => {
    if (scene.fog) {
      const fog = scene.fog as THREE.Fog;
      fog.color.setStyle(fogParams.color);
      fog.near = fogParams.near;
      fog.far = fogParams.far;
    } else {
      scene.fog = new THREE.Fog(fogParams.color, fogParams.near, fogParams.far);
    }
  });

  return (
    <>
      {/* Optimized lighting system */}
      <OptimizedLighting />
      
      {/* Atmospheric effects */}
      {isNight ? (
        <>
          <Stars 
            radius={300} 
            depth={100} 
            count={5000} // Reduced from 8000
            factor={6} 
            fade 
            speed={0.5}
          />
          <Environment preset="night" />
        </>
      ) : (
        <>
          <Sky 
            {...skyParams}
            sunPosition={sunPosition} 
          />
          <Environment 
            preset={weather === 'rain' ? 'city' : 'sunset'} 
            resolution={256} // Lower resolution for better performance
          />
        </>
      )}
    </>
  );
});