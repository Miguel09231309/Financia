/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDocFromServer, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ConsolidatedTransaction } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// 1. Specific standard error handler required by Firebase skill
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 2. CRITICAL CONSTRAINT: Boot-time Firestore Connection Test
export async function testConnection() {
  try {
    const dummyRef = doc(db, 'test', 'connection');
    await getDocFromServer(dummyRef);
    console.log("Firebase connection test succeeded");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    } else {
      console.log("Firebase connection is online (responded with expected code/rules restriction).");
    }
  }
}

// 3. Realtime Listener for the current user's transactions
export function listenUserTransactions(
  userId: string, 
  onUpdate: (transactions: ConsolidatedTransaction[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('dataConfirmacao', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const txs: ConsolidatedTransaction[] = [];
    snapshot.forEach((docSnap) => {
      txs.push(docSnap.data() as ConsolidatedTransaction);
    });
    onUpdate(txs);
  }, (error) => {
    try {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    } catch (transformedError: any) {
      onError(transformedError);
    }
  });
}

// 4. Manual Create
export async function addUserTransaction(
  userId: string, 
  payload: Omit<ConsolidatedTransaction, 'userId'>
): Promise<ConsolidatedTransaction> {
  const pathForWrite = `transactions/${payload.id}`;
  const newTx: ConsolidatedTransaction = {
    ...payload,
    userId
  };

  try {
    await setDoc(doc(db, 'transactions', payload.id), newTx);
    return newTx;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, pathForWrite);
    throw error;
  }
}

// 5. Manual Delete
export async function deleteUserTransaction(userId: string, transactionId: string): Promise<void> {
  const pathForDelete = `transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathForDelete);
  }
}

// 6. Reset user transactions with Demo data in Firestore
export async function resetUserTransactionsDemo(userId: string): Promise<void> {
  const pathForWrite = 'transactions/batch';
  const now = Date.now();
  const demoData: Omit<ConsolidatedTransaction, 'userId'>[] = [
    {
      id: "trans-demo-1",
      tipo: "RECEITA",
      valor: 8500.00,
      recebedor: "Empresa Tecnologia S.A.",
      categoria: "Salário & Proventos",
      dataConfirmacao: now - 3600000 * 24 * 3,
      observacoes: "Salário mensal líquido"
    },
    {
      id: "trans-demo-2",
      tipo: "RECEITA",
      valor: 450.00,
      recebedor: "Maria Souza",
      categoria: "Investimentos",
      dataConfirmacao: now - 3600000 * 24,
      observacoes: "Rendimento de Dividendos FII"
    },
    {
      id: "trans-demo-3",
      tipo: "DESPESA",
      valor: 189.90,
      recebedor: "Supermercado DB",
      categoria: "Supermercado",
      dataConfirmacao: now - 3600000 * 12,
      observacoes: "Compras da semana"
    },
    {
      id: "trans-demo-4",
      tipo: "DESPESA",
      valor: 120.00,
      recebedor: "Posto Curitiba",
      categoria: "Transporte",
      dataConfirmacao: now - 3600000 * 6,
      observacoes: "Combustível viagem"
    },
    {
      id: "trans-demo-5",
      tipo: "DESPESA",
      valor: 34.90,
      recebedor: "Netflix Entretenimento",
      categoria: "Assinaturas & Serviços",
      dataConfirmacao: now - 3600000 * 2,
      observacoes: "Assinatura mensal padrão"
    },
    {
      id: "trans-demo-6",
      tipo: "DESPESA",
      valor: 15.00,
      recebedor: "Padaria Arapongas",
      categoria: "Alimentação",
      dataConfirmacao: now - 3600000 * 1,
      observacoes: "Pão e café da manhã"
    }
  ];

  try {
    // 1. Fetch current user transactions
    const q = query(collection(db, 'transactions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    
    const batch = writeBatch(db);
    
    // Delete existing
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    
    // Add new demo data
    demoData.forEach((item) => {
      const docRef = doc(db, 'transactions', item.id);
      batch.set(docRef, { ...item, userId });
    });
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
}
