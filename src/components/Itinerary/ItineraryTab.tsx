'use client';
import { useState, useEffect, useRef } from 'react';

interface Waypoint { id: string; lat: number; lng: number; name: string; }
export interface Plan { id: string; waypointId?: string; date: string; time?: string; startTime: string; endTime: string; place: string; note: string; }
interface Props { waypoints?: Waypoint[]; onPlaceClick?: (place: string) => void; plans: Plan[]; setPlans: React.Dispatch<React.SetStateAction<Plan[]>>; }

export default function ItineraryTab({ waypoints = [], onPlaceClick, plans, setPlans }: Props) {
  const [newDate, setNewDate] = useState('');
  const prevWpRef = useRef<string[]>([]);

  useEffect(() => {
    const prevIds = prevWpRef.current;
    const newWps = waypoints.filter(wp => !prevIds.includes(wp.id));
    if (newWps.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      setPlans(cur => {
        const existingWpIds = new Set(cur.map(p => p.waypointId).filter(Boolean));
        const rows: Plan[] = newWps
          .filter(wp => !existingWpIds.has(wp.id))
          .map(wp => ({ id: `wp-${wp.id}`, waypointId: wp.id, date: 'unscheduled', startTime: '', endTime: '', place: wp.name, note: '' }));
        return [...cur, ...rows];
      });
    }
    prevWpRef.current = waypoints.map(w => w.id);
  }, [waypoints]);

  useEffect(() => {
    const wpIds = new Set(waypoints.map(w => w.id));
    setPlans(cur => cur.filter(p => !p.waypointId || wpIds.has(p.waypointId)));
  }, [waypoints]);

  const addPlan = (date: string) =>
    setPlans(p => [...p, { id: Date.now().toString(), date, startTime: '', endTime: '', place: '', note: '' }]);

  const deletePlan = (id: string) => setPlans(p => p.filter(pl => pl.id !== id));

  const updatePlan = (id: string, field: keyof Plan, value: string) =>
    setPlans(p => p.map(pl => pl.id === id ? { ...pl, [field]: value } : pl));

  const grouped = plans.reduce((acc, p) => {
    const k = p.date || 'unscheduled';
    if (!acc[k]) acc[k] = [];
    acc[k].push(p);
    return acc;
  }, {} as Record<string, Plan[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === 'unscheduled') return -1;
    if (b === 'unscheduled') return 1;
    return a.localeCompare(b);
  });

  const scheduledDates = sortedDates.filter(d => d !== 'unscheduled');

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50 shrink-0">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">📅 Daily Itinerary</h3>
          {waypoints.length > 0 && <p className="text-xs text-blue-500 font-medium mt-0.5">✨ {waypoints.length} waypoints synced from map</p>}
        </div>
        <div className="flex gap-2">
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
          <button onClick={() => { if (newDate) { addPlan(newDate); setNewDate(''); } }} disabled={!newDate} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition whitespace-nowrap">+ Add Day</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-6 bg-gray-50/30">
        {sortedDates.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <span className="text-4xl">🗓️</span>
            <p>Add waypoints on the map or pick a date above!</p>
          </div>
        )}

        {sortedDates.map((date) => {
          const isUnsched = date === 'unscheduled';
          const dayNum = isUnsched ? null : scheduledDates.indexOf(date) + 1;
          const label = isUnsched ? '📌 Unscheduled (from Map)' :
            new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

          return (
            <div key={date} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className={`px-4 py-3 border-b border-gray-200 flex justify-between items-center ${isUnsched ? 'bg-amber-50' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}`}>
                <h4 className="font-bold flex items-center gap-2 flex-wrap">
                  {!isUnsched && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-md font-black">Day {dayNum}</span>}
                  <span className={isUnsched ? 'text-amber-700' : 'text-blue-900'}>{label}</span>
                </h4>
                <button onClick={() => addPlan(isUnsched ? new Date().toISOString().split('T')[0] : date)} className="text-blue-600 text-sm font-bold hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-lg transition">+ Add Row</button>
              </div>

              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="py-2 pl-4 pr-2 text-gray-400 font-semibold uppercase text-xs w-60">Time</th>
                    <th className="py-2 px-2 text-gray-400 font-semibold uppercase text-xs">Place</th>
                    <th className="py-2 px-2 text-gray-400 font-semibold uppercase text-xs">Note</th>
                    {isUnsched && <th className="py-2 px-2 text-gray-400 font-semibold uppercase text-xs w-28">Assign Date</th>}
                    <th className="py-2 pr-4 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[date].slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map(plan => (
                    <tr key={plan.id} className="group hover:bg-blue-50/30 transition-colors border-t border-gray-100">
                      <td className="py-1.5 pl-4 pr-2">
                        <div className="flex items-center gap-1.5 min-w-[240px]">
                          <input type="time" value={plan.startTime || ''} onChange={e => updatePlan(plan.id, 'startTime', e.target.value)} className="bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded px-2 py-1 outline-none transition-all text-gray-700 text-sm w-28" />
                          <span className="text-gray-400 text-xs font-bold font-mono">~</span>
                          <input type="time" value={plan.endTime || ''} onChange={e => updatePlan(plan.id, 'endTime', e.target.value)} className="bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded px-2 py-1 outline-none transition-all text-gray-700 text-sm w-28" />
                        </div>
                      </td>
                      <td className="py-1.5 px-2 relative">
                        <input type="text" value={plan.place} onChange={e => updatePlan(plan.id, 'place', e.target.value)} placeholder="Where to?" className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded px-2 py-1 outline-none transition-all font-semibold text-gray-800 text-sm pr-8" />
                        {plan.place && <button onClick={() => onPlaceClick?.(plan.place)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 hover:scale-110 transition" title="Show on map">📍</button>}
                      </td>
                      <td className="py-1.5 px-2">
                        <input type="text" value={plan.note} onChange={e => updatePlan(plan.id, 'note', e.target.value)} placeholder="Notes..." className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded px-2 py-1 outline-none transition-all text-gray-500 text-sm" />
                      </td>
                      {isUnsched && (
                        <td className="py-1.5 px-2">
                          <input type="date" value={plan.date === 'unscheduled' ? '' : plan.date} onChange={e => updatePlan(plan.id, 'date', e.target.value || 'unscheduled')} className="text-xs border border-amber-200 bg-amber-50 focus:border-blue-400 rounded px-1 py-1 outline-none text-amber-700 w-full" title="Assign date" />
                        </td>
                      )}
                      <td className="py-1.5 pr-3 text-right">
                        <button onClick={() => deletePlan(plan.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 bg-white rounded shadow-sm border border-gray-100">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
