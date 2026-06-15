import { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isPinned: boolean;
  color?: string;
}

interface FloatingTeamChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onTogglePin: (id: string) => void;
  myColor?: string;
}

const EMOJIS = ['😀','😂','🥰','😎','🤔','👍','❤️','🔥','✨','🎉','🚀','📍','✈️','🏨','🗺️', '📸', '🍔', '🏖️'];

export default function FloatingTeamChat({ messages, onSendMessage, onTogglePin, myColor = '#38bdf8' }: FloatingTeamChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pinnedMessages = messages.filter(m => m.isPinned);
  const regularMessages = messages.filter(m => !m.isPinned);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
      setShowEmojis(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_-12px_rgba(14,165,233,0.3)] border border-sky-100 w-[340px] mb-4 overflow-hidden flex flex-col h-[450px] transition-all animate-in fade-in slide-in-from-bottom-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-400 to-blue-500 p-4 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
             <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <h3 className="font-extrabold flex items-center gap-2 text-lg z-10">
              <span className="text-2xl drop-shadow-md">💬</span> Team Chat
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-sky-100 hover:text-white transition bg-white/10 hover:bg-white/20 p-1.5 rounded-full z-10">✕</button>
          </div>

          {/* Pinned Messages Area */}
          {pinnedMessages.length > 0 && (
            <div className="bg-sky-50/80 border-b border-sky-100 shrink-0 max-h-32 overflow-y-auto">
              <div className="px-4 py-1.5 text-[10px] font-black text-sky-600 uppercase tracking-widest sticky top-0 bg-sky-50/90 backdrop-blur z-10 border-b border-sky-100/50 flex items-center gap-1">
                <span>📌</span> Pinned
              </div>
              {pinnedMessages.map(msg => (
                <div key={msg.id} className="px-4 py-2.5 text-sm border-b border-sky-100/50 flex justify-between items-start group hover:bg-sky-100/50 transition">
                  <div className="flex-1">
                    <span className="font-bold text-xs" style={{ color: msg.color }}>{msg.sender}: </span>
                    <span className="text-slate-700 font-medium">{msg.text}</span>
                  </div>
                  <button 
                    onClick={() => onTogglePin(msg.id)}
                    className="text-sky-500 opacity-0 group-hover:opacity-100 transition px-2 hover:text-sky-700 text-xs font-bold"
                    title="Unpin message"
                  >
                    Unpin
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50/50 to-white/50">
            {regularMessages.length === 0 && pinnedMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-70">
                <span className="text-4xl mb-2">👋</span>
                <p className="font-medium text-sm">Say hi to your team!</p>
              </div>
            )}
            {regularMessages.map((msg, idx) => {
              const isMe = msg.sender === 'Me';
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                  <span className="text-[10px] font-bold mb-1 px-1 opacity-80" style={{ color: msg.color }}>{msg.sender}</span>
                  <div className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-gradient-to-br from-sky-500 to-blue-500 text-white rounded-tr-sm' : 'bg-white border border-sky-100 text-slate-700 rounded-tl-sm shadow-[0_2px_10px_-4px_rgba(14,165,233,0.1)]'}`}>
                    {msg.text}
                    <button 
                      onClick={() => onTogglePin(msg.id)}
                      className={`absolute ${isMe ? '-left-9' : '-right-9'} top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-full shadow-sm border border-sky-100 text-slate-300 hover:text-sky-500 hover:scale-110 opacity-0 group-hover:opacity-100 transition-all`}
                      title="Pin message"
                    >
                      📌
                    </button>
                  </div>
                </div>
              );
            })}
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
                placeholder="Type a message..."
                className="w-full bg-slate-100/80 border border-transparent focus:bg-white focus:border-sky-300 focus:ring-4 focus:ring-sky-100 rounded-2xl pl-12 pr-12 py-3 text-sm outline-none transition-all font-medium text-slate-700"
              />
              <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-xl flex items-center justify-center hover:shadow-lg disabled:opacity-40 transition-all hover:scale-105"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-[0_10px_30px_-5px_rgba(14,165,233,0.5)] flex items-center justify-center text-2xl transition-all duration-300 ${isOpen ? 'bg-slate-800 text-white rotate-[360deg] scale-90' : 'bg-gradient-to-br from-cyan-400 to-sky-500 text-white hover:scale-110 hover:shadow-[0_15px_40px_-5px_rgba(14,165,233,0.6)]'}`}
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}
