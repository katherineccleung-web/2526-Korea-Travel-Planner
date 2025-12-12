import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy
} from 'firebase/firestore';
import { db, isMockMode } from './firebase';
import { TabType, ItineraryItem, Booking, Expense, ChecklistItem, Member } from './types';
import { ItineraryView } from './components/ItineraryView';
import { BookingsView } from './components/BookingsView';
import { ExpenseView } from './components/ExpenseView';
import { PlanningView } from './components/PlanningView';
import { Modal } from './components/ui/Modal';

// --- Constants ---
const TRAVEL_DATES = [
  '2025-12-24', '2025-12-25', '2025-12-26', '2025-12-27',
  '2025-12-28', '2025-12-29', '2025-12-30', '2025-12-31'
];

const INITIAL_MEMBERS_DATA = [
  { name: 'Simon' }, { name: 'Lily' }, { name: 'Katherine' },
  { name: 'Ashley' }, { name: 'Eric' }, { name: 'Alvin' }
];

// --- Local Storage Helpers ---
const STORAGE_KEYS = {
  ITINERARY: 'tpp_local_itinerary',
  BOOKINGS: 'tpp_local_bookings',
  EXPENSES: 'tpp_local_expenses',
  PLANNING: 'tpp_local_planning',
  MEMBERS: 'tpp_local_members',
  EXCHANGE_RATE: 'tpp_exchange_rate'
};

const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS);

const loadLocal = <T extends { id: string }>(key: string, defaultData: T[]): T[] => {
  if (typeof window === 'undefined') return defaultData;
  const saved = localStorage.getItem(key);
  if (!saved) return defaultData;

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return defaultData;
    
    // Ensure unique IDs and force string type
    const uniqueMap = new Map<string, T>();
    parsed.forEach((item: any) => {
      if (item && (item.id !== undefined && item.id !== null)) {
        item.id = String(item.id); 
        uniqueMap.set(item.id, item);
      }
    });
    
    return Array.from(uniqueMap.values());
  } catch (e) {
    console.error("Failed to load local data", e);
    return defaultData;
  }
};

const saveLocal = (key: string, data: any[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
};

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('itinerary');
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  
  // Data State
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [planningItems, setPlanningItems] = useState<ChecklistItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Exchange Rate State
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATE);
    return saved ? parseFloat(saved) : 0.0058;
  });
  
  // Modals
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tempRate, setTempRate] = useState(exchangeRate.toString());
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. Mock Mode Data Loading (Run ONCE) ---
  useEffect(() => {
    if (isMockMode) {
      // Members
      const localMembers = loadLocal<Member>(STORAGE_KEYS.MEMBERS, []);
      if (localMembers.length === 0) {
        const seedMembers = INITIAL_MEMBERS_DATA.map((m, i) => ({ id: `mem_${i}`, ...m } as Member));
        setMembers(seedMembers);
        saveLocal(STORAGE_KEYS.MEMBERS, seedMembers);
        setCurrentUser(seedMembers[0]);
      } else {
        setMembers(localMembers);
        setCurrentUser(localMembers[0]);
      }

      // Itinerary
      const seedItinerary: ItineraryItem[] = [
        { id: '1', date: '2025-12-24', time: '10:00', type: 'flight', city: '首爾', title: '抵達仁川機場', location: 'Incheon Airport', lat: 37.4602, lng: 126.4407, travelMode: 'subway' },
        { id: '2', date: '2025-12-24', time: '14:00', type: 'activity', city: '首爾', title: '飯店 Check-in', location: 'Myeongdong', lat: 37.5636, lng: 126.9837 },
        { id: '3', date: '2025-12-24', time: '18:00', type: 'activity', city: '首爾', title: '明洞晚餐', location: 'Myeongdong Night Market', lat: 37.5609, lng: 126.9863 }
      ];
      setItinerary(loadLocal<ItineraryItem>(STORAGE_KEYS.ITINERARY, seedItinerary));

      // Bookings
      setBookings(loadLocal<Booking>(STORAGE_KEYS.BOOKINGS, []));

      // Expenses
      setExpenses(loadLocal<Expense>(STORAGE_KEYS.EXPENSES, []));

      // Planning
      const seedPlanning: ChecklistItem[] = [
        { id: '1', text: '買 SIM 卡', isCompleted: false, type: 'todo' },
        { id: '2', text: '換韓幣', isCompleted: true, type: 'todo' },
        { id: '3', text: '大衣', isCompleted: false, type: 'shopping' }
      ];
      setPlanningItems(loadLocal<ChecklistItem>(STORAGE_KEYS.PLANNING, seedPlanning));
    }
  }, []);

  // --- 2. Real Firestore Subscriptions ---
  useEffect(() => {
    if (isMockMode) return;

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const ms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member));
      setMembers(ms);
      if (ms.length > 0 && !currentUser) {
         setCurrentUser(ms[0]);
      }
    });

    const unsubItinerary = onSnapshot(collection(db, 'itinerary'), (snapshot) => {
      setItinerary(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ItineraryItem)));
    });

    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setBookings(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
    });

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    });

    const unsubPlanning = onSnapshot(collection(db, 'planning'), (snapshot) => {
      setPlanningItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistItem)));
    });

    return () => {
      unsubMembers();
      unsubItinerary();
      unsubBookings();
      unsubExpenses();
      unsubPlanning();
    };
  }, [isMockMode]);

  useEffect(() => localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATE, exchangeRate.toString()), [exchangeRate]);

  // --- CRUD Operations ---
  const addItem = async (collectionName: string, item: any) => {
    if (isMockMode) {
      const newItem = { ...item, id: generateId() }; 
      switch(collectionName) {
        case 'itinerary': 
          setItinerary(prev => {
            const next = [...prev, newItem];
            saveLocal(STORAGE_KEYS.ITINERARY, next);
            return next;
          }); break;
        case 'bookings': 
          setBookings(prev => {
            const next = [...prev, newItem];
            saveLocal(STORAGE_KEYS.BOOKINGS, next);
            return next;
          }); break;
        case 'expenses': 
          setExpenses(prev => {
            const next = [...prev, newItem];
            saveLocal(STORAGE_KEYS.EXPENSES, next);
            return next;
          }); break;
        case 'planning': 
          setPlanningItems(prev => {
            const next = [...prev, newItem];
            saveLocal(STORAGE_KEYS.PLANNING, next);
            return next;
          }); break;
      }
      return;
    }
    // Online mode
    try {
      const { id, ...data } = item; 
      await addDoc(collection(db, collectionName), data);
    } catch (e) { console.error(e); }
  };

  const updateItem = async (collectionName: string, item: any) => {
    const targetId = String(item.id);
    if (isMockMode) {
      switch(collectionName) {
        case 'itinerary': 
          setItinerary(prev => {
             const next = prev.map(i => String(i.id) === targetId ? item : i);
             saveLocal(STORAGE_KEYS.ITINERARY, next);
             return next;
          }); break;
        case 'bookings': 
          setBookings(prev => {
             const next = prev.map(i => String(i.id) === targetId ? item : i);
             saveLocal(STORAGE_KEYS.BOOKINGS, next);
             return next;
          }); break;
        case 'expenses': 
          setExpenses(prev => {
             const next = prev.map(i => String(i.id) === targetId ? item : i);
             saveLocal(STORAGE_KEYS.EXPENSES, next);
             return next;
          }); break;
        case 'planning': 
          setPlanningItems(prev => {
             const next = prev.map(i => String(i.id) === targetId ? item : i);
             saveLocal(STORAGE_KEYS.PLANNING, next);
             return next;
          }); break;
      }
      return;
    }
    // Online mode
    try {
      const { id, ...data } = item;
      await updateDoc(doc(db, collectionName, id), data);
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (id === undefined || id === null) return;
    const targetId = String(id);
    console.log(`Deleting ${targetId} from ${collectionName}`);

    if (isMockMode) {
       switch(collectionName) {
        case 'itinerary': 
          setItinerary(prev => {
             const next = prev.filter(i => String(i.id) !== targetId);
             saveLocal(STORAGE_KEYS.ITINERARY, next);
             return next;
          }); break;
        case 'bookings': 
          setBookings(prev => {
             const next = prev.filter(i => String(i.id) !== targetId);
             saveLocal(STORAGE_KEYS.BOOKINGS, next);
             return next;
          }); break;
        case 'expenses': 
          setExpenses(prev => {
             const next = prev.filter(i => String(i.id) !== targetId);
             saveLocal(STORAGE_KEYS.EXPENSES, next);
             return next;
          }); break;
        case 'planning': 
          setPlanningItems(prev => {
             const next = prev.filter(i => String(i.id) !== targetId);
             saveLocal(STORAGE_KEYS.PLANNING, next);
             return next;
          }); break;
      }
      return;
    }
    // Online mode
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) { console.error(e); }
  };

  // --- Data Management Functions ---
  const handleExport = () => {
    const data: Record<string, any> = {};
    let hasData = false;

    ALL_STORAGE_KEYS.forEach(key => {
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
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `travel_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use simple alert flow instead of confirm to prevent blocking issues
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        Object.keys(json).forEach(key => {
          if (ALL_STORAGE_KEYS.includes(key)) {
            localStorage.setItem(key, JSON.stringify(json[key]));
          }
        });

        alert("匯入成功！頁面將重新整理。");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("檔案格式錯誤，匯入失敗");
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    // Simple prompt before clearing
    const ans = prompt("請輸入 'RESET' 確任清空所有資料:");
    if (ans === 'RESET') {
      localStorage.clear();
      window.location.reload();
    }
  };

  const saveExchangeRate = () => {
    const rate = parseFloat(tempRate);
    if (!isNaN(rate) && rate > 0) {
      setExchangeRate(rate);
      setIsRateModalOpen(false);
    }
  };

  const renderContent = () => {
    if (!currentUser) return <div className="p-4 text-center mt-10 text-gray-400">Loading members...</div>;

    switch (activeTab) {
      case 'itinerary': 
        return <ItineraryView items={itinerary} travelDates={TRAVEL_DATES} onAdd={(i) => addItem('itinerary', i)} onUpdate={(i) => updateItem('itinerary', i)} onDelete={(id) => deleteItem('itinerary', id)} />;
      case 'bookings': 
        return <BookingsView bookings={bookings} onAdd={(i) => addItem('bookings', i)} onDelete={(id) => deleteItem('bookings', id)} />;
      case 'expense': 
        return <ExpenseView expenses={expenses} setExpenses={() => {}} members={members} currentUser={currentUser} exchangeRate={exchangeRate} onAdd={(i) => addItem('expenses', i)} onDelete={(id) => deleteItem('expenses', id)} />;
      case 'planning': 
        return <PlanningView items={planningItems} onAdd={(i) => addItem('planning', i)} onUpdate={(i) => updateItem('planning', i)} onDelete={(id) => deleteItem('planning', id)} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-muji-bg min-h-screen flex flex-col relative shadow-2xl">
      <header className="p-4 pt-6 flex justify-between items-center bg-muji-bg sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div>
          <h1 className="text-lg font-bold tracking-widest text-muji-text">TRAVEL LOG</h1>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-muji-subtle">Hi, {currentUser?.name || '...'}</p>
            {isMockMode && <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded font-bold border border-gray-200">Local Mode</span>}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setTempRate(exchangeRate.toString()); setIsRateModalOpen(true); }} className="text-right hover:opacity-70 transition-opacity">
            <span className="text-muji-subtle text-xs font-medium block">匯率設定</span>
            <p className="text-muji-text font-semibold text-sm font-mono">1:{exchangeRate}</p>
          </button>
          <button onClick={() => setIsSettingsModalOpen(true)} className="text-2xl text-muji-text hover:text-muji-accent">
            ⚙️
          </button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto no-scrollbar pb-28">
        {renderContent()}
      </main>

      <nav className="bg-white/95 backdrop-blur-sm fixed bottom-0 left-0 right-0 max-w-md mx-auto flex justify-around border-t border-gray-200 z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <NavButton isActive={activeTab === 'itinerary'} onClick={() => setActiveTab('itinerary')} icon="📅" label="行程" />
        <NavButton isActive={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} icon="🎫" label="預訂" />
        <NavButton isActive={activeTab === 'planning'} onClick={() => setActiveTab('planning')} icon="📝" label="清單" />
        <NavButton isActive={activeTab === 'expense'} onClick={() => setActiveTab('expense')} icon="💰" label="記帳" />
      </nav>

      {/* Exchange Rate Modal */}
      <Modal isOpen={isRateModalOpen} onClose={() => setIsRateModalOpen(false)} title="設定匯率">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">1 韓元 (KRW) 對換 港幣 (HKD)</label>
            <input 
              type="number" step="0.0001" value={tempRate}
              onChange={e => setTempRate(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-lg font-mono text-lg font-bold text-center border focus:border-muji-accent focus:outline-none"
            />
          </div>
          <button onClick={saveExchangeRate} className="w-full bg-muji-accent text-white py-3 rounded-lg font-bold">儲存設定</button>
        </div>
      </Modal>

      {/* Settings / Data Modal */}
      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="設定與資料">
         <div className="space-y-6">
           
           {/* User Switcher */}
           <div>
             <h4 className="text-sm font-bold text-muji-text mb-2">切換目前使用者</h4>
             <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => setCurrentUser(m)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${currentUser?.id === m.id ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {m.name} {currentUser?.id === m.id && '✓'}
                  </button>
                ))}
             </div>
             <p className="text-[10px] text-gray-400 mt-1">用於記帳時預設的「付款人」</p>
           </div>

           <div className="border-t border-gray-100 pt-4">
             <h4 className="text-sm font-bold text-muji-text mb-3">資料備份 (JSON)</h4>
             <div className="flex gap-3">
                <button 
                  onClick={handleExport}
                  className="flex-1 bg-gray-800 text-white py-3 rounded-lg font-bold text-sm shadow-sm active:scale-95 transition-transform"
                >
                  匯出備份
                </button>
                <button 
                  onClick={handleImportClick}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-bold text-sm shadow-sm active:bg-gray-50 transition-colors"
                >
                  匯入還原
                </button>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
             </div>
           </div>

           <div className="border-t border-gray-100 pt-4 text-center">
             <button onClick={handleClearData} className="text-xs text-red-400 hover:text-red-600 underline">
               重置所有應用程式資料
             </button>
           </div>
         </div>
      </Modal>

    </div>
  );
};

const NavButton: React.FC<{isActive: boolean, onClick: () => void, icon: string, label: string}> = ({ isActive, onClick, icon, label }) => {
  return (
    <button onClick={onClick} className={`flex-1 py-3 flex flex-col items-center justify-center transition-all duration-200 active:scale-95 ${isActive ? 'text-muji-accent' : 'text-gray-300'}`}>
      <span className={`text-xl mb-0.5 filter ${isActive ? 'grayscale-0' : 'grayscale opacity-70'}`}>{icon}</span>
      <span className={`text-[10px] font-bold ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  );
};

export default App;