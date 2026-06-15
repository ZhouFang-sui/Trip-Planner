import { useState, useRef, useEffect } from 'react';

interface AiMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

const EMOJIS = ['😀','😂','🥰','😎','🤔','👍','❤️','🔥','✨','🎉','🚀','📍','✈️','🏨','🗺️', '📸', '🍔', '🏖️'];

export default function FloatingAiChat({ waypoints = [] }: { waypoints?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<AiMessage[]>([
    { id: '1', role: 'ai', text: 'Hi! I am your AI travel assistant. ✨\nI can help you find related documents, give destination recommendations, or optimize your itinerary.' }
  ]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const generateAiResponse = async (userText: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, context: waypoints })
      });
      if (response.ok) {
        const data = await response.json();
        return data.response;
      }
    } catch (e) {
      console.error(e);
    }
    return "⚠️ Could not connect to Python backend. Make sure the FastAPI server is running on port 8000!";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: AiMessage = { id: Date.now().toString(), role: 'user', text: inputText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setShowEmojis(false);
    setIsTyping(true);

    const aiResponseText = await generateAiResponse(userMsg.text);
    const aiMsg: AiMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: aiResponseText };
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const insertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  return (
    <div className="fixed bottom-28 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_-12px_rgba(14,165,233,0.3)] border border-white/50 w-[340px] mb-4 overflow-hidden flex flex-col h-[500px] transition-all animate-in fade-in slide-in-from-bottom-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 p-5 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                <div className="bg-white p-2.5 rounded-2xl text-2xl shadow-lg ring-4 ring-white/20">🤖</div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <h3 className="font-extrabold text-lg tracking-tight leading-tight">Trip AI Assistant</h3>
                <p className="text-xs text-sky-100 font-medium tracking-wide">Online • Ready to help</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-sky-100 hover:text-white transition bg-white/10 hover:bg-white/20 p-2 rounded-full relative z-10">✕</button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-slate-50/50 to-white/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] mr-2 mt-auto mb-1 shrink-0">🤖</div>}
                <div className={`max-w-[80%] px-4 py-3 shadow-sm text-sm ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-2xl rounded-br-sm' 
                    : 'bg-white border border-sky-100/50 text-slate-700 rounded-2xl rounded-bl-sm whitespace-pre-wrap leading-relaxed shadow-[0_2px_10px_-4px_rgba(14,165,233,0.1)]'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start items-end">
                <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] mr-2 mb-1 shrink-0">🤖</div>
                <div className="bg-white border border-sky-100/50 px-4 py-4 rounded-2xl rounded-bl-sm flex gap-1.5 items-center shadow-sm">
                  <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white/80 backdrop-blur-md border-t border-sky-100 shrink-0 relative">
            {showEmojis && (
              <div className="absolute bottom-full mb-3 left-3 right-3 bg-white p-3 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-sky-50 grid grid-cols-6 gap-2 z-50">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => insertEmoji(e)} className="hover:bg-sky-50 p-1.5 rounded-xl text-xl transition-transform hover:scale-110">{e}</button>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
              <button 
                type="button"
                onClick={() => setShowEmojis(!showEmojis)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-600 transition p-1"
                title="Emojis"
              >
                😀
              </button>
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full bg-slate-100/80 border border-transparent focus:bg-white focus:border-sky-300 focus:ring-4 focus:ring-sky-100 rounded-2xl pl-12 pr-12 py-3.5 text-sm outline-none transition-all placeholder-slate-400 text-slate-700 font-medium"
              />
              <button 
                type="submit" 
                disabled={!inputText.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-xl flex items-center justify-center hover:shadow-lg disabled:opacity-40 transition-all hover:scale-105"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-[0_10px_30px_-5px_rgba(14,165,233,0.5)] flex items-center justify-center text-2xl transition-all duration-300 ${isOpen ? 'bg-slate-800 text-white rotate-[360deg] scale-90' : 'bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 text-white hover:scale-110 hover:shadow-[0_15px_40px_-5px_rgba(14,165,233,0.6)]'}`}
      >
        {isOpen ? '✕' : '✨'}
      </button>
    </div>
  );
}
