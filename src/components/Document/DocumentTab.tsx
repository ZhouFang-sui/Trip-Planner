import { useState, useRef } from 'react';

export default function DocumentTab() {
  const [items, setItems] = useState<any[]>([
    { id: 1, type: 'folder', name: 'Flight Tickets', size: '--', url: null, parentId: null },
  ]);
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const [path, setPath] = useState<{id: number | null, name: string}[]>([{ id: null, name: 'Drive' }]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFolder = () => {
    const name = prompt('Folder Name:');
    if (name) setItems([...items, { id: Date.now(), type: 'folder', name, size: '--', url: null, parentId: currentFolder }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems = Array.from(e.target.files).map(file => {
        const url = URL.createObjectURL(file);
        return {
          id: Date.now() + Math.random(),
          type: 'file',
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          url: url,
          parentId: currentFolder
        };
      });
      setItems([...items, ...newItems]);
    }
  };

  const openItem = (item: any) => {
    if (item.type === 'file' && item.url) {
      window.open(item.url, '_blank');
    } else if (item.type === 'folder') {
      setCurrentFolder(item.id);
      setPath([...path, { id: item.id, name: item.name }]);
    }
  };

  const navigateTo = (index: number) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    setCurrentFolder(newPath[newPath.length - 1].id);
  };

  const deleteItem = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this item?')) {
      const getChildrenIds = (parentId: number): number[] => {
        const children = items.filter(item => item.parentId === parentId).map(item => item.id);
        let allIds = [...children];
        children.forEach(childId => {
          allIds = [...allIds, ...getChildrenIds(childId)];
        });
        return allIds;
      };
      
      const idsToDelete = [id, ...getChildrenIds(id)];
      setItems(items.filter(item => !idsToDelete.includes(item.id)));
    }
  };

  const currentItems = items.filter(item => item.parentId === currentFolder);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          {path.map((p, i) => (
            <span key={p.id || 'root'} className="flex items-center gap-2">
              <button 
                onClick={() => navigateTo(i)}
                className={`hover:text-indigo-600 transition ${i === path.length - 1 ? 'text-gray-800' : 'text-gray-400'}`}
              >
                {p.name}
              </button>
              {i < path.length - 1 && <span className="text-gray-300">/</span>}
            </span>
          ))}
        </h3>
        <div className="flex gap-2">
          <button onClick={addFolder} className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 font-semibold transition shadow-sm">+ Folder</button>
          
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 font-semibold transition shadow-sm">
            + Upload File
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {currentItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => openItem(item)}
              className="flex flex-col items-center p-4 bg-white rounded-xl hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 transition cursor-pointer shadow-sm group relative"
            >
              <button 
                onClick={(e) => deleteItem(e, item.id)}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-10 text-xs shadow-sm"
                title="Delete"
              >
                ✕
              </button>
              <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                {item.type === 'folder' ? '📂' : '📄'}
              </span>
              <div className="w-full text-center">
                <p className="font-semibold text-gray-700 text-sm truncate w-full" title={item.name}>{item.name}</p>
                <p className="text-xs font-mono text-gray-400 mt-1">{item.size}</p>
              </div>
            </div>
          ))}
        </div>
        {currentItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <span className="text-6xl mb-4">☁️</span>
            <p>Your drive is empty.</p>
            <p className="text-sm">Click "+ Upload File" to add documents.</p>
          </div>
        )}
      </div>
    </div>
  );
}
