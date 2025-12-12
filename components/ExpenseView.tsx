import React, { useState, useMemo } from 'react';
import { Expense, Member } from '../types';
import { Modal } from './ui/Modal';

interface ExpenseViewProps {
  expenses: Expense[];
  setExpenses: (exps: Expense[]) => void; // Kept for interface compatibility, but App uses onAdd/onDelete
  onAdd: (exp: Expense) => void;
  onDelete: (id: string) => void;
  members: Member[];
  currentUser: Member;
  exchangeRate: number;
}

export const ExpenseView: React.FC<ExpenseViewProps> = ({ expenses, onAdd, onDelete, members, currentUser, exchangeRate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    currency: 'KRW', type: 'public'
  });

  // Filter: Show Public OR (Private AND PaidByMe)
  const visibleExpenses = expenses.filter(exp => 
    exp.type === 'public' || (exp.type === 'private' && exp.paidByMemberId === currentUser.id)
  );

  // Stats Logic
  const stats = useMemo(() => {
    let totalHKD = 0;
    let publicHKD = 0;
    let privateHKD = 0;
    
    visibleExpenses.forEach(e => {
      // Calculate HKD Amount based on stored rate or current?
      // For accurate accounting, we should ideally use the rate at time of purchase, 
      // but for this simplified requirement, we use the global rate passed down.
      const rate = e.currency === 'KRW' ? exchangeRate : 1;
      const amountHKD = e.amount * rate;
      
      totalHKD += amountHKD;
      if (e.type === 'public') publicHKD += amountHKD;
      else privateHKD += amountHKD;
    });

    return { totalHKD, publicHKD, privateHKD };
  }, [visibleExpenses, exchangeRate]);

  const handleAdd = () => {
    if (!newExpense.amount || !newExpense.description) return;
    
    // Explicitly set split members if public
    const splitIds = newExpense.type === 'public' ? members.map(m => m.id) : [];

    const exp: Expense = {
      id: Date.now().toString(), // Will be overwritten by Firestore ID usually, but good for local optimistic UI
      date: new Date().toISOString(),
      description: newExpense.description,
      amount: parseFloat(newExpense.amount as any),
      currency: newExpense.currency || 'KRW',
      exchangeRateToBase: exchangeRate,
      type: newExpense.type || 'public',
      category: 'food',
      paidByMemberId: currentUser.id,
      splitBetweenMemberIds: splitIds
    };
    
    onAdd(exp);
    setIsModalOpen(false);
    setNewExpense({ currency: 'KRW', type: 'public' });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  const memberNames = members.map(m => m.name).join(', ');

  return (
    <div className="px-4 pt-2 pb-20">
      {/* Dashboard */}
      <div className="bg-white rounded-xl p-5 shadow-soft border border-gray-100 mb-6">
          <div className="text-center mb-4 pb-4 border-b border-gray-100">
              <p className="text-xs text-muji-subtle uppercase tracking-widest">Total Expense (Visible)</p>
              <p className="text-4xl font-bold tracking-tight text-muji-text my-1">
                <span className="text-sm align-top text-gray-400 mr-1">HKD</span>
                {stats.totalHKD.toFixed(0)}
              </p>
          </div>
          <div className="flex justify-between text-center">
              <div className="w-1/2 border-r border-gray-100 pr-2">
                  <p className="text-[10px] text-muji-subtle mb-1">公數 (Shared)</p>
                  <p className="text-lg font-bold text-blue-600">${stats.publicHKD.toFixed(0)}</p>
                  <p className="text-[9px] text-gray-400 mt-1">
                    每人 ({members.length}): ${(members.length > 0 ? stats.publicHKD / members.length : 0).toFixed(0)}
                  </p>
              </div>
              <div className="w-1/2 pl-2">
                  <p className="text-[10px] text-muji-subtle mb-1">我的私數 (My Private)</p>
                  <p className="text-lg font-bold text-gray-600">${stats.privateHKD.toFixed(0)}</p>
              </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-50 text-center">
            <p className="text-[9px] text-gray-400">公數分攤人: {memberNames}</p>
          </div>
      </div>

      {/* Quick Add Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-muji-accent text-white py-3 rounded-lg font-bold shadow-soft mb-6 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
      >
        <span>✎ 記一筆 ({currentUser.name})</span>
      </button>

      {/* List */}
      <div className="space-y-3">
        {visibleExpenses.map(exp => (
          <div key={exp.id} className="bg-white rounded-lg p-3 flex justify-between items-center shadow-sm border border-gray-100 animate-fade-in">
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${exp.type === 'public' ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
                  {exp.type === 'public' ? '👥' : '👤'}
                </div>
                <div>
                   <p className="font-bold text-sm text-muji-text">{exp.description}</p>
                   <p className="text-[10px] text-gray-400">
                     {new Date(exp.date).toLocaleDateString()} • {exp.paidByMemberId === currentUser.id ? 'Me' : members.find(m => m.id === exp.paidByMemberId)?.name}
                   </p>
                </div>
             </div>
             <div className="text-right">
                <p className={`font-bold font-mono ${exp.type === 'public' ? 'text-blue-600' : 'text-gray-600'}`}>
                  {exp.currency} {exp.amount.toLocaleString()}
                </p>
                {exp.currency !== 'HKD' && (
                  <p className="text-[10px] text-gray-400">≈ HKD {(exp.amount * exchangeRate).toFixed(0)}</p>
                )}
                <button onClick={(e) => handleDelete(e, exp.id)} className="text-[10px] text-red-300 mt-1 hover:text-red-500 block ml-auto px-2 py-1">刪除</button>
             </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="新增支出">
        <div className="space-y-3">
          <div className="text-xs text-gray-500 mb-1">付款人: {currentUser.name}</div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
             <button 
               onClick={() => setNewExpense({...newExpense, type: 'public'})}
               className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newExpense.type === 'public' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
             >
               公數 (Shared)
             </button>
             <button 
               onClick={() => setNewExpense({...newExpense, type: 'private'})}
               className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newExpense.type === 'private' ? 'bg-white shadow-sm text-gray-600' : 'text-gray-500'}`}
             >
               私數 (Private)
             </button>
          </div>
          
          <input 
            placeholder="項目 (例: 晚餐)" 
            className="w-full p-3 bg-gray-50 rounded-lg"
            value={newExpense.description || ''}
            onChange={e => setNewExpense({...newExpense, description: e.target.value})}
          />
          
          <div className="flex space-x-2">
            <input 
              type="number" 
              inputMode="decimal"
              placeholder="金額" 
              className="w-2/3 p-3 bg-gray-50 rounded-lg font-mono"
              value={newExpense.amount || ''}
              onChange={e => setNewExpense({...newExpense, amount: e.target.value as any})}
            />
            <select 
              className="w-1/3 p-3 bg-gray-50 rounded-lg font-mono text-sm"
              value={newExpense.currency}
              onChange={e => setNewExpense({...newExpense, currency: e.target.value})}
            >
              <option value="KRW">KRW</option>
              <option value="HKD">HKD</option>
            </select>
          </div>

          <div className="text-xs text-gray-400 text-center">
            匯率: 1 {newExpense.currency} ≈ {newExpense.currency === 'KRW' ? exchangeRate : 1} HKD
          </div>
          
          {newExpense.type === 'public' && (
             <p className="text-[10px] text-blue-500 text-center bg-blue-50 py-1 rounded">
               將由 {members.length} 人分攤: {memberNames}
             </p>
          )}

          <button onClick={handleAdd} className="w-full bg-muji-accent text-white py-3 rounded-lg font-bold shadow-soft active:translate-y-1 active:shadow-none transition-all mt-2">
            確認新增
          </button>
        </div>
      </Modal>
    </div>
  );
};