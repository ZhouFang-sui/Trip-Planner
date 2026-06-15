'use client';
import { useState } from 'react';

export interface Expense {
  id: number;
  date: string;
  title: string;
  payer: string;
  amount: number;
  proportions: string;
  note: string;
}

// A single raw debt: [from] owes [to] [amount] because of [because]
interface RawDebt { from: string; to: string; amount: number; because: string; }

interface ExpenseTabProps {
  currency?: string;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  itineraryDates: string[];
}

export default function ExpenseTab({ currency = '$', expenses, setExpenses, itineraryDates }: ExpenseTabProps) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'summary'>('expenses');
  const [selectedDate, setSelectedDate] = useState<string>('all');

  const addExpense = () =>
    setExpenses(prev => [...prev, { id: Date.now(), date: new Date().toISOString().split('T')[0], title: '', payer: '', amount: 0, proportions: '', note: '' }]);
  const updateExpense = (id: number, field: keyof Expense, value: string | number) =>
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  const deleteExpense = (id: number) => setExpenses(prev => prev.filter(e => e.id !== id));

  /**
   * Parse the split field and return each person's share amount.
   * e.g. "Bob, Charlie" => Bob: 100, Charlie: 100 (equal split)
   * e.g. "Alice 400, Charlie 300" => Alice: 400, Charlie: 300
   * Payer is included in equal split unless explicitly listed.
   */
  const parseShares = (exp: Expense): Record<string, number> => {
    const amount = parseFloat(String(exp.amount)) || 0;
    if (!exp.payer.trim() || amount === 0) return {};

    const payer = exp.payer.toLowerCase().trim();
    const raw = exp.proportions.split(',').map(s => s.trim()).filter(Boolean);
    const customShares: Record<string, number> = {};
    const genericNames: string[] = [];

    raw.forEach(s => {
      const nameMatch = s.match(/^([a-zA-Z\s]+)/);
      const numMatch = s.match(/[\d.]+/);
      if (nameMatch) {
        const n = nameMatch[1].toLowerCase().trim();
        if (numMatch) customShares[n] = (customShares[n] || 0) + parseFloat(numMatch[0]);
        else genericNames.push(n);
      }
    });

    // Include payer in equal split unless they're explicitly in custom shares or generic list
    if (payer && !(payer in customShares) && !genericNames.includes(payer)) {
      genericNames.push(payer);
    }

    const customTotal = Object.values(customShares).reduce((s, v) => s + v, 0);
    const remaining = Math.max(0, amount - customTotal);
    const perHead = genericNames.length > 0 ? remaining / genericNames.length : 0;

    const shares: Record<string, number> = { ...customShares };
    genericNames.forEach(n => { shares[n] = (shares[n] || 0) + perHead; });
    return shares;
  };

  /**
   * Returns raw debts per expense: each non-payer member who owes the payer.
   * No netting, no minimization — exactly as the user entered.
   */
  const computeRawDebts = (list: Expense[]): RawDebt[] => {
    const debts: RawDebt[] = [];
    list.forEach(exp => {
      const amount = parseFloat(String(exp.amount)) || 0;
      if (!exp.payer.trim() || amount === 0) return;
      const payer = exp.payer.toLowerCase().trim();
      const shares = parseShares(exp);

      Object.entries(shares).forEach(([person, share]) => {
        if (person === payer) return; // payer doesn't owe themselves
        if (share > 0.01) {
          debts.push({ from: person, to: payer, amount: share, because: exp.title || 'Expense' });
        }
      });
    });
    return debts;
  };

  const allDates = [...new Set(expenses.map(e => e.date))].sort();
  const filteredExpenses = selectedDate === 'all' ? expenses : expenses.filter(e => e.date === selectedDate);
  const rawDebts = computeRawDebts(filteredExpenses);
  const dayTotal = filteredExpenses.reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0);

  // Aggregate debts by (from → to) pair for the summary view
  const aggregated: Record<string, { from: string; to: string; total: number; items: string[] }> = {};
  rawDebts.forEach(d => {
    const key = `${d.from}→${d.to}`;
    if (!aggregated[key]) aggregated[key] = { from: d.from, to: d.to, total: 0, items: [] };
    aggregated[key].total += d.amount;
    aggregated[key].items.push(`${d.because} (${currency}${d.amount.toFixed(2)})`);
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 shrink-0 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-lg">💰 Expense Splitter</h3>
          <button onClick={addExpense} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm rounded-lg hover:bg-emerald-200 font-semibold transition">+ Add</button>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex bg-white border border-gray-200 rounded-lg p-1 gap-1">
            <button onClick={() => setActiveTab('expenses')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${activeTab === 'expenses' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>Expenses</button>
            <button onClick={() => setActiveTab('summary')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${activeTab === 'summary' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>Settlement</button>
          </div>
          <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white focus:border-emerald-400">
            <option value="all">All Days</option>
            {allDates.map(d => {
              const idx = itineraryDates.indexOf(d);
              const label = idx !== -1 ? `Day ${idx + 1}` : new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <option key={d} value={d}>{label} ({new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})</option>
              );
            })}
          </select>
          <div className="ml-auto text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
            Total: {currency}{dayTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Expense Table */}
      {activeTab === 'expenses' && (
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="pb-2 pl-2 font-semibold text-gray-400 uppercase text-xs border-b w-28">Date</th>
                <th className="pb-2 px-2 font-semibold text-gray-400 uppercase text-xs border-b">Title</th>
                <th className="pb-2 px-2 font-semibold text-gray-400 uppercase text-xs border-b">Amount ({currency})</th>
                <th className="pb-2 px-2 font-semibold text-gray-400 uppercase text-xs border-b">Paid by</th>
                <th className="pb-2 px-2 font-semibold text-gray-400 uppercase text-xs border-b">
                  Split with
                  <span className="ml-1 text-gray-300 font-normal normal-case">(Name or Name:Amt)</span>
                </th>
                <th className="pb-2 px-2 font-semibold text-gray-400 uppercase text-xs border-b">Note</th>
                <th className="pb-2 pr-2 w-8 border-b"></th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(exp => {
                const shares = parseShares(exp);
                const payer = exp.payer.toLowerCase().trim();
                return (
                  <tr key={exp.id} className="group hover:bg-gray-50 transition-colors border-t border-gray-50">
                    <td className="py-2 pl-2 pr-1 flex flex-col gap-1">
                      <input type="date" value={exp.date} onChange={e => updateExpense(exp.id, 'date', e.target.value)} className="w-full bg-transparent text-xs text-gray-500 outline-none focus:bg-white border border-transparent focus:border-emerald-300 rounded px-1 py-0.5" />
                      {(() => {
                        const idx = itineraryDates.indexOf(exp.date);
                        if (idx !== -1) {
                          return (
                            <span className="text-[10px] w-fit font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shadow-sm border border-emerald-200">
                              Day {idx + 1}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td className="py-2 px-2"><input value={exp.title} onChange={e => updateExpense(exp.id, 'title', e.target.value)} placeholder="Title" className="w-full bg-transparent outline-none border border-transparent focus:border-emerald-300 focus:bg-white rounded px-1 py-0.5 font-medium" /></td>
                    <td className="py-2 px-2"><input type="number" value={exp.amount || ''} onChange={e => updateExpense(exp.id, 'amount', e.target.value)} placeholder="0.00" className="w-20 bg-transparent outline-none border border-transparent focus:border-emerald-300 focus:bg-white rounded px-1 py-0.5 font-semibold text-emerald-600" /></td>
                    <td className="py-2 px-2"><input value={exp.payer} onChange={e => updateExpense(exp.id, 'payer', e.target.value)} placeholder="Name" className="w-full bg-transparent outline-none border border-transparent focus:border-emerald-300 focus:bg-white rounded px-1 py-0.5 font-medium" /></td>
                    <td className="py-2 px-2">
                      <input value={exp.proportions} onChange={e => updateExpense(exp.id, 'proportions', e.target.value)} placeholder="Bob, Charlie..." className="w-full bg-transparent outline-none border border-transparent focus:border-emerald-300 focus:bg-white rounded px-1 py-0.5 text-gray-500" />
                      {/* Show parsed shares inline */}
                      {Object.keys(shares).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(shares).map(([n, v]) => (
                            <span key={n} className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${n === payer ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                              {n}: {currency}{v.toFixed(2)}{n === payer ? ' (payer)' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2"><input value={exp.note} onChange={e => updateExpense(exp.id, 'note', e.target.value)} placeholder="Note..." className="w-full bg-transparent outline-none border border-transparent focus:border-emerald-300 focus:bg-white rounded px-1 py-0.5 text-gray-400" /></td>
                    <td className="py-2 pr-2 text-right"><button onClick={() => deleteExpense(exp.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1 bg-white rounded shadow-sm border border-gray-100">✕</button></td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No expenses. Click &quot;+ Add&quot;!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Settlement Tab */}
      {activeTab === 'summary' && (
        <div className="flex-1 overflow-auto p-5 space-y-6">

          {/* Per-expense breakdown */}
          <div>
            <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">📋 Per-Expense Breakdown</h4>
            {filteredExpenses.filter(e => e.payer.trim() && parseFloat(String(e.amount)) > 0).length === 0 ? (
              <p className="text-sm text-gray-400 italic">Add expenses with a payer to see breakdown.</p>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.filter(e => e.payer.trim() && parseFloat(String(e.amount)) > 0).map(exp => {
                  const shares = parseShares(exp);
                  const payer = exp.payer.toLowerCase().trim();
                  const debtsForExp = Object.entries(shares).filter(([n]) => n !== payer);
                  return (
                    <div key={exp.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{exp.title || 'Expense'}</span>
                          {exp.date && (() => {
                            const idx = itineraryDates.indexOf(exp.date);
                            const dayLabel = idx !== -1 ? `Day ${idx + 1}` : new Date(exp.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            return (
                              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 shadow-sm">
                                {dayLabel} {idx !== -1 ? `(${new Date(exp.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})` : ''}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 capitalize"><span className="font-semibold text-emerald-700">{exp.payer}</span> paid</span>
                          <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{currency}{parseFloat(String(exp.amount)).toFixed(2)}</span>
                        </div>
                      </div>
                      {debtsForExp.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 italic">No one else listed in split.</div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {debtsForExp.map(([person, owed]) => (
                            <div key={person} className="flex items-center gap-3 px-4 py-2.5">
                              <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-black text-xs uppercase shrink-0">{person[0]}</div>
                              <span className="font-semibold text-gray-800 capitalize flex-1">{person}</span>
                              <div className="flex items-center gap-1.5 text-sm">
                                <span className="text-gray-400">needs to pay</span>
                                <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">{currency}{owed.toFixed(2)}</span>
                                <span className="text-gray-400">→</span>
                                <span className="font-semibold text-gray-800 capitalize">{exp.payer}</span>
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs uppercase shrink-0">{exp.payer[0]}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aggregated total settlements */}
          {Object.keys(aggregated).length > 0 && (
            <div>
              <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">🤝 Total Amount Each Person Owes</h4>
              <div className="space-y-2">
                {Object.values(aggregated).sort((a, b) => b.total - a.total).map((agg, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-black text-sm uppercase shrink-0">{agg.from[0]}</div>
                    <div className="flex-1">
                      <span className="font-semibold text-gray-800 capitalize">{agg.from}</span>
                      <div className="text-xs text-gray-400 mt-0.5">{agg.items.join(' + ')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">pays total</span>
                      <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-sm">{currency}{agg.total.toFixed(2)}</span>
                      <span className="text-gray-400">→</span>
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm uppercase shrink-0">{agg.to[0]}</div>
                      <span className="font-semibold text-gray-800 capitalize">{agg.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
