import { useState, useEffect } from 'react';

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

interface FlightTabProps {
  waypoints?: Waypoint[];
}

export default function FlightTab({ waypoints }: FlightTabProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Pre-fill destination if waypoints exist
  useEffect(() => {
    if (waypoints && waypoints.length > 0 && !destination) {
      // Find a city name from the first waypoint to use as default destination
      const destName = waypoints[0].name.split(',')[0];
      setDestination(destName);
    }
  }, [waypoints, destination]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    setIsSearching(true);
    setShowResults(false);
    
    // Simulate API search
    setTimeout(() => {
      setIsSearching(false);
      setShowResults(true);
    }, 1500);
  };

  const getSkyscannerLink = () => `https://www.skyscanner.com/transport/flights/${origin.substring(0,3).toLowerCase()}/${destination.substring(0,3).toLowerCase()}?date=${date}`;
  const getGoogleFlightsLink = () => `https://www.google.com/travel/flights?q=Flights%20to%20${destination}%20from%20${origin}`;

  const enc = (s: string) => encodeURIComponent(s.trim());

  const bookingLinks = (flight: { airline: string }) => ([
    {
      label: '🔍 Google Flights',
      url: `https://www.google.com/travel/flights?q=Flights+to+${enc(destination)}+from+${enc(origin)}${date ? '+on+' + date : ''}`,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      label: '🌐 Skyscanner',
      url: `https://www.skyscanner.com/transport/flights/${enc(origin)}/${enc(destination)}/${date ? date.replace(/-/g, '') : ''}`,
      color: 'bg-cyan-600 hover:bg-cyan-700',
    },
    {
      label: '🏖️ Expedia',
      url: `https://www.expedia.com/Flights-Search?trip=oneway&leg1=from:${enc(origin)},to:${enc(destination)}${date ? ',departure:' + date + 'TANYT' : ''}`,
      color: 'bg-amber-600 hover:bg-amber-700',
    },
    {
      label: '🛶 Kayak',
      url: `https://www.kayak.com/flights/${enc(origin)}-${enc(destination)}/${date || 'anytime'}`,
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ]);

  const mockFlights = [
    {
      airline: 'SkyWings Airlines',
      price: '$245',
      duration: '2h 15m',
      time: '08:00 AM - 10:15 AM',
      type: 'Non-stop',
      logo: '✈️',
    },
    {
      airline: 'Global Jet',
      price: '$189',
      duration: '4h 30m',
      time: '11:30 AM - 04:00 PM',
      type: '1 Stop',
      logo: '🌍',
    },
    {
      airline: 'Express Air',
      price: '$320',
      duration: '2h 00m',
      time: '06:45 PM - 08:45 PM',
      type: 'Non-stop',
      logo: '🦅',
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-y-auto">
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-xl">
        <h3 className="font-extrabold text-xl mb-1 flex items-center gap-2">
          <span>✈️</span> Flight Recommendations
        </h3>
        <p className="text-blue-100 text-sm">Find and book the best flights for your trip.</p>
      </div>

      <div className="p-5">
        <form onSubmit={handleSearch} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label>
              <input 
                type="text" 
                placeholder="e.g. New York" 
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
              <input 
                type="text" 
                placeholder="e.g. London" 
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isSearching}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm transition-all disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {isSearching ? (
              <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> Searching...</>
            ) : (
              'Search Flights'
            )}
          </button>
        </form>

        {showResults && (
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-800 mb-3 text-lg">Top Recommended Tickets</h4>
              <div className="space-y-3">
                {mockFlights.map((flight, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl bg-blue-50 w-12 h-12 flex items-center justify-center rounded-full">{flight.logo}</div>
                        <div>
                          <h5 className="font-bold text-gray-800">{flight.airline}</h5>
                          <p className="text-sm text-gray-500 font-medium">{flight.time} · {flight.duration}</p>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">{flight.type}</span>
                        </div>
                      </div>
                      <span className="text-2xl font-black text-gray-900">{flight.price}</span>
                    </div>
                    {/* Direct booking links */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {bookingLinks(flight).map(link => (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`${link.color} text-white text-xs font-bold py-1.5 px-3 rounded-lg text-center transition-all shadow-sm`}
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-3 text-lg">🌐 Compare on Booking Sites</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Google Flights', icon: '🔍', url: `https://www.google.com/travel/flights?q=Flights+to+${enc(destination)}+from+${enc(origin)}`, color: 'border-blue-300 hover:bg-blue-50' },
                  { label: 'Skyscanner', icon: '🌐', url: `https://www.skyscanner.com/transport/flights/${enc(origin)}/${enc(destination)}`, color: 'border-cyan-300 hover:bg-cyan-50' },
                  { label: 'Expedia', icon: '🏖️', url: `https://www.expedia.com/Flights-Search?trip=oneway&leg1=from:${enc(origin)},to:${enc(destination)}`, color: 'border-amber-300 hover:bg-amber-50' },
                  { label: 'Kayak', icon: '🛶', url: `https://www.kayak.com/flights/${enc(origin)}-${enc(destination)}/anytime`, color: 'border-orange-300 hover:bg-orange-50' },
                ].map(site => (
                  <a key={site.label} href={site.url} target="_blank" rel="noreferrer"
                    className={`flex items-center gap-3 p-3 rounded-xl border ${site.color} transition-all font-semibold text-gray-700 hover:shadow-sm`}>
                    <span className="text-2xl">{site.icon}</span> {site.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
