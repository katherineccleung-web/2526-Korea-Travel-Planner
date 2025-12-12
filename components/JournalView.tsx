import React, { useState } from 'react';
import { JournalEntry, Member } from '../types';
import { Modal } from './ui/Modal';

interface JournalViewProps {
  entries: JournalEntry[];
  setEntries: (entries: JournalEntry[]) => void;
  currentUser: Member;
}

export const JournalView: React.FC<JournalViewProps> = ({ entries, setEntries, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');

  const addEntry = () => {
    if (!content) return;
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      authorId: currentUser.id, // Use current user ID
      content,
      photos: [], 
      likes: []
    };
    setEntries([entry, ...entries]);
    setIsModalOpen(false);
    setContent('');
  };

  return (
    <div className="px-4 pt-2 pb-20">
      <div className="flex items-center space-x-2 mb-6">
         <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">👤</div>
         <button 
          onClick={() => setIsModalOpen(true)}
          className="flex-grow bg-white border border-gray-200 rounded-full py-3 px-4 text-left text-gray-400 text-sm hover:bg-gray-50 transition-colors shadow-sm"
        >
          {currentUser.name}, 今天發生了什麼事？
        </button>
      </div>

      <div className="space-y-6">
        {entries.map(entry => (
          <div key={entry.id} className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
             <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                      {/* Usually we'd look up the author name from the members list, using current user for simplicity or ID check */}
                      {entry.authorId === currentUser.id ? 'Me' : 'User'}
                   </div>
                   <div>
                     <p className="text-xs font-bold">{entry.authorId === currentUser.id ? currentUser.name : '旅伴'}</p>
                     <p className="text-[10px] text-gray-400">{new Date(entry.date).toLocaleString()}</p>
                   </div>
                </div>
                <p className="text-muji-text text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
             </div>
             {/* Fake Action Bar */}
             <div className="bg-gray-50 p-3 flex gap-4 text-gray-400 text-xs">
                <span>❤️ Like</span>
                <span>💬 Comment</span>
             </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="寫日誌">
         <textarea 
           className="w-full p-3 bg-gray-50 rounded-lg h-32 mb-4 focus:ring-2 focus:ring-muji-accent focus:bg-white"
           placeholder={`以 ${currentUser.name} 的身份發佈...`}
           value={content}
           onChange={e => setContent(e.target.value)}
         ></textarea>
         <button onClick={addEntry} className="w-full bg-muji-accent text-white py-3 rounded-lg font-bold">發佈</button>
      </Modal>
    </div>
  );
};