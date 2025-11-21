import { useMemo } from 'react';
import { Clock, Cloud, CloudSun, Sun, Moon, Eye } from 'lucide-react';
import { useCityStore } from '../store/cityStore';

export function CityControls() {
  const { timeOfDay, setTimeOfDay, weather, setWeather, viewMode, setViewMode } = useCityStore();

  const timeFormatted = useMemo(() => {
    const hours = Math.floor(timeOfDay);
    const minutes = Math.floor((timeOfDay % 1) * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }, [timeOfDay]);

  const isDaytime = timeOfDay >= 6 && timeOfDay <= 18;

  return (
    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700">
      <div className="space-y-4">
        {/* View Mode Control */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            View Mode
          </h3>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'Realistic' | 'Planning' | 'Traffic')}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="Realistic">Realistic</option>
            <option value="Planning">Planning</option>
            <option value="Traffic">Traffic</option>
          </select>
        </div>

        {/* Time Control */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time of Day
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="24"
              step="0.1"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
              className="w-32 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-sm font-mono text-gray-900 dark:text-white">{timeFormatted}</span>
            {isDaytime ? (
              <Sun className="w-4 h-4 text-yellow-500" />
            ) : (
              <Moon className="w-4 h-4 text-blue-500" />
            )}
          </div>
        </div>

        {/* Weather Control */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <CloudSun className="w-4 h-4" />
            Weather
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setWeather('clear')}
              className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                weather === 'clear'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Sun className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={() => setWeather('rain')}
              className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                weather === 'rain'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Cloud className="w-4 h-4" />
              Rain
            </button>
            <button
              onClick={() => setWeather('snow')}
              className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                weather === 'snow'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Cloud className="w-4 h-4" />
              Snow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}