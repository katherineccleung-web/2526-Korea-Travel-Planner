import React, { useState } from 'react';
import { ChecklistItem } from '../types';

interface PlanningViewProps {
  items: ChecklistItem[];
  onAdd: (item: ChecklistItem) => void;
  onUpdate: (item: ChecklistItem) => void;
  onDelete: (id: string) => void;
}

export const PlanningView: React.FC<PlanningViewProps> = ({ items, onAdd, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'shopping'|'todo'>('shopping');
  const [newItemText, setNewItemText] = useState('');

  const filtered = items.filter(i => i.type === activeTab);

  const addItem = () => {
    if(!newItemText.trim()) return;
    onAdd({
      id: Date.now().toString(),
      text: newItemText.trim(),
      isCompleted: false,
      type: activeTab
    });
    setNewItemText('');
  };

  const toggleItem = (item: ChecklistItem) => {
    onUpdate({ ...item, isCompleted: !item.isCompleted });
  };

  const deleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <div className="px-4 pt-2 pb-20">
      {/* Sub Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {[
          { id: 'shopping', icon: '🛍️', label: '購物' },
          { id: 'todo', icon: '✅', label: '待辦' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === tab.id ? 'border-muji-accent text-muji-accent' : 'border-transparent text-gray-400'}`}
          >
            <span className="mr-1">{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-4">
        <input 
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          placeholder={`新增${activeTab === 'shopping' ? '購物' : '待辦'}項目...`}
          className="flex-grow p-3 bg-white border border-gray-200 rounded-lg shadow-sm focus:border-muji-accent focus:outline-none"
          onKeyDown={e => e.key === 'Enter' && addItem()}
        />
        <button onClick={addItem} className="bg-muji-accent text-white px-4 rounded-lg font-bold shadow-soft active:shadow-none active:translate-y-1 transition-all">
          +
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && <div className="text-center text-gray-400 text-sm py-4">清單是空的</div>}
        
        {filtered.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-transparent hover:border-gray-200 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden cursor-pointer flex-grow" onClick={() => toggleItem(item)}>
               <button 
                 className={`w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${item.isCompleted ? 'bg-muji-accent border-muji-accent' : 'bg-white border-gray-300'}`}
               >
                 {item.isCompleted && <span className="text-white text-xs">✓</span>}
               </button>
               <span className={`truncate text-sm ${item.isCompleted ? 'text-gray-300 line-through' : 'text-muji-text'}`}>
                 {item.text}
               </span>
            </div>
            <button 
              onClick={(e) => deleteItem(e, item.id)} 
              className="relative z-10 text-gray-300 hover:text-red-500 p-3 -mr-3"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};