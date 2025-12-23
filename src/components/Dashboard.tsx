'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Transaction, CATEGORIES, MONTHS, DAYS } from '@/types';
import {
  getTransactionsByMonth,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  calculateSummary,
  exportToCSV,
} from '@/lib/transactions';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 1));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick Notes Sidebar
  const [showNotes, setShowNotes] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // Form state
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('food');
  const [formDate, setFormDate] = useState('');
  const [formIsSplit, setFormIsSplit] = useState(false);
  const [formSplitWith, setFormSplitWith] = useState('');
  const [formSplitAmount, setFormSplitAmount] = useState('');
  const [formSplitStatus, setFormSplitStatus] = useState<'pending' | 'received'>('pending');

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getTransactionsByMonth(
        user.uid,
        currentDate.getFullYear(),
        currentDate.getMonth()
      );
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
    setLoading(false);
  }, [user, currentDate]);

  // Load quick notes
  const loadNotes = useCallback(async () => {
    if (!user) return;
    try {
      const noteDoc = await getDoc(doc(db, 'notes', user.uid));
      if (noteDoc.exists()) {
        setQuickNote(noteDoc.data().content || '');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTransactions();
    loadNotes();
  }, [loadTransactions, loadNotes]);

  // Save notes
  const saveNotes = async () => {
    if (!user) return;
    setNoteSaving(true);
    try {
      await setDoc(doc(db, 'notes', user.uid), {
        content: quickNote,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error saving notes:', error);
    }
    setNoteSaving(false);
  };

  // Auto-save notes when content changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (quickNote && user) {
        saveNotes();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [quickNote]);

  // Get transactions for selected date
  const selectedDateStr = formatDate(selectedDate);
  const dateTransactions = transactions.filter((t) => t.date === selectedDateStr);
  const summary = calculateSummary(transactions);

  // Get dates with transactions for the calendar
  const datesWithTransactions = new Set(transactions.map((t) => t.date));

  // Calendar strip dates
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  function formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
  }

  function changeMonth(delta: number) {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
    setSelectedDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
  }

  function selectMonth(monthIndex: number) {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
    setSelectedDate(new Date(currentDate.getFullYear(), monthIndex, 1));
    setShowMonthPicker(false);
  }

  function selectYear(year: number) {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
    setSelectedDate(new Date(year, currentDate.getMonth(), 1));
    setShowYearPicker(false);
  }

  function openModal(type: 'expense' | 'income', transaction?: Transaction) {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormType(transaction.type);
      setFormAmount(String(transaction.amount));
      setFormDescription(transaction.description);
      setFormCategory(transaction.category);
      setFormDate(transaction.date);
      setFormIsSplit(transaction.isSplit || false);
      setFormSplitWith(transaction.splitWith || '');
      setFormSplitAmount(String(transaction.splitAmount || ''));
      setFormSplitStatus(transaction.splitStatus || 'pending');
    } else {
      setEditingTransaction(null);
      setFormType(type);
      setFormAmount('');
      setFormDescription('');
      setFormCategory('food');
      setFormDate(formatDate(selectedDate));
      setFormIsSplit(false);
      setFormSplitWith('');
      setFormSplitAmount('');
      setFormSplitStatus('pending');
    }
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!user || !formAmount || !formDescription) return;

    const data = {
      type: formType,
      amount: parseFloat(formAmount),
      description: formDescription,
      category: formType === 'expense' ? formCategory : 'income',
      date: formDate,
      isSplit: formType === 'expense' ? formIsSplit : false,
      splitWith: formIsSplit ? formSplitWith : undefined,
      splitAmount: formIsSplit ? parseFloat(formSplitAmount) : undefined,
      splitStatus: formIsSplit ? formSplitStatus : undefined,
    };

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data);
      } else {
        await createTransaction(user.uid, data);
      }
      setShowModal(false);
      loadTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deleteTransaction(deletingId);
      setShowDeleteModal(false);
      setDeletingId(null);
      loadTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  }

  function handleExport() {
    const filename = `expenses_${currentDate.getFullYear()}_${String(
      currentDate.getMonth() + 1
    ).padStart(2, '0')}.csv`;
    exportToCSV(transactions, filename);
  }

  const getCategoryIcon = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId)?.icon || '📦';
  };

  const getCategoryColor = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId)?.color || '#f5f5f5';
  };

  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* Quick Notes Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
          showNotes ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">📝 Quick Notes</h2>
            <button
              onClick={() => setShowNotes(false)}
              className="p-1 hover:bg-white/20 rounded"
            >
              ✕
            </button>
          </div>
          <p className="text-xs opacity-80 mt-1">Auto-saves as you type</p>
        </div>
        <div className="p-4 h-[calc(100%-80px)]">
          <textarea
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder="Type your quick notes here...&#10;&#10;- Shopping list&#10;- Reminders&#10;- Ideas&#10;- Anything!"
            className="w-full h-full p-3 border-2 border-gray-200 rounded-xl resize-none focus:border-amber-500 outline-none text-sm"
          />
          {noteSaving && (
            <p className="text-xs text-amber-500 mt-2 text-center">Saving...</p>
          )}
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {showNotes && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setShowNotes(false)}
        />
      )}

      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">SP Daily Expense</h1>
            <div className="flex items-center gap-2">
              {/* Quick Notes Button */}
              <button
                onClick={() => setShowNotes(true)}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
                title="Quick Notes"
              >
                📝
              </button>
              {/* Download Button */}
              <button
                onClick={handleExport}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
                title="Download CSV"
              >
                📥
              </button>
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 bg-white/20 rounded-full hover:bg-white/30 transition"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                      👤
                    </div>
                  )}
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b">
                      <p className="font-medium text-gray-800 truncate">
                        {user?.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                      className="w-full px-4 py-3 text-left text-red-500 hover:bg-red-50 flex items-center gap-3"
                    >
                      <span>🚪</span>
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Year & Month Selector */}
          <div className="flex items-center justify-center gap-2 bg-white/15 rounded-xl p-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30"
            >
              ◀
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMonthPicker(true)}
                className="px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 font-medium"
              >
                {MONTHS[currentDate.getMonth()]}
              </button>
              <button
                onClick={() => setShowYearPicker(true)}
                className="px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 font-medium"
              >
                {currentDate.getFullYear()}
              </button>
            </div>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Calendar Strip */}
        <div className="flex gap-2 p-3 overflow-x-auto bg-gray-50 scrollbar-hide">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = formatDate(date);
            const isSelected = dateStr === selectedDateStr;
            const hasExpense = datesWithTransactions.has(dateStr);

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(date)}
                className={`min-w-[50px] p-2 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg'
                    : 'bg-white hover:border-purple-400 border-2 border-transparent'
                }`}
              >
                <div className="text-xs opacity-70">{DAYS[date.getDay()]}</div>
                <div className="font-semibold">{day}</div>
                {hasExpense && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${
                      isSelected ? 'bg-white' : 'bg-red-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Summary Card */}
        <div className="m-4 p-4 bg-white rounded-2xl shadow-sm border">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 uppercase">Spent</p>
              <p className="text-lg font-bold text-red-500">
                ₹{summary.totalExpense.toLocaleString()}
              </p>
            </div>
            <div className="border-x">
              <p className="text-xs text-gray-500 uppercase">Received</p>
              <p className="text-lg font-bold text-green-500">
                ₹{(summary.totalIncome + summary.totalSplitReceived).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Net</p>
              <p className="text-lg font-bold text-gray-800">
                ₹{summary.netExpense.toLocaleString()}
              </p>
            </div>
          </div>
          {summary.totalSplitPending > 0 && (
            <p className="text-xs text-center text-orange-500 mt-2">
              ₹{summary.totalSplitPending.toLocaleString()} split pending
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 px-4 pb-4">
          <button
            onClick={() => openModal('expense')}
            className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition"
          >
            ➖ Add Expense
          </button>
          <button
            onClick={() => openModal('income')}
            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition"
          >
            ➕ Add Income
          </button>
        </div>

        {/* Transactions List */}
        <div className="px-4 pb-24">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-800">Transactions</h2>
            <span className="text-sm text-gray-500">
              {MONTHS[selectedDate.getMonth()].slice(0, 3)} {selectedDate.getDate()},{' '}
              {selectedDate.getFullYear()}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : dateTransactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-gray-400">No transactions for this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dateTransactions.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-xl p-3 shadow-sm border flex items-center gap-3"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{
                      backgroundColor:
                        t.type === 'income' ? '#e8f5e9' : getCategoryColor(t.category),
                    }}
                  >
                    {t.type === 'income' ? '💰' : getCategoryIcon(t.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{t.description}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      {t.type === 'income' ? 'Received' : CATEGORIES.find(c => c.id === t.category)?.name}
                      {t.isSplit && (
                        <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">
                          Split ₹{t.splitAmount} {t.splitStatus}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        t.type === 'income' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                    </p>
                    {t.isSplit && t.splitStatus === 'received' && (
                      <p className="text-[10px] text-gray-400">
                        Net: ₹{(t.amount - (t.splitAmount || 0)).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openModal(t.type, t)}
                      className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        setDeletingId(t.id);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
            <div className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingTransaction ? 'Edit' : 'Add'} Transaction
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 bg-gray-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              {/* Type Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                <button
                  onClick={() => setFormType('expense')}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${
                    formType === 'expense'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-600'
                  }`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setFormType('income')}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${
                    formType === 'income'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-600'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase block mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-3 border-2 rounded-xl text-lg focus:border-purple-500 outline-none"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase block mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What did you spend on?"
                  className="w-full p-3 border-2 rounded-xl focus:border-purple-500 outline-none"
                />
              </div>

              {/* Category (only for expense) */}
              {formType === 'expense' && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 uppercase block mb-2">
                    Category
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setFormCategory(cat.id)}
                        className={`p-2 rounded-xl text-center transition border-2 ${
                          formCategory === cat.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-transparent bg-gray-50'
                        }`}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <p className="text-[10px] mt-1 text-gray-600">{cat.name.split(' ')[0]}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Split Toggle (only for expense) */}
              {formType === 'expense' && (
                <div className="mb-4">
                  <div
                    onClick={() => setFormIsSplit(!formIsSplit)}
                    className="flex justify-between items-center bg-gray-50 p-3 rounded-xl cursor-pointer"
                  >
                    <span className="font-medium">Split with someone?</span>
                    <div
                      className={`w-12 h-7 rounded-full p-1 transition ${
                        formIsSplit ? 'bg-purple-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          formIsSplit ? 'translate-x-5' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {formIsSplit && (
                    <div className="mt-3 bg-purple-50 p-3 rounded-xl space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 block mb-1">
                            Friend&apos;s Name
                          </label>
                          <input
                            type="text"
                            value={formSplitWith}
                            onChange={(e) => setFormSplitWith(e.target.value)}
                            placeholder="e.g., Rahul"
                            className="w-full p-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 block mb-1">
                            Their Share (₹)
                          </label>
                          <input
                            type="number"
                            value={formSplitAmount}
                            onChange={(e) => setFormSplitAmount(e.target.value)}
                            placeholder="0"
                            className="w-full p-2 border rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Status</label>
                        <select
                          value={formSplitStatus}
                          onChange={(e) =>
                            setFormSplitStatus(e.target.value as 'pending' | 'received')
                          }
                          className="w-full p-2 border rounded-lg text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="received">Received</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Date */}
              <div className="mb-6">
                <label className="text-xs font-medium text-gray-500 uppercase block mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full p-3 border-2 rounded-xl focus:border-purple-500 outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!formAmount || !formDescription}
                className={`w-full py-4 rounded-xl font-bold text-white transition ${
                  formType === 'expense'
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : 'bg-gradient-to-r from-green-500 to-green-600'
                } ${(!formAmount || !formDescription) && 'opacity-50'}`}
              >
                {editingTransaction ? 'Update' : 'Add'}{' '}
                {formType === 'expense' ? 'Expense' : 'Income'}
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center">
              <p className="text-5xl mb-4">🗑️</p>
              <h3 className="text-lg font-bold mb-2">Delete Transaction?</h3>
              <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingId(null);
                  }}
                  className="flex-1 py-3 bg-gray-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Month Picker Modal */}
        {showMonthPicker && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowMonthPicker(false)}
          >
            <div
              className="bg-white rounded-2xl p-4 max-w-xs w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4 text-center">Select Month</h3>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    onClick={() => selectMonth(index)}
                    className={`py-3 rounded-xl transition ${
                      index === currentDate.getMonth()
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {month.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Year Picker Modal */}
        {showYearPicker && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowYearPicker(false)}
          >
            <div
              className="bg-white rounded-2xl p-4 max-w-xs w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4 text-center">Select Year</h3>
              <div className="grid grid-cols-3 gap-2">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => selectYear(year)}
                    className={`py-3 rounded-xl transition ${
                      year === currentDate.getFullYear()
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease;
        }
      `}</style>
    </div>
  );
}
