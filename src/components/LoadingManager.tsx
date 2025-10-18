import { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { Loader2 } from 'lucide-react';

interface LoadingManagerProps {
  onLoadComplete?: () => void;
}

export function LoadingManager({ onLoadComplete }: LoadingManagerProps) {
  const { active, progress, errors, item, loaded, total } = useProgress();
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!active && progress === 100 && !isComplete) {
      setIsComplete(true);
      setTimeout(() => {
        onLoadComplete?.();
      }, 500); // Small delay for smooth transition
    }
  }, [active, progress, isComplete, onLoadComplete]);

  if (!active && isComplete) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 dark:bg-black/95 backdrop-blur-sm transition-all">
      <div className="text-center space-y-6 px-6">
        {/* Logo or Title */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Loading 3D City</h2>
          <p className="text-gray-400 text-sm">Preparing your environment...</p>
        </div>

        {/* Progress Bar */}
        <div className="w-80 space-y-3">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Progress Details */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{Math.round(progress)}%</span>
            </div>
            <span className="text-gray-500 text-xs">
              {loaded} / {total} assets
            </span>
          </div>

          {/* Current Item */}
          {item && (
            <p className="text-xs text-gray-500 truncate" title={item}>
              Loading: {item.split('/').pop()}
            </p>
          )}
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="text-xs text-red-400 mt-2">
            {errors.length} error(s) occurred during loading
          </div>
        )}

        {/* Loading Tips */}
        <div className="text-xs text-gray-500 max-w-md">
          <p>💡 Tip: Use mouse wheel to zoom, drag to rotate the view</p>
        </div>
      </div>
    </div>
  );
}

// Minimal loading fallback for Suspense boundaries
export function LoadingFallback({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-transparent">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}
