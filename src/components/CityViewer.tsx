import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CityScene } from './CityScene';
import { CityControls } from './CityControls';
import { BuildingPlacement } from './BuildingPlacement';
import { LocationInfo } from './LocationInfo';
import { SectorSelector } from './SectorSelector';
import { SectorAnalytics } from './SectorAnalytics';
import { LocationComments } from './LocationComments';
import { MiniMap } from './MiniMap';
import { DarkModeToggle } from './DarkModeToggle';
import { CameraUIControls } from './CameraUIControls';
import { ArrowLeft, Loader2, Layers, BarChart3, MessageCircle } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useCityStore } from '../store/cityStore';
import { cityPlanningData } from '../data/cityPlanningData';
import { corporateCampusData } from '../data/corporateCampusData';

export function CityViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, fetchProjects, updateProject } = useProjectStore();
  const { locations: userLocations, roads: userRoads, fetchProjectData, loading, selectedLocation } = useCityStore();
  const [showSectorPanel, setShowSectorPanel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsLocationId, setCommentsLocationId] = useState<string | null>(null);
  
  // Memoize project to prevent unnecessary re-renders
  const project = useMemo(() => 
    projects.find(p => p.id === id), 
  [projects, id]);

  // Memoize active sectors based on project id and sectors
  const activeSectors = useMemo(() => 
    project?.sectors || [], 
  [project?.sectors]);

  // Initial data fetching
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (id) {
      fetchProjectData(id);
    }
  }, [id, fetchProjectData]);

  // Memoize template data based on project type
  const templateData = useMemo(() => {
    if (!project) return null;
    return project.model_type === 'planning' ? cityPlanningData : corporateCampusData;
  }, [project?.model_type]);

  // Memoize combined locations and roads
  const { combinedLocations, combinedRoads } = useMemo(() => {
    if (!project || !userLocations || !userRoads || !templateData) {
      return { combinedLocations: [], combinedRoads: [] };
    }

    // Get template locations for selected sectors
    const templateLocations = templateData.locations.filter(
      location => activeSectors.includes(location.zone || '')
    );

    // Get user locations for selected sectors
    const filteredUserLocations = userLocations.filter(
      location => activeSectors.includes(location.zone || '')
    );

    // Combine template and user locations
    const allLocations = [...templateLocations, ...filteredUserLocations];

    // Create a set of valid location IDs
    const validLocationIds = new Set([
      ...templateLocations.map(loc => loc.id),
      ...filteredUserLocations.map(loc => loc.id)
    ]);

    // Filter template roads
    const templateRoads = templateData.roads.filter(road =>
      validLocationIds.has(road.from) && validLocationIds.has(road.to)
    );

    // Filter user roads
    const filteredUserRoads = userRoads.filter(road =>
      validLocationIds.has(road.from) && validLocationIds.has(road.to)
    );

    // Combine template and user roads
    const allRoads = [...templateRoads, ...filteredUserRoads];

    return {
      combinedLocations: allLocations,
      combinedRoads: allRoads
    };
  }, [project?.id, userLocations, userRoads, templateData, activeSectors]);

  if (!project || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  const handleSectorChange = async (sectors: string[]) => {
    if (project) {
      await updateProject(project.id, {
        sectors,
        updated_at: new Date().toISOString()
      });
    }
  };

  const handleLocationComments = (locationId: string) => {
    setCommentsLocationId(locationId);
    setShowComments(true);
  };

  return (
    <div id="city-viewer-container" className="h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Projects
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{project.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {project.model_type === 'planning' ? 'City Planning' : 'Corporate Campus'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DarkModeToggle />
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                  showAnalytics
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500`}
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Analytics
              </button>
              {selectedLocation && (
                <button
                  onClick={() => handleLocationComments(selectedLocation.id)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Comments
                </button>
              )}
              <button
                onClick={() => setShowSectorPanel(!showSectorPanel)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
              >
                <Layers className="h-5 w-5 mr-2" />
                Sectors
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-grow relative">
        {showAnalytics ? (
          <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Project Analytics</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Detailed insights into sector performance, usage patterns, and city metrics
                </p>
              </div>
              <SectorAnalytics 
                locations={combinedLocations}
                roads={combinedRoads}
                activeSectors={activeSectors}
                modelType={project.model_type}
              />
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <CityScene locations={combinedLocations} roads={combinedRoads} />
            <CameraUIControls />
            <CityControls />
            <BuildingPlacement />
            <LocationInfo />
            <MiniMap 
              locations={combinedLocations} 
              roads={combinedRoads}
              viewPosition={[0, 20, 0]} // This would come from camera position in a real implementation
            />
          </div>
        )}
        
        {showSectorPanel && (
          <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg dark:shadow-gray-900/20 w-80 border border-gray-200 dark:border-gray-700 z-10">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Active Sectors</h3>
            <SectorSelector
              modelType={project.model_type}
              selectedSectors={activeSectors}
              onChange={handleSectorChange}
              compact
            />
          </div>
        )}
      </div>

      {/* Comments Modal */}
      {showComments && commentsLocationId && selectedLocation && (
        <LocationComments
          locationId={commentsLocationId}
          locationName={selectedLocation.name}
          onClose={() => {
            setShowComments(false);
            setCommentsLocationId(null);
          }}
        />
      )}
    </div>
  );
}