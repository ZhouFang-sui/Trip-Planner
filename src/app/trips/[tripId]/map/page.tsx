'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import MapContainer, { Waypoint } from '@/components/Map/MapContainer';
import RouteOptimizer from '@/components/Map/RouteOptimizer';
import ItineraryTab, { Plan } from '@/components/Itinerary/ItineraryTab';
import ExpenseTab, { Expense } from '@/components/Expense/ExpenseTab';
import DocumentTab from '@/components/Document/DocumentTab';
import FlightTab from '@/components/Flight/FlightTab';
import FloatingAiChat from '@/components/Chat/FloatingAiChat';
import FloatingTeamChat from '@/components/Chat/FloatingTeamChat';
import { useLang, LANG_CODES } from '@/context/LangContext';

export default function TripMapPage({ params }: { params: { tripId: string } }) {
  const searchParams = useSearchParams();
  const initialName = searchParams.get('name') || 'My Dream Trip';

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: 1, date: new Date().toISOString().split('T')[0], title: 'Hotel', payer: 'Alice', amount: 300, proportions: 'Bob, Charlie', note: '3 nights' }
  ]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [areaInfo, setAreaInfo] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingPlace, setIsFetchingPlace] = useState(false);
  const [tripName, setTripName] = useState(initialName);
  const [travelMode, setTravelMode] = useState<string>('DRIVING');
  const [activeTab, setActiveTab] = useState<string>('Map');
  const [activeWaypointId, setActiveWaypointId] = useState<string | null>(null);
  const [hoveredWaypointId, setHoveredWaypointId] = useState<string | null>(null);
  const [placeInfo, setPlaceInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [alternativeRoutes, setAlternativeRoutes] = useState<any[]>([]);
  const [famousSites, setFamousSites] = useState<any[]>([]);
  const [isSearchingSites, setIsSearchingSites] = useState(false);
  
  // Collaboration State
  const [cursors, setCursors] = useState<{ [id: string]: { x: number, y: number, color: string, name: string } }>({});
  const wsRef = useRef<WebSocket | null>(null);
  const myId = useRef(Math.random().toString(36).substr(2, 9));
  const myColor = useRef(`hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{id: string; text: string; sender: string; isPinned: boolean; color: string}[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });
  const [mapZoom, setMapZoom] = useState(2);
  const [showSettings, setShowSettings] = useState(false);

  // Language & currency from global context
  const { language, langCode, currency, t, setLanguage, setCurrency } = useLang();
  const [draftCurrency, setDraftCurrency] = useState(currency);
  const [draftLanguage, setDraftLanguage] = useState(language);

  const tabs = [t('map'), t('itinerary'), t('expenses'), t('documents')];
  const tabKeys = ['Map', 'Itinerary', 'Expenses', 'Documents'];

  useEffect(() => {
    const saved = localStorage.getItem(`trip_save_${params.tripId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.waypoints && data.waypoints.length > 0) {
          setWaypoints(data.waypoints);
          const cLat = data.waypoints.reduce((sum: number, w: any) => sum + w.lat, 0) / data.waypoints.length;
          const cLng = data.waypoints.reduce((sum: number, w: any) => sum + w.lng, 0) / data.waypoints.length;
          setMapCenter({ lat: cLat, lng: cLng });
          setMapZoom(12);
        }
        if (data.chatMessages) {
          setChatMessages(data.chatMessages);
        }
        if (data.plans) {
          // Auto-migrate legacy time to startTime
          const migratedPlans = data.plans.map((p: any) => ({
            ...p,
            startTime: p.startTime !== undefined ? p.startTime : (p.time || ''),
            endTime: p.endTime || '',
          }));
          setPlans(migratedPlans);
        }
        if (data.expenses) {
          setExpenses(data.expenses);
        }
      } catch (e) {}
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setMapZoom(12);
          },
          () => {
            setMapZoom(12);
          }
        );
      }
    }
  }, [params.tripId]);

  const handleSaveTrip = () => {
    const data = { waypoints, chatMessages, plans, expenses };
    localStorage.setItem(`trip_save_${params.tripId}`, JSON.stringify(data));
    alert('Trip saved successfully!');
  };

  useEffect(() => {
    // Connect to Python WebSocket
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/ws/trip/${params.tripId || '1'}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'cursor') {
          setCursors(prev => ({
            ...prev,
            [data.id]: { x: data.x, y: data.y, color: data.color, name: data.name }
          }));
        } else if (data.type === 'waypoint') {
          setWaypoints(prev => {
            // Prevent duplicates
            if (prev.find(p => p.id === data.waypoint.id)) return prev;
            return [...prev, data.waypoint];
          });
        } else if (data.type === 'delete_waypoint') {
          setWaypoints((prev) => prev.filter(w => w.id !== data.waypointId));
        } else if (data.type === 'client_disconnected') {
          setCursors((prev) => {
            const newCursors = { ...prev };
            delete newCursors[data.id];
            return newCursors;
          });
        } else if (data.type === 'chat_message') {
          setChatMessages(prev => [...prev, data.message]);
        } else if (data.type === 'toggle_pin') {
          setChatMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, isPinned: !m.isPinned } : m));
        }
      } catch (e) {}
    };

    return () => ws.close();
  }, [params.tripId]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        id: myId.current,
        x: e.clientX,
        y: e.clientY,
        color: myColor.current,
        name: `User ${myId.current.substr(0,4)}`
      }));
    }
  };

  const handleAddWaypoint = (point: { lat: number; lng: number, name?: string, id?: string, placeId?: string, address?: string, opening_hours?: string[] }) => {
    const newWaypoint: Waypoint = {
      id: point.id || Math.random().toString(36).substr(2, 9),
      lat: point.lat,
      lng: point.lng,
      name: point.name || `Point ${waypoints.length + 1}`,
      placeId: point.placeId,
      address: point.address,
      opening_hours: point.opening_hours
    };
    setWaypoints((prev) => [...prev, newWaypoint]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'waypoint',
        waypoint: newWaypoint
      }));
    }
    return newWaypoint;
  };

  const deleteWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter(w => w.id !== id));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'delete_waypoint',
        waypointId: id
      }));
    }
  };

  const updateWaypointName = (id: string, newName: string) => {
    setWaypoints(prev => prev.map(wp => wp.id === id ? { ...wp, name: newName } : wp));
  };

  const updateWaypointNote = (id: string, newNote: string) => {
    setWaypoints(prev => prev.map(wp => wp.id === id ? { ...wp, note: newNote } : wp));
  };

  const handleSendChatMessage = (text: string) => {
    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      sender: 'Me',
      isPinned: false,
      color: myColor.current
    };
    setChatMessages(prev => [...prev, newMessage]);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        message: { ...newMessage, sender: `User ${myId.current.substr(0,4)}` }
      }));
    }
  };

  const handleTogglePin = (id: string) => {
    setChatMessages(prev => prev.map(m => m.id === id ? { ...m, isPinned: !m.isPinned } : m));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'toggle_pin',
        messageId: id
      }));
    }
  };

  const handleRouteChange = (route: any) => {
    setRouteInfo(route);
    if (route) {
      generateSuggestions(route);
    } else {
      setSuggestions([]);
      setAreaInfo(null);
    }
  };

  const generateSuggestions = async (route: any) => {
    setIsGenerating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/analyze-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waypoints: waypoints,
          distance: route.distance,
          duration: route.duration,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
        setAreaInfo(data.area_info);
      } else {
        throw new Error('Backend responded with an error');
      }
    } catch (error) {
      console.error('Error fetching Python insights:', error);
      setSuggestions([
        "⚠️ Could not connect to Python backend.",
        "Make sure to run the FastAPI server on port 8000 for advanced data analysis!"
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptimize = (optimizedWaypoints: Waypoint[]) => {
    setWaypoints(optimizedWaypoints);
  };

  const clearRoute = () => {
    setWaypoints([]);
    setRouteInfo(null);
    setSuggestions([]);
    setAreaInfo(null);
    setPlaceInfo(null);
  };

  const handleMarkerClick = async (id: string, name: string) => {
    setActiveWaypointId(id);
    setIsFetchingPlace(true);
    setPlaceInfo(null);
    
    const wp = waypoints.find(w => w.id === id);
    let realAddress = wp?.address;
    let realHours = wp?.opening_hours;

    if (!realAddress && window.google && window.google.maps) {
      await new Promise((resolve) => {
        const dummyNode = document.createElement('div');
        const service = new window.google.maps.places.PlacesService(dummyNode);
        service.findPlaceFromQuery({
            query: name,
            fields: ['formatted_address', 'opening_hours']
        }, (results: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                realAddress = results[0].formatted_address;
                realHours = results[0].opening_hours?.weekday_text || [];
            }
            resolve(true);
        });
      });
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/place-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_name: name }),
      });
      if (response.ok) {
        const data = await response.json();
        if (realAddress) data.address = realAddress;
        if (realHours && realHours.length > 0) data.open_time_list = realHours;
        setPlaceInfo(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingPlace(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      const fallbackToNominatim = async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&accept-language=${langCode}`,
            { headers: { 'Accept-Language': langCode } }
          );
          if (!res.ok) {
            alert('Search failed. Please try again.');
            return;
          }
          const data = await res.json();
          if (data && data.length > 0) {
            const newId = Math.random().toString(36).substr(2, 9);
            handleAddWaypoint({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name.split(',')[0], id: newId });
            setActiveWaypointId(newId);
            setTimeout(() => setActiveWaypointId(null), 3000);
            setSearchQuery('');
          } else {
            alert('Could not find location. Try a more specific search.');
          }
        } catch (err) {
          console.error('Nominatim error:', err);
          alert('Error searching for location. Please try again.');
        }
      };

      const runGeocoderFallback = () => {
        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ 
            address: searchQuery,
            language: langCode
          }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              const loc = results[0].geometry.location;
              const newId = Math.random().toString(36).substr(2, 9);
              
              let displayName = results[0].name || results[0].formatted_address.split(',')[0];
              // If the geocoded first part is a number or very short, use the query instead
              if (/^\d+$/.test(displayName.replace(/\s/g, '')) || displayName.toLowerCase().includes('no.')) {
                displayName = searchQuery;
              }
              
              handleAddWaypoint({
                lat: loc.lat(),
                lng: loc.lng(),
                name: displayName,
                id: newId
              });
              setActiveWaypointId(newId);
              setTimeout(() => setActiveWaypointId(null), 3000);
              setSearchQuery('');
            } else {
              console.error('Geocode failed: ' + status + ', falling back to Nominatim.');
              fallbackToNominatim();
            }
          });
        } else {
          fallbackToNominatim();
        }
      };

      if (window.google && window.google.maps && window.google.maps.places) {
        const dummyNode = document.createElement('div');
        const service = new window.google.maps.places.PlacesService(dummyNode);
        
        service.findPlaceFromQuery({
          query: searchQuery,
          fields: ['name', 'geometry', 'formatted_address', 'place_id']
        }, (results: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
            const place = results[0];
            const loc = place.geometry.location;
            const newId = Math.random().toString(36).substr(2, 9);
            
            let displayName = place.name;
            // If the name is just a number or contains generic "No.", prefer the search query
            if (/^\d+$/.test(displayName.replace(/\s/g, '')) || displayName.toLowerCase().includes('no.')) {
              displayName = searchQuery;
            }
            
            handleAddWaypoint({
              lat: loc.lat(),
              lng: loc.lng(),
              name: displayName,
              placeId: place.place_id,
              address: place.formatted_address,
              id: newId
            });
            setActiveWaypointId(newId);
            setTimeout(() => setActiveWaypointId(null), 3000);
            setSearchQuery('');
          } else {
            console.log('Places findPlaceFromQuery found nothing or failed, trying Geocoder fallback...');
            runGeocoderFallback();
          }
        });
      } else {
        runGeocoderFallback();
      }
    } catch (e) {
      console.error("Search failed", e);
    }
  };

  const findFamousSites = () => {
    if (!window.google || !window.google.maps) return;
    setIsSearchingSites(true);
    const biasLocation = waypoints.length > 0 ? waypoints[waypoints.length - 1] : mapCenter;
    const centerLatLng = new window.google.maps.LatLng(biasLocation.lat, biasLocation.lng);
    const request = {
      location: centerLatLng,
      radius: 10000,
      type: 'tourist_attraction'
    };
    const dummyNode = document.createElement('div');
    const service = new window.google.maps.places.PlacesService(dummyNode);
    service.nearbySearch(request, (results: any, status: any) => {
      setIsSearchingSites(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setFamousSites(results.slice(0, 5));
      } else {
        alert('Could not find famous sites nearby. Try panning the map.');
      }
    });
  };

  const itineraryDates = [...new Set(plans.map(p => p.date))]
    .filter(d => d && d !== 'unscheduled')
    .sort();

  return (
    <div className="h-screen w-full relative overflow-hidden bg-slate-900 font-sans" onMouseMove={handleMouseMove}>
      
      {/* Remote Cursors Overlay */}
      {Object.entries(cursors).map(([id, cursor]) => (
        <div 
          key={id} 
          className="absolute z-50 pointer-events-none transition-all duration-100 ease-linear"
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={cursor.color} stroke="white" strokeWidth="2" className="drop-shadow-md">
            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z" />
          </svg>
          <div className="ml-4 mt-1 px-2 py-0.5 rounded text-xs font-bold text-white shadow-md whitespace-nowrap" style={{ backgroundColor: cursor.color }}>
            {cursor.name}
          </div>
        </div>
      ))}

      {/* Background Map - Only visible when Map tab is active */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-300 flex flex-col ${activeTab === 'Map' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex-1 relative">
          <MapContainer
            waypoints={waypoints}
            onAddWaypoint={handleAddWaypoint}
            onRouteChange={handleRouteChange}
            onAlternativeRoutes={setAlternativeRoutes}
            travelMode={travelMode}
            activeWaypointId={activeWaypointId}
            hoveredWaypointId={hoveredWaypointId}
            onMarkerClick={handleMarkerClick}
            center={mapCenter}
            zoom={mapZoom}
          />
        </div>
        
        {/* Map Search Bottom */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-20">
          <form onSubmit={handleSearchSubmit} className="bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl flex items-center p-2 border border-gray-100">
            <span className="text-xl ml-3 mr-2">🔍</span>
            <input 
              type="text" 
              placeholder={t('search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-800 font-medium px-2 py-3"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-sm ml-2">
              {t('add')}
            </button>
          </form>
        </div>
      </div>

      {/* Main UI Container */}
      <div className={`absolute z-10 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl flex flex-col border border-gray-100 overflow-hidden transition-all duration-300 ${
        activeTab === 'Map' 
          ? 'top-4 left-4 w-[420px] max-h-[calc(100vh-2rem)]' 
          : 'top-4 left-4 right-4 bottom-4'
      }`}>
        
        {/* Header & Tabs */}
        <div className="p-6 pb-0 border-b border-gray-100 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1 mb-1">
                <span>📁</span> {t('workspace')}
              </div>
              <input
                value={tripName}
                onChange={e => setTripName(e.target.value)}
                className="text-2xl font-extrabold tracking-tight bg-transparent border-none outline-none focus:bg-gray-100 rounded px-2 py-1 -ml-2 text-gray-800 transition max-w-[200px] truncate"
                title="Click to rename trip"
              />
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex -space-x-2 mr-2">
                <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold z-10" style={{backgroundColor: myColor.current}}>Me</div>
                {Object.values(cursors).map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{backgroundColor: c.color}} title={c.name} />
                ))}
              </div>
              <button 
                onClick={handleSaveTrip}
                className="text-sm text-white font-medium transition px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                💾 Save
              </button>
              <button 
                onClick={clearRoute}
                className="text-sm text-gray-500 hover:text-red-500 font-medium transition px-3 py-1.5 bg-gray-100 hover:bg-red-50 rounded-lg"
              >
                {t('clearAll')}
              </button>
              <div className="relative">
                <button 
                  onClick={() => { setDraftCurrency(currency); setDraftLanguage(language); setShowSettings(!showSettings); }}
                  className="text-sm text-gray-600 hover:text-blue-600 font-medium transition px-2 py-1.5 bg-gray-100 hover:bg-blue-50 rounded-lg flex items-center justify-center w-8"
                  title={t('settings')}
                >
                  ⚙️
                </button>
                {showSettings && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-52 z-50">
                    <h4 className="font-bold text-gray-800 mb-3 text-sm">{t('settings')}</h4>
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('currency')}</label>
                      <select value={draftCurrency} onChange={e => setDraftCurrency(e.target.value)} className="w-full text-sm border border-gray-200 rounded outline-none p-1.5 bg-gray-50">
                        <option value="$">USD ($)</option>
                        <option value="€">EUR (€)</option>
                        <option value="£">GBP (£)</option>
                        <option value="¥">JPY (¥)</option>
                        <option value="₹">INR (₹)</option>
                        <option value="NT$">TWD (NT$)</option>
                        <option value="₩">KRW (₩)</option>
                        <option value="฿">THB (฿)</option>
                        <option value="S$">SGD (S$)</option>
                        <option value="A$">AUD (A$)</option>
                        <option value="C$">CAD (C$)</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('language')}</label>
                      <select value={draftLanguage} onChange={e => setDraftLanguage(e.target.value)} className="w-full text-sm border border-gray-200 rounded outline-none p-1.5 bg-gray-50">
                        <option value="English">English</option>
                        <option value="Spanish">Español</option>
                        <option value="French">Français</option>
                        <option value="Chinese (Simplified)">中文 (简体)</option>
                        <option value="Chinese (Traditional)">中文 (繁體)</option>
                        <option value="Japanese">日本語</option>
                        <option value="Korean">한국어</option>
                        <option value="Thai">ภาษาไทย</option>
                      </select>
                    </div>
                    <button
                      onClick={() => { setCurrency(draftCurrency); setLanguage(draftLanguage); setShowSettings(false); }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded-lg transition shadow-sm"
                    >
                      ✓ {t('confirm')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-1 overflow-x-auto pb-4 scrollbar-hide">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tabKeys[i])}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tabKeys[i]
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {activeTab === 'Map' && (
            <>
              {waypoints.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm transition-all">
                  <h3 className="font-bold text-gray-800 mb-4">📌 {t('waypoints')} ({waypoints.length})</h3>
                  <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {waypoints.map((wp, idx) => (
                      <li 
                        key={wp.id}
                        onMouseEnter={() => setHoveredWaypointId(wp.id)}
                        onMouseLeave={() => setHoveredWaypointId(null)}
                        className={`text-sm p-3 border rounded-lg flex flex-col gap-2 transition-all group ${
                          hoveredWaypointId === wp.id || activeWaypointId === wp.id
                            ? 'bg-blue-50/70 border-blue-200 shadow-sm'
                            : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 relative">
                          <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            {idx + 1}
                          </span>
                          <input 
                            value={wp.name}
                            onChange={e => updateWaypointName(wp.id, e.target.value)}
                            className="bg-transparent font-bold text-gray-800 outline-none w-full border-b border-transparent focus:border-blue-400 focus:bg-white px-1 py-0.5 rounded transition truncate peer"
                          />
                          {(wp.address || (wp.opening_hours && wp.opening_hours.length > 0)) && (
                            <div className="absolute left-10 top-8 z-50 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 invisible peer-hover:opacity-100 peer-hover:visible transition-all w-64 pointer-events-none">
                              {wp.address && <div className="font-bold mb-2 leading-tight">{wp.address}</div>}
                              {wp.opening_hours && wp.opening_hours.length > 0 && (
                                <div className="text-gray-300">
                                  <span className="block mb-1 text-[10px] uppercase text-gray-400 font-bold border-b border-gray-700 pb-1">{t('hours') || 'Opening Hours'}</span>
                                  {wp.opening_hours.slice(0, 7).map((h, i) => <div key={i} className="truncate">{h}</div>)}
                                </div>
                              )}
                            </div>
                          )}
                          <button 
                            onClick={() => deleteWaypoint(wp.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100 shrink-0 shadow-sm"
                            title="Remove waypoint"
                          >
                            ✕
                          </button>
                        </div>
                        <textarea
                          placeholder={t('note')}
                          value={wp.note || ''}
                          onChange={e => updateWaypointNote(wp.id, e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded p-2 text-xs text-gray-600 outline-none focus:border-blue-400 resize-none h-14"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transport Mode Selector */}
              <div className="bg-gray-50 rounded-xl p-1.5 flex gap-1 border border-gray-200">
                {['DRIVING', 'TRANSIT', 'WALKING', 'BICYCLING'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTravelMode(mode)}
                    className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all ${
                      travelMode === mode
                        ? 'bg-white text-blue-700 shadow-sm border border-gray-200'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {mode === 'DRIVING' ? '🚗' : mode === 'TRANSIT' ? '🚇' : mode === 'WALKING' ? '🚶' : '🚴'}
                    <span className="ml-1 hidden sm:inline">{t(mode.toLowerCase()) || mode.charAt(0) + mode.slice(1).toLowerCase()}</span>
                  </button>
                ))}
              </div>

              {routeInfo && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 transition-all">
                  
                  <h3 className="font-bold text-blue-900 mb-3 text-lg">{t('tripSummary')}</h3>
                  <div className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm border border-blue-50 mb-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{t('distance')}</span>
                      <span className="font-bold text-blue-900 text-lg">{routeInfo.distance}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{t('estTime')}</span>
                      <span className="font-bold text-blue-900 text-lg">{routeInfo.duration}</span>
                    </div>
                  </div>
                  
                  {routeInfo.fare && (
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-2 text-center text-sm font-semibold text-green-700">
                      🎟️ Transit Fare: {routeInfo.fare}
                    </div>
                  )}

                  {/* Transportation Comparison */}
                  {alternativeRoutes.length > 1 && (
                    <div className="mb-4 pb-4 border-b border-blue-100/50">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">{t('transportOptions')}</h4>
                      <div className="flex flex-col gap-2">
                        {alternativeRoutes.map((alt: any) => {
                          const isFastest = Math.min(...alternativeRoutes.map(a => a.durationValue)) === alt.durationValue;
                          return (
                            <button 
                              key={alt.mode} 
                              onClick={() => setTravelMode(alt.mode)}
                              className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${travelMode === alt.mode ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50 border-gray-100 bg-white'}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{alt.mode === 'DRIVING' ? '🚗' : alt.mode === 'TRANSIT' ? '🚇' : alt.mode === 'WALKING' ? '🚶' : '🚴'}</span>
                                <div className="flex flex-col">
                                  <span className={`font-bold text-sm ${travelMode === alt.mode ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {t(alt.mode.toLowerCase()) || alt.mode.charAt(0) + alt.mode.slice(1).toLowerCase()}
                                  </span>
                                  <span className="text-xs text-gray-500">{alt.distanceText}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className={`font-bold ${travelMode === alt.mode ? 'text-blue-700' : 'text-gray-800'}`}>{alt.durationText}</span>
                                {isFastest && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase mt-0.5">{t('fastest')}</span>}
                                {alt.fare && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase mt-0.5">{alt.fare}</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}


                  {/* Detailed Legs */}
                  {routeInfo.legs && routeInfo.legs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-100/50">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">{t('routeBreakdown') || 'Route Breakdown'}</h4>
                      <div className="flex flex-col gap-3 max-h-40 overflow-y-auto pr-1 text-sm">
                        {routeInfo.legs.map((leg: any, i: number) => (
                          <div key={i} className="flex gap-3 text-blue-800 bg-white/50 p-2 rounded-lg">
                            <div className="flex flex-col items-center">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <div className="w-0.5 h-full bg-blue-200 my-1"></div>
                              <div className="w-2 h-2 rounded-full border-2 border-blue-500"></div>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-xs truncate max-w-[240px]">{leg.start_address}</p>
                              <div className="text-xs text-blue-600/70 font-semibold my-1">
                                {leg.duration} ({leg.distance})
                              </div>
                              <p className="font-medium text-xs truncate max-w-[240px]">{leg.end_address}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(placeInfo || isFetchingPlace) && (
                <div className="bg-white border-2 border-indigo-100 rounded-2xl p-5 shadow-lg transition-all relative">
                  <h3 className="font-extrabold text-indigo-900 mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                    <span className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md">🏛️ Insights</span>
                  </h3>
                  
                  {isFetchingPlace ? (
                    <div className="flex items-center gap-3 text-sm text-indigo-500 font-bold justify-center py-6">
                      <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                      Analyzing location...
                    </div>
                  ) : placeInfo && (
                    <div className="flex flex-col gap-4">
                      <h4 className="font-black text-2xl text-slate-800 leading-tight">{placeInfo.name}</h4>
                      
                      <div className="flex flex-col gap-3 text-sm text-slate-600">
                        <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="text-lg">📍</span> 
                          <div className="flex-1">
                            <span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">{t('address') || 'Address'}</span>
                            <div className="font-medium text-slate-700 mb-1 leading-snug">{placeInfo.address}</div>
                            <a
                              href={`https://www.google.com/maps/search/${encodeURIComponent(placeInfo.name)}`}
                              target="_blank" rel="noreferrer"
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition text-xs"
                            >
                              {t('searchMaps') || 'Search on Google Maps →'}
                            </a>
                          </div>
                        </div>

                        {(placeInfo.open_time_list || placeInfo.open_time) && (
                          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="text-lg">🕒</span>
                            <div className="flex-1">
                              <span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">{t('hours') || 'Hours'}</span>
                              <div className="text-sm font-medium text-slate-700">
                                {placeInfo.open_time_list ? (
                                  <ul className="text-xs space-y-1 mt-1">
                                    {placeInfo.open_time_list.map((h: string, i: number) => <li key={i}>{h}</li>)}
                                  </ul>
                                ) : (
                                  placeInfo.open_time
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="text-lg">⭐</span>
                          <div className="flex-1">
                            <span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">{t('reviews') || 'Reviews'}</span>
                            <div className="flex gap-2 flex-wrap mt-1">
                              <a
                                href={`https://www.tripadvisor.com/Search?q=${encodeURIComponent(placeInfo.name)}`}
                                target="_blank" rel="noreferrer"
                                className="text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded-lg transition"
                              >
                                🦉 TripAdvisor
                              </a>
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(placeInfo.name + ' reviews')}`}
                                target="_blank" rel="noreferrer"
                                className="text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded-lg transition"
                              >
                                🔍 Google
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Ticket / Experience Booking Links */}
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-inner mt-2">
                          <span className="block text-xs font-black text-indigo-400 uppercase mb-3 tracking-wider">🎟️ {t('exploreTours') || 'Explore Nearby Tours'}</span>
                          <div className="grid grid-cols-2 gap-3">
                            {(placeInfo.booking_links || []).map((link: { label: string; url: string; color: string; price?: string }, i: number) => (
                              <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex flex-col items-center justify-center gap-1 text-xs font-bold text-white py-3 px-2 rounded-xl transition hover:opacity-90 hover:shadow-lg active:scale-95"
                                style={{ backgroundColor: link.color }}
                              >
                                <span>{link.label}</span>
                                {link.price && <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] shadow-sm">{link.price}</span>}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm leading-relaxed text-slate-600 bg-indigo-50/50 p-4 rounded-xl border border-indigo-50 italic mt-2">
                        &quot;{placeInfo.description}&quot;
                      </p>
                      
                      {placeInfo.ai_introduction && (
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100 shadow-inner mt-2">
                          <p className="text-sm text-emerald-800 font-medium leading-relaxed">
                            {placeInfo.ai_introduction}
                          </p>
                          {placeInfo.famous_view && (
                            <p className="text-sm text-teal-800 font-bold mt-2">
                              {placeInfo.famous_view}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Famous Sites Nearby */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-5 shadow-sm transition-all">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-purple-900 flex items-center gap-2">
                    ⭐ {t('famousSites')}
                  </h3>
                  <button 
                    onClick={findFamousSites} 
                    disabled={isSearchingSites}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 px-3 rounded-lg transition shadow-sm disabled:bg-purple-400"
                  >
                    {isSearchingSites ? '...' : t('discover')}
                  </button>
                </div>
                
                {famousSites.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {famousSites.map((site: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-purple-100 flex justify-between items-center shadow-sm">
                        <div className="flex flex-col pr-2">
                          <span className="font-bold text-sm text-gray-800 truncate max-w-[200px]" title={site.name}>{site.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-amber-500 font-bold">★ {site.rating || 'New'}</span>
                            <span className="text-[10px] text-gray-400">{site.user_ratings_total ? `(${site.user_ratings_total} reviews)` : ''}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const newId = Math.random().toString(36).substr(2, 9);
                            handleAddWaypoint({ lat: site.geometry.location.lat(), lng: site.geometry.location.lng(), name: site.name, id: newId });
                            setActiveWaypointId(newId);
                            setTimeout(() => setActiveWaypointId(null), 3000);
                          }}
                          className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-bold py-1.5 px-2.5 rounded-lg transition shrink-0"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <RouteOptimizer waypoints={waypoints} onOptimize={handleOptimize} routeInfo={routeInfo} travelMode={travelMode} />

              <FlightTab waypoints={waypoints} />

            </>
          )}

          {activeTab === 'Itinerary' && (
            <ItineraryTab 
              waypoints={waypoints}
              plans={plans}
              setPlans={setPlans}
              onPlaceClick={(place) => {
              setActiveTab('Map');
              const wp = waypoints.find(w => w.name.toLowerCase().includes(place.toLowerCase()) || place.toLowerCase().includes(w.name.toLowerCase()));
              if (wp) {
                setActiveWaypointId(wp.id);
                // Clear highlight after a while
                setTimeout(() => setActiveWaypointId(null), 3000);
              }
            }} />
          )}

          {activeTab === 'Expenses' && (
            <ExpenseTab currency={currency} expenses={expenses} setExpenses={setExpenses} itineraryDates={itineraryDates} />
          )}

          {activeTab === 'Documents' && (
            <DocumentTab />
          )}

        </div>
      </div>

      <FloatingAiChat waypoints={waypoints} />
      <FloatingTeamChat 
        messages={chatMessages} 
        onSendMessage={handleSendChatMessage} 
        onTogglePin={handleTogglePin} 
        myColor={myColor.current} 
      />

      {/* Floating Note Panel */}
      {activeWaypointId && waypoints.find(w => w.id === activeWaypointId)?.note && (
        <div className="absolute bottom-6 right-6 z-50 bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-xl max-w-sm">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-yellow-800 flex items-center gap-2 text-sm">
              📝 {t('note')}: {waypoints.find(w => w.id === activeWaypointId)?.name}
            </h4>
            <button onClick={() => setActiveWaypointId(null)} className="text-yellow-500 hover:text-yellow-700 font-bold ml-4">✕</button>
          </div>
          <p className="text-sm text-yellow-900 whitespace-pre-wrap leading-relaxed">
            {waypoints.find(w => w.id === activeWaypointId)?.note}
          </p>
        </div>
      )}
    </div>
  );
}
