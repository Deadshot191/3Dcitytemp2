import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { 
  EffectComposer, 
  Bloom, 
  SMAA
} from '@react-three/postprocessing';
import { useCityStore } from '../../store/cityStore';
import * as THREE from 'three';

export function EnhancedPostProcessing() {
  const { timeOfDay, weather } = useCityStore();
  const { size, viewport } = useThree();
  const composerRef = useRef();

  const isNight = timeOfDay < 6 || timeOfDay > 18;

  // Optimized post-processing settings
  const effectSettings = useMemo(() => {
    let bloomIntensity = isNight ? 0.6 : 0.2; // Reduced intensity
    let bloomRadius = 0.15; // Smaller radius

    // Weather adjustments
    if (weather === 'rain') {
      bloomIntensity *= 0.8;
    } else if (weather === 'snow') {
      bloomIntensity *= 1.1;
    }

    return {
      bloom: {
        intensity: bloomIntensity,
        radius: bloomRadius,
        luminanceThreshold: 0.95, // Very high threshold
        luminanceSmoothing: 0.4
      }
    };
  }, [timeOfDay, weather, isNight]);

  // Adaptive quality settings based on viewport size
  const qualitySettings = useMemo(() => {
    const isLargeViewport = size.width > 1920;
    
    return {
      smaaPreset: isLargeViewport ? 'high' : 'medium', // Lower quality for smaller screens
      bloomResolution: isLargeViewport ? 512 : 256, // Adaptive resolution
      multisampling: isLargeViewport ? 4 : 0 // Reduce multisampling
    };
  }, [size.width]);

  return (
    <EffectComposer 
      ref={composerRef}
      multisampling={qualitySettings.multisampling}
      frameBufferType={THREE.HalfFloatType}
      stencilBuffer={false}
      depthBuffer={true}
      autoClear={true}
    >
      {/* Anti-aliasing */}
      <SMAA preset={qualitySettings.smaaPreset as any} />
      
      {/* Minimal bloom only for lights at night */}
      {isNight && (
        <Bloom
          intensity={effectSettings.bloom.intensity}
          radius={effectSettings.bloom.radius}
          luminanceThreshold={effectSettings.bloom.luminanceThreshold}
          luminanceSmoothing={effectSettings.bloom.luminanceSmoothing}
          mipmapBlur={false}
          resolutionX={qualitySettings.bloomResolution}
          resolutionY={qualitySettings.bloomResolution}
        />
      )}
    </EffectComposer>
  );
}