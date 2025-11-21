import { create } from 'zustand';
import { Location, Road } from '../types/city';
import { supabase } from '../lib/supabase';
import * as THREE from 'three';

type CameraPreset = 'isometric' | 'aerial' | 'walkthrough' | 'free';
type ViewMode = 'Realistic' | 'Planning' | 'Traffic';

interface CameraState {
  preset: CameraPreset;
  isAnimating: boolean;
  camera: THREE.Camera | null;
  controls: any | null;
}

interface CityStore {
  selectedLocation: Location | null;
  setSelectedLocation: (location: Location | null) => void;
  locations: Location[];
  setLocations: (locations: Location[]) => void;
  roads: Road[];
  setRoads: (roads: Road[]) => void;
  timeOfDay: number;
  setTimeOfDay: (time: number | ((prev: number) => number)) => void;
  weather: 'clear' | 'rain' | 'snow';
  setWeather: (weather: 'clear' | 'rain' | 'snow') => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isPlacingBuilding: boolean;
  setIsPlacingBuilding: (isPlacing: boolean) => void;
  buildingTypeToPlace: Location['type'] | null;
  setBuildingTypeToPlace: (type: Location['type'] | null) => void;
  addBuilding: (position: [number, number, number], name: string) => Promise<void>;
  fetchProjectData: (projectId: string) => Promise<void>;
  loading: boolean;
  // Camera animation state
  cameraTarget: [number, number, number] | null;
  setCameraTarget: (target: [number, number, number] | null) => void;
  flyToLocation: (location: Location) => void;
  // Camera controls state
  cameraState: CameraState;
  setCameraRefs: (camera: THREE.Camera, controls: any) => void;
  animateToPreset: (preset: CameraPreset) => void;
  flyToCameraLocation: (position: [number, number, number]) => void;
}

export const useCityStore = create<CityStore>((set, get) => ({
  selectedLocation: null,
  setSelectedLocation: (location) => {
    set({ selectedLocation: location });
    // Auto fly-to when selecting a location
    if (location) {
      get().flyToLocation(location);
    }
  },
  locations: [],
  setLocations: (locations) => set({ locations }),
  roads: [],
  setRoads: (roads) => set({ roads }),
  timeOfDay: 12,
  setTimeOfDay: (time) => set((state) => ({
    timeOfDay: typeof time === 'function' ? time(state.timeOfDay) : time
  })),
  weather: 'clear',
  setWeather: (weather) => set({ weather }),
  viewMode: 'Realistic',
  setViewMode: (mode) => set({ viewMode: mode }),
  isPlacingBuilding: false,
  setIsPlacingBuilding: (isPlacing) => set({ isPlacingBuilding: isPlacing }),
  buildingTypeToPlace: null,
  setBuildingTypeToPlace: (type) => set({ buildingTypeToPlace: type }),
  loading: false,
  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),

  // Camera controls state
  cameraState: {
    preset: 'free',
    isAnimating: false,
    camera: null,
    controls: null
  },

  setCameraRefs: (camera, controls) => {
    set(state => ({
      cameraState: {
        ...state.cameraState,
        camera,
        controls
      }
    }));
  },

  flyToLocation: (location) => {
    const target: [number, number, number] = [
      location.position[0],
      location.position[1] + 5,
      location.position[2]
    ];
    set({ cameraTarget: target });
    // Clear target after animation
    setTimeout(() => set({ cameraTarget: null }), 2000);
  },

  animateToPreset: (newPreset: CameraPreset) => {
    const { cameraState } = get();
    if (cameraState.isAnimating || !cameraState.camera || !cameraState.controls) return;
    
    set(state => ({
      cameraState: {
        ...state.cameraState,
        isAnimating: true,
        preset: newPreset
      }
    }));

    // Camera preset positions and targets
    const presets = {
      isometric: {
        position: [30, 30, 30] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
        fov: 50
      },
      aerial: {
        position: [0, 80, 0] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
        fov: 60
      },
      walkthrough: {
        position: [0, 2, 10] as [number, number, number],
        target: [0, 2, 0] as [number, number, number],
        fov: 75
      },
      free: {
        position: [20, 20, 20] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
        fov: 75
      }
    };
    
    const targetPreset = presets[newPreset];
    const startPosition = cameraState.camera.position.clone();
    const startTarget = cameraState.controls.target.clone();
    const startFov = cameraState.camera.fov;
    
    let progress = 0;
    const duration = 2000; // 2 seconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate position
      cameraState.camera!.position.lerpVectors(
        startPosition,
        new THREE.Vector3(...targetPreset.position),
        eased
      );
      
      // Interpolate target
      if (cameraState.controls) {
        cameraState.controls.target.lerpVectors(
          startTarget,
          new THREE.Vector3(...targetPreset.target),
          eased
        );
      }
      
      // Interpolate FOV
      cameraState.camera!.fov = THREE.MathUtils.lerp(startFov, targetPreset.fov, eased);
      cameraState.camera!.updateProjectionMatrix();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        set(state => ({
          cameraState: {
            ...state.cameraState,
            isAnimating: false
          }
        }));
      }
    };
    
    animate();
  },

  flyToCameraLocation: (position: [number, number, number]) => {
    const { cameraState } = get();
    if (cameraState.isAnimating || !cameraState.camera || !cameraState.controls) return;
    
    set(state => ({
      cameraState: {
        ...state.cameraState,
        isAnimating: true
      }
    }));
    
    const startPosition = cameraState.camera.position.clone();
    const startTarget = cameraState.controls.target.clone();
    
    const targetPosition = new THREE.Vector3(
      position[0] + 10,
      position[1] + 10,
      position[2] + 10
    );
    const targetTarget = new THREE.Vector3(...position);
    
    let progress = 0;
    const duration = 1500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);
      
      const eased = 1 - Math.pow(1 - progress, 3);
      
      cameraState.camera!.position.lerpVectors(startPosition, targetPosition, eased);
      cameraState.controls.target.lerpVectors(startTarget, targetTarget, eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        set(state => ({
          cameraState: {
            ...state.cameraState,
            isAnimating: false
          }
        }));
      }
    };
    
    animate();
  },

  fetchProjectData: async (projectId: string) => {
    set({ loading: true });
    try {
      // Fetch locations
      const { data: locations, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (locationsError) throw locationsError;

      // Fetch roads
      const { data: roads, error: roadsError } = await supabase
        .from('roads')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (roadsError) throw roadsError;

      // Transform the data to match our types
      const transformedLocations = locations.map(loc => ({
        ...loc,
        position: loc.position as [number, number, number]
      }));

      const transformedRoads = roads.map(road => ({
        id: road.id,
        from: road.from_location,
        to: road.to_location,
        distance: road.distance,
        type: road.type
      }));

      set({
        locations: transformedLocations,
        roads: transformedRoads
      });
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      set({ loading: false });
    }
  },

  addBuilding: async (position: [number, number, number], name: string) => {
    const { buildingTypeToPlace, locations } = get();
    if (!buildingTypeToPlace) return;

    // For now, just add to local state (would need projectId for database)
    const newLocation: Location = {
      id: Date.now().toString(),
      name,
      type: buildingTypeToPlace,
      position,
      description: `New ${buildingTypeToPlace.toLowerCase()} in the city.`,
      color: '#60a5fa'
    };

    set({
      locations: [...locations, newLocation],
      isPlacingBuilding: false,
      buildingTypeToPlace: null
    });
  }
}));