import React, { useRef } from 'react';
import { Member } from '../types';

interface MembersViewProps {
  members: Member[];
  currentUser: Member;
  setCurrentUser: (member: Member) => void;
}

const STORAGE_KEYS = [
  'tpp_local_itinerary',
  'tpp_local_bookings',
  'tpp_local_expenses',
  'tpp_local_planning',
  'tpp_local_members',
  'tpp_exchange_rate'
];

export const MembersView: React.FC<MembersViewProps> = ({ members, currentUser, setCurrentUser }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Export Data ---
  const handleExport = () => {
    const data: Record<string, any> = {};
    let hasData = false;

    STORAGE_KEYS.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        data[key] = JSON.parse(item);
        hasData = true;
      }
    });

    if (!hasData) {
      alert("目前沒有資料可以匯出");
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Format: travel_backup_2025-10-20.json
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `travel_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Import Data ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ 警告：匯入檔案將會「覆蓋」您手機上目前的現有資料。\n\n確定要繼續嗎？")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Restore to LocalStorage
        Object.keys(json).forEach(key => {
          if (STORAGE_KEYS.includes(key)) {
            localStorage.setItem(key, JSON.stringify(json[key]));
          }
        });

        alert("匯入成功！頁面將重新整理以載入新資料。");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("檔案格式錯誤，匯入失敗");
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (confirm("⚠️ 危險操作：這將清空所有行程、記帳與資料且無法復原。\n\n確定要重置嗎？")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="px-4 pt-2 pb-20">
      
      {/* Sync / Data Management Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-muji-text">資料同步與分享</h2>
        <div className="bg-white p-5 rounded-xl shadow-soft border border-gray-100">
           <p className="text-sm text-gray-500 mb-4 leading-relaxed">
             目前為<span className="font-bold text-muji-accent">離線模式</span>。若要將行程分享給朋友，請先「匯出」檔案，傳給朋友後，請他們使用「匯入」功能。
           </p>
           
           <div className="flex gap-3 mb-4">
             <button 
               onClick={handleExport}
               className="flex-1 bg-muji-accent text-white py-3 rounded-lg font-bold shadow-md active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
             >
               <span>📤</span> 匯出檔案
             </button>
             <button 
               onClick={handleImportClick}
               className="flex-1 bg-white border border-gray-300 text-muji-text py-3 rounded-lg font-bold shadow-sm active:bg-gray-50 transition-all flex items-center justify-center gap-2"
             >
               <span>📥</span> 匯入檔案
             </button>
             <input 
               type="file" 
               accept=".json" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
               className="hidden" 
             />
           </div>

           <button 
             onClick={handleClearData}
             className="w-full text-xs text-red-300 hover:text-red-500 underline py-2"
           >
             重置所有資料 (清空)
           </button>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 text-muji-text">成員切換</h2>
      
      {/* User Switcher for Demo */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6">
        <p className="text-xs text-blue-600 font-bold uppercase mb-2">身份設定 (Local)</p>
        <p className="text-sm text-gray-600 mb-2">我是誰？(用於記帳與日誌)：</p>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <button 
              key={m.id}
              onClick={() => setCurrentUser(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${currentUser.id === m.id ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {m.name} {currentUser.id === m.id && '(Me)'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {members.map(m => (
          <div key={m.id} className={`bg-white p-4 rounded-xl shadow-soft border flex flex-col items-center transition-colors ${currentUser.id === m.id ? 'border-blue-300' : 'border-gray-100'}`}>
            <div className="w-16 h-16 rounded-full bg-gray-200 mb-3 overflow-hidden border-2 border-white shadow-sm">
               {/* Avatar Placeholder */}
               <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                 {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} /> : '👤'}
               </div>
            </div>
            <p className="font-bold text-muji-text">{m.name}</p>
            <p className="text-xs text-gray-400">{currentUser.id === m.id ? '目前登入' : '旅伴'}</p>
          </div>
        ))}
        <button className="bg-gray-50 border-2 border-dashed border-gray-300 p-4 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-muji-accent hover:text-muji-accent transition-colors">
           <span className="text-2xl mb-1">+</span>
           <span className="text-xs font-bold">邀請朋友</span>
        </button>
      </div>
    </div>
  );
};
