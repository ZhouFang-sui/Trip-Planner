'use client';

import { useEffect, useRef, useState } from 'react';

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  note?: string;
  placeId?: string;
  address?: string;
  opening_hours?: string[];
}

interface MapContainerProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  waypoints: Waypoint[];
  onAddWaypoint: (point: { lat: number; lng: number, name?: string, placeId?: string, address?: string, opening_hours?: string[] }) => void;
  onRouteChange?: (route: any) => void;
  travelMode?: string;
  activeWaypointId?: string | null;
  hoveredWaypointId?: string | null;
  onMarkerClick?: (id: string, name: string) => void;
  onAlternativeRoutes?: (alternatives: any[]) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function MapContainer({
  center = { lat: 40.7128, lng: -74.006 },
  zoom = 12,
  waypoints,
  onAddWaypoint,
  onRouteChange,
  travelMode = 'DRIVING',
  activeWaypointId = null,
  hoveredWaypointId = null,
  onMarkerClick,
  onAlternativeRoutes
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [directionsService, setDirectionsService] = useState<any>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
  const [infoWindow, setInfoWindow] = useState<any>(null);
  const markersRef = useRef<any[]>([]);
  const fallbackPolylineRef = useRef<any>(null);
  const prevCenterRef = useRef<{lat: number, lng: number} | null>(null);

  // Initialize map — wait for Google Maps to be available
  useEffect(() => {
    if (!mapRef.current) return;

    const init = () => {
      if (!window.google || !window.google.maps) return false;

      const newMap = new window.google.maps.Map(mapRef.current!, {
        zoom: zoom,
        center: center,
        mapTypeControl: true,
        fullscreenControl: false,
        streetViewControl: false,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: true,
        mapId: "DEMO_MAP_ID",
      });

      const newDirectionsService = new window.google.maps.DirectionsService();
      const newDirectionsRenderer = new window.google.maps.DirectionsRenderer({
        map: newMap,
        suppressMarkers: true
      });
      const newInfoWindow = new window.google.maps.InfoWindow();

      setMap(newMap);
      setDirectionsService(newDirectionsService);
      setDirectionsRenderer(newDirectionsRenderer);
      setInfoWindow(newInfoWindow);

      newMap.addListener('click', (event: any) => {
        console.log('Map click event triggered:', event);
        if (event.placeId) {
          console.log('Click detected on POI. placeId:', event.placeId);
          try {
            if (typeof event.stop === 'function') event.stop();
          } catch(e) {}
          
          const request = {
            placeId: event.placeId,
            fields: ['name', 'geometry', 'formatted_address']
          };
          const service = new window.google.maps.places.PlacesService(newMap);
          service.getDetails(request, async (place: any, status: any) => {
            console.log('Google Places getDetails response status:', status, 'place details:', place);
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
              const placeName = place.name;
              
              // IMMEDIATELY add the waypoint with its proper details!
              onAddWaypoint({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                name: place.name,
                placeId: event.placeId,
                address: place.formatted_address
              });

              // Open InfoWindow to show it was added and display insights
              newInfoWindow.setContent(`
                <div style="padding: 10px; min-width: 220px; font-family: sans-serif;">
                  <h3 style="margin:0 0 4px 0; font-size: 16px; font-weight: bold; color: #1e293b;">${placeName}</h3>
                  <p style="margin:0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.3;">${place.formatted_address || ''}</p>
                  <div style="background: #e0f2fe; color: #0369a1; padding: 8px 12px; border-radius: 6px; font-weight: bold; text-align: center; font-size: 13px; margin-bottom: 10px;">✓ Added to Waypoints</div>
                  <div id="poi-ai-intro" style="font-size: 13px; color: #475569; border-top: 1px solid #f1f5f9; padding-top: 8px; line-height: 1.4; font-style: italic;">Fetching AI insights...</div>
                </div>
              `);
              newInfoWindow.setPosition(place.geometry.location);
              newInfoWindow.open(newMap);

              try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/place-info`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ place_name: placeName })
                });
                if (res.ok) {
                  const data = await res.json();
                  const introDiv = document.getElementById('poi-ai-intro');
                  if (introDiv) {
                    introDiv.innerText = data.ai_introduction || data.description;
                  }
                }
              } catch (e) {}
            } else {
              console.error('Google Places Service getDetails failed with status:', status, 'Please make sure "Places API" is enabled in your Google Cloud Console.');
              // Fallback if POI service fails
              const lat = event.latLng.lat();
              const lng = event.latLng.lng();
              onAddWaypoint({ lat, lng, name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
            }
          });
        } else {
          console.log('Click detected on non-POI area.');
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          
          // Show adding feedback
          newInfoWindow.setContent(`
            <div style="padding: 10px; min-width: 150px; font-family: sans-serif; text-align: center;">
              <div style="font-size: 12px; color: #64748b; font-weight: bold;">Adding waypoint...</div>
            </div>
          `);
          newInfoWindow.setPosition(event.latLng);
          newInfoWindow.open(newMap);

          // Reverse geocode to find the real name of the location
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            console.log('Geocoder geocode response status:', status, 'results:', results);
            let locationName = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            let address = "";
            
            if (status === 'OK' && results && results.length > 0) {
              // Try to find a named establishment or point of interest in the geocoded results
              const poiResult = results.find((r: any) => 
                r.types.includes('establishment') || 
                r.types.includes('point_of_interest') || 
                r.types.includes('tourist_attraction')
              );
              
              const chosenResult = poiResult || results[0];
              address = chosenResult.formatted_address;
              const parts = address.split(',');
              if (parts.length > 0) {
                locationName = parts[0].trim();
              }
              
              // If the resolved name is a street number or generic "No.", concatenate with the street name
              if (/^\d+$/.test(locationName.replace(/\s/g, '')) || locationName.toLowerCase().includes('no.')) {
                if (parts.length > 1) {
                  locationName = parts[0].trim() + ' ' + parts[1].trim();
                }
              }
            } else {
              console.error('Google Geocoder failed with status:', status, 'Please make sure "Geocoding API" is enabled in your Google Cloud Console.');
            }
            
            // Add the waypoint with the actual geocoded name!
            onAddWaypoint({
              lat,
              lng,
              name: locationName,
              address: address
            });

            // Update InfoWindow to show success
            newInfoWindow.setContent(`
              <div style="padding: 10px; min-width: 200px; font-family: sans-serif;">
                <h3 style="margin:0 0 4px 0; font-size: 14px; font-weight: bold; color: #1e293b;">${locationName}</h3>
                <p style="margin:0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.3;">${address}</p>
                <div style="background: #e0f2fe; color: #0369a1; padding: 6px 10px; border-radius: 6px; font-weight: bold; text-align: center; font-size: 12px;">✓ Added to Waypoints</div>
              </div>
            `);
          });
        }
      });
      return true;
    };

    if (!init()) {
      // Poll until google loads (handles async script)
      const interval = setInterval(() => {
        if (init()) clearInterval(interval);
      }, 300);
      return () => clearInterval(interval);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync center and zoom
  useEffect(() => {
    if (map && center) {
      if (!prevCenterRef.current || center.lat !== prevCenterRef.current.lat || center.lng !== prevCenterRef.current.lng) {
        map.panTo(center);
        map.setZoom(zoom);
        prevCenterRef.current = center;
      }
    }
  }, [center, zoom, map]);

  // Sync markers and calculate route when waypoints change
  useEffect(() => {
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    waypoints.forEach((wp, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: wp.lat, lng: wp.lng },
        map: map,
        label: `${index + 1}`,
        title: wp.name,
      });
      
      marker.addListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(wp.id, wp.name);
        }
        
        if (infoWindow) {
          infoWindow.setContent(`
            <div style="padding: 12px; color: #1e293b; min-width: 150px; font-family: sans-serif;">
              <h3 style="margin:0 0 8px 0; font-weight:800; font-size: 16px; color: #2563eb;">${wp.name}</h3>
              <p style="margin:0; font-size:13px; color: #64748b; font-weight: 500;">Latitude: ${wp.lat.toFixed(4)}</p>
              <p style="margin:2px 0 0 0; font-size:13px; color: #64748b; font-weight: 500;">Longitude: ${wp.lng.toFixed(4)}</p>
            </div>
          `);
          infoWindow.open(map, marker);
        }
      });
      
      // Highlight if it's the active waypoint
      if (activeWaypointId === wp.id) {
        marker.setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 2100); // Stop bouncing after ~3 bounces
        if (infoWindow) {
          window.google.maps.event.trigger(marker, 'click');
          map.panTo(marker.getPosition());
          map.setZoom(12); // ~10km distance zoom level
        }
      }

      markersRef.current.push(marker);
    });

    // Calculate route
    const calculateRoute = async () => {
      const origin = waypoints[0];
      const destination = waypoints[waypoints.length - 1];
      const stops = waypoints.slice(1, -1).map((wp) => ({
        location: new window.google.maps.LatLng(wp.lat, wp.lng),
        stopover: true,
      }));

      try {
        const result = await directionsService.route({
          origin: new window.google.maps.LatLng(origin.lat, origin.lng),
          destination: new window.google.maps.LatLng(destination.lat, destination.lng),
          waypoints: stops,
          optimizeWaypoints: true,
          travelMode: window.google.maps.TravelMode[travelMode] || window.google.maps.TravelMode.DRIVING,
        });

        directionsRenderer.setDirections(result);

        const route = result.routes[0];
        const distance = route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
        const duration = route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);
        
        let fareStr = null;
        if (route.fare) {
          fareStr = route.fare.text;
        }

        if (onRouteChange) {
          onRouteChange({
            distance: `${(distance / 1000).toFixed(2)} km`,
            duration: `${Math.round(duration / 60)} mins`,
            durationValue: duration,
            fare: fareStr,
            legs: route.legs.map((leg: any) => ({
              start_address: leg.start_address,
              end_address: leg.end_address,
              distance: leg.distance.text,
              duration: leg.duration.text,
            })),
          });
        }
        
        if (onAlternativeRoutes && waypoints.length >= 2) {
          const modes = ['DRIVING', 'TRANSIT', 'WALKING', 'BICYCLING'];
          Promise.all(
            modes.map(async (mode) => {
              try {
                const res = await directionsService.route({
                  origin: new window.google.maps.LatLng(origin.lat, origin.lng),
                  destination: new window.google.maps.LatLng(destination.lat, destination.lng),
                  waypoints: stops,
                  optimizeWaypoints: true,
                  travelMode: window.google.maps.TravelMode[mode],
                });
                const r = res.routes[0];
                const dist = r.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
                const dur = r.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);
                return {
                  mode,
                  distanceText: `${(dist / 1000).toFixed(2)} km`,
                  durationValue: dur,
                  durationText: `${Math.round(dur / 60)} mins`,
                  fare: r.fare ? r.fare.text : null
                };
              } catch (e) {
                return null;
              }
            })
          ).then(results => {
            const valid = results.filter(r => r !== null);
            onAlternativeRoutes(valid);
          });
        }
      } catch (error) {
        console.error('Error calculating route with Directions API, falling back to Polyline:', error);
        
        // Fallback: draw straight lines if Directions API fails (e.g., billing issues)
        if (fallbackPolylineRef.current) {
          fallbackPolylineRef.current.setMap(null);
        }
        
        const path = waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }));
        fallbackPolylineRef.current = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#3B82F6', // blue-500
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: map
        });

        const estDistKm = waypoints.length > 1 ? (waypoints.length - 1) * 2.5 : 0;
        
        let speedKmh = 50; // DRIVING
        if (travelMode === 'WALKING') speedKmh = 5;
        if (travelMode === 'BICYCLING') speedKmh = 15;
        if (travelMode === 'TRANSIT') speedKmh = 30;
        
        const estMins = Math.round((estDistKm / speedKmh) * 60);
        
        let fareStr = null;
        if (travelMode === 'TRANSIT') {
          fareStr = `$${(2.50 + estDistKm * 0.2).toFixed(2)}`;
        }

        // Still call onRouteChange with dummy data so the UI updates
        if (onRouteChange) {
          onRouteChange({
            distance: `~${estDistKm.toFixed(1)} km (Simulated)`,
            duration: `~${estMins} mins (Simulated)`,
            fare: fareStr,
            legs: [],
          });
        }
      }
    };

    // Clean up old polyline before calculating
    if (fallbackPolylineRef.current) {
      fallbackPolylineRef.current.setMap(null);
    }

    if (waypoints.length >= 2 && directionsService && directionsRenderer) {
      calculateRoute();
    } else if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] });
      if (onRouteChange) onRouteChange(null);
    }
  }, [waypoints, travelMode, activeWaypointId, map, directionsService, directionsRenderer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronize hover state with marker animation
  useEffect(() => {
    if (!map || !markersRef.current) return;
    if (!window.google || !window.google.maps || !window.google.maps.Animation) return;
    
    waypoints.forEach((wp, index) => {
      const marker = markersRef.current[index];
      if (!marker) return;
      if (hoveredWaypointId === wp.id) {
        marker.setAnimation(window.google.maps.Animation.BOUNCE);
      } else if (activeWaypointId !== wp.id) {
        marker.setAnimation(null);
      }
    });
  }, [hoveredWaypointId, waypoints, activeWaypointId, map]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full focus:outline-none" />
    </div>
  );
}
