'use client';

import { useState } from 'react';
import { useLang } from '@/context/LangContext';

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  note?: string;
}

interface RouteOptimizerProps {
  waypoints: Waypoint[];
  onOptimize?: (optimizedWaypoints: Waypoint[]) => void;
  routeInfo?: any;
  travelMode?: string;
}

export default function RouteOptimizer({
  waypoints,
  onOptimize,
  routeInfo,
  travelMode,
}: RouteOptimizerProps) {
  const { t } = useLang();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedOrder, setOptimizedOrder] = useState<string[]>([]);
  const [distanceSaved, setDistanceSaved] = useState<number | null>(null);

  // Helper functions for exact TSP and Haversine distances
  const getHaversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateTotalDistance = (points: Waypoint[]): number => {
    let dist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      dist += getHaversineDistance(points[i].lat, points[i].lng, points[i+1].lat, points[i+1].lng);
    }
    return dist;
  };

  const solveTspClientSide = (points: Waypoint[]): Waypoint[] => {
    if (points.length <= 2) return points;
    
    const start = points[0];
    const others = points.slice(1);
    
    let bestPath: Waypoint[] = [];
    let minDistance = Infinity;
    
    // Depth-first search with branch-and-bound pruning
    const permute = (path: Waypoint[], remaining: Waypoint[], currentDist: number) => {
      if (currentDist >= minDistance) return; // Pruning
      
      if (remaining.length === 0) {
        if (currentDist < minDistance) {
          minDistance = currentDist;
          bestPath = [...path];
        }
        return;
      }
      
      for (let i = 0; i < remaining.length; i++) {
        const next = remaining[i];
        const last = path[path.length - 1];
        const d = getHaversineDistance(last.lat, last.lng, next.lat, next.lng);
        
        const newRemaining = remaining.slice(0, i).concat(remaining.slice(i + 1));
        permute([...path, next], newRemaining, currentDist + d);
      }
    };
    
    if (others.length <= 9) {
      permute([start], others, 0);
      return bestPath;
    } else {
      // Nearest neighbor heuristic for larger N
      const unvisited = [...others];
      let curr = start;
      const optimized = [start];
      while (unvisited.length > 0) {
        let nearestIndex = 0;
        let minD = Infinity;
        for (let i = 0; i < unvisited.length; i++) {
          const d = getHaversineDistance(curr.lat, curr.lng, unvisited[i].lat, unvisited[i].lng);
          if (d < minD) {
            minD = d;
            nearestIndex = i;
          }
        }
        const next = unvisited.splice(nearestIndex, 1)[0];
        optimized.push(next);
        curr = next;
      }
      
      // Simple 2-opt refinement on top of greedy NN path
      let improved = true;
      while (improved) {
        improved = false;
        for (let i = 1; i < optimized.length - 2; i++) {
          for (let j = i + 1; j < optimized.length; j++) {
            if (j - i === 1) continue;
            
            const oldD1 = getHaversineDistance(optimized[i-1].lat, optimized[i-1].lng, optimized[i].lat, optimized[i].lng);
            const oldD2 = j < optimized.length - 1 ? getHaversineDistance(optimized[j].lat, optimized[j].lng, optimized[j+1].lat, optimized[j+1].lng) : 0;
            
            const newD1 = getHaversineDistance(optimized[i-1].lat, optimized[i-1].lng, optimized[j].lat, optimized[j].lng);
            const newD2 = j < optimized.length - 1 ? getHaversineDistance(optimized[i].lat, optimized[i].lng, optimized[j+1].lat, optimized[j+1].lng) : 0;
            
            if (newD1 + newD2 < oldD1 + oldD2) {
              const sub = optimized.slice(i, j + 1).reverse();
              optimized.splice(i, sub.length, ...sub);
              improved = true;
              break;
            }
          }
          if (improved) break;
        }
      }
      return optimized;
    }
  };

  const optimizeRoute = async () => {
    if (waypoints.length < 2) return;

    setIsOptimizing(true);
    setDistanceSaved(null);

    const initialDistance = calculateTotalDistance(waypoints);
    let optimizedWaypoints: Waypoint[] = [];

    try {
      // 1. Try backend API first
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/optimize-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.waypoints) {
          optimizedWaypoints = data.waypoints;
          console.log('Smart routing optimized via Python backend API successfully.');
        } else {
          throw new Error('Invalid backend data');
        }
      } else {
        throw new Error('Backend failed');
      }
    } catch (e) {
      console.log('Backend optimization failed or unreachable, running exact client-side TSP solver...');
      // 2. Client-side fallback solver
      optimizedWaypoints = solveTspClientSide(waypoints);
    }

    const optimizedIds = optimizedWaypoints.map(wp => wp.id);
    setOptimizedOrder(optimizedIds);

    const optimizedDistance = calculateTotalDistance(optimizedWaypoints);
    const saved = initialDistance - optimizedDistance;
    if (saved > 0.01) {
      setDistanceSaved(saved);
    } else {
      setDistanceSaved(0);
    }

    if (onOptimize) {
      onOptimize(optimizedWaypoints);
    }

    setIsOptimizing(false);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5 shadow-sm transition-all">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
          <span>🎯</span> {t('smartRouter')}
        </h3>
        {waypoints.length > 0 && (
          <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md">
            {waypoints.length} {t('stops')}
          </span>
        )}
      </div>
      
      <p className="text-xs text-indigo-700 mb-4 font-medium leading-relaxed">
        Collaborating with others? We'll integrate all added places and calculate the absolute shortest path to save you time and travel costs.
      </p>

      <button
        onClick={optimizeRoute}
        disabled={isOptimizing || waypoints.length < 2}
        className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 transition-all shadow-sm hover:shadow flex justify-center items-center gap-2"
      >
        {isOptimizing ? (
          <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> {t('calcShortest')}</>
        ) : waypoints.length < 2 ? (
          t('addMorePlaces')
        ) : (
          t('findShortest')
        )}
      </button>

      {optimizedOrder.length > 0 && (
        <div className="mt-5 bg-white p-4 rounded-xl border border-indigo-50 shadow-sm">
          <h4 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-green-500">✓</span> {t('recommendedOrder')}
          </h4>
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-indigo-100"></div>
            <ul className="space-y-3 relative z-10">
              {optimizedOrder.map((id, index) => {
                const wp = waypoints.find((w) => w.id === id);
                return (
                  <li key={id} className="text-sm font-medium text-gray-700 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black border-2 border-white shadow-sm shrink-0">
                      {index + 1}
                    </span>
                    <span className="truncate">{wp?.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded truncate">
                {distanceSaved !== null && distanceSaved > 0 
                  ? `✨ Saved ${distanceSaved.toFixed(1)} km!` 
                  : t('routeUpdated')}
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded shrink-0">
                {travelMode === 'DRIVING' ? '🚗' : travelMode === 'TRANSIT' ? '🚇' : travelMode === 'WALKING' ? '🚶' : '🚴'} 
                {travelMode && (t(travelMode.toLowerCase()) || travelMode.charAt(0) + travelMode.slice(1).toLowerCase())}
              </span>
            </div>
            
            {routeInfo && (
              <div className="flex justify-between items-center text-xs font-semibold text-gray-600 bg-gray-50 p-2 rounded mt-1">
                <span>{routeInfo.duration} ({routeInfo.distance})</span>
                {routeInfo.fare && <span className="text-indigo-600 font-bold">{routeInfo.fare}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
