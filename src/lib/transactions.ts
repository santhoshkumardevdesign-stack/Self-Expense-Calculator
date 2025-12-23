import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Transaction } from '@/types';

const COLLECTION_NAME = 'transactions';

// Create
export async function createTransaction(
  userId: string,
  data: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Date.now();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Read - Get transactions for a specific month/year
export async function getTransactionsByMonth(
  userId: string,
  year: number,
  month: number
): Promise<Transaction[]> {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endMonth = month === 11 ? 0 : month + 1;
  const endYear = month === 11 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('date', '>=', startDate),
    where('date', '<', endDate),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];
}

// Read - Get transactions for a specific date
export async function getTransactionsByDate(
  userId: string,
  date: string
): Promise<Transaction[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('date', '==', date),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];
}

// Read - Get all transactions for a year
export async function getTransactionsByYear(
  userId: string,
  year: number
): Promise<Transaction[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year + 1}-01-01`;

  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('date', '>=', startDate),
    where('date', '<', endDate),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];
}

// Update
export async function updateTransaction(
  id: string,
  data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Date.now(),
  });
}

// Delete
export async function deleteTransaction(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

// Calculate summary
export function calculateSummary(transactions: Transaction[]) {
  let totalExpense = 0;
  let totalIncome = 0;
  let totalSplitPending = 0;
  let totalSplitReceived = 0;

  transactions.forEach((t) => {
    if (t.type === 'expense') {
      totalExpense += t.amount;
      if (t.isSplit && t.splitAmount) {
        if (t.splitStatus === 'pending') {
          totalSplitPending += t.splitAmount;
        } else if (t.splitStatus === 'received') {
          totalSplitReceived += t.splitAmount;
        }
      }
    } else {
      totalIncome += t.amount;
    }
  });

  return {
    totalExpense,
    totalIncome,
    totalSplitPending,
    totalSplitReceived,
    netExpense: totalExpense - totalIncome - totalSplitReceived,
  };
}

// Export to CSV
export function exportToCSV(transactions: Transaction[], filename: string): void {
  const headers = [
    'Date',
    'Type',
    'Description',
    'Category',
    'Amount',
    'Split With',
    'Split Amount',
    'Split Status',
    'Net Amount',
  ];

  const rows = transactions
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => {
      const netAmount = t.type === 'expense'
        ? t.isSplit && t.splitStatus === 'received'
          ? t.amount - (t.splitAmount || 0)
          : t.amount
        : t.amount;

      return [
        t.date,
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        t.category,
        t.type === 'expense' ? -t.amount : t.amount,
        t.splitWith || '',
        t.splitAmount || '',
        t.splitStatus || '',
        t.type === 'expense' ? -netAmount : netAmount,
      ].join(',');
    });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
