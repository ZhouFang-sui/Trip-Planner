'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';

export default function Home() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    const saved = localStorage.getItem('trip_workspaces');
    if (saved) {
      setWorkspaces(JSON.parse(saved));
    } else {
      setWorkspaces([{ id: '1', name: 'My Dream Trip', date: new Date().toLocaleDateString() }]);
    }
  }, []);

  const createWorkspace = () => {
    const name = prompt('Enter a name for your new trip workspace (e.g. Europe 2026):');
    if (!name) return;
    const newWs = { id: Date.now().toString(), name, date: new Date().toLocaleDateString() };
    const updated = [newWs, ...workspaces];
    setWorkspaces(updated);
    localStorage.setItem('trip_workspaces', JSON.stringify(updated));
    router.push(`/trips/${newWs.id}/map?name=${encodeURIComponent(name)}`);
  };

  const deleteWorkspace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('Are you sure you want to delete this trip workspace?')) {
      const updated = workspaces.filter(w => w.id !== id);
      setWorkspaces(updated);
      localStorage.setItem('trip_workspaces', JSON.stringify(updated));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F19] font-sans text-slate-100 overflow-hidden relative">
      
      {/* Animated Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-teal-500/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
      <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen"></div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-white/5 backdrop-blur-xl py-5 px-8 flex justify-between items-center">
        <h1 className="text-2xl font-black tracking-tighter flex items-center gap-3">
          <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">🗺️</span> 
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400">
            TripPlanner
          </span>
        </h1>
        <button 
          onClick={createWorkspace}
          className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-2 px-6 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:-translate-y-0.5"
        >
          + {t('workspace')}
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-10 flex flex-col pt-16">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight text-white">
            Design your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">perfect journey.</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed font-medium">
            Plan itineraries, track group expenses, and organize travel documents in one collaborative, intelligent workspace.
          </p>
        </div>
        
        {workspaces.length === 0 ? (
          <div className="text-center py-24 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 max-w-4xl mx-auto w-full group relative overflow-hidden transition-all hover:bg-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <span className="text-7xl mb-6 block filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-500">✈️</span>
              <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Your dashboard is empty</h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">Create your first workspace to start mapping out destinations and splitting expenses with friends.</p>
              <button 
                onClick={createWorkspace} 
                className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold py-3.5 px-8 rounded-full shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-all transform hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(56,189,248,0.5)]"
              >
                {t('workspace')}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws, i) => (
              <Link 
                href={`/trips/${ws.id}/map?name=${encodeURIComponent(ws.name)}`} 
                key={ws.id}
                className="group bg-white/5 backdrop-blur-md p-7 rounded-[2rem] border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col cursor-pointer relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both', animationName: 'fadeInUp' }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-teal-400 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out"></div>
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full group-hover:bg-blue-500/20 transition-all"></div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="text-4xl filter drop-shadow-md bg-white/10 p-3 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform">
                    {i % 3 === 0 ? '🏔️' : i % 3 === 1 ? '🏖️' : '🏙️'}
                  </div>
                  <button 
                    onClick={(e) => deleteWorkspace(ws.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all bg-white/5 hover:bg-red-500/20 p-2 rounded-full"
                    title="Delete Workspace"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="relative z-10 mt-auto">
                  <h3 className="text-xl font-bold text-white mb-2 truncate tracking-tight">{ws.name}</h3>
                  <p className="text-sm text-slate-400 font-medium flex items-center gap-2 mb-6">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                    Updated {ws.date}
                  </p>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md">{t('map')}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-md">{t('itinerary')}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md">{t('expenses')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
