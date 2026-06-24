/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  RefreshCw, 
  AlertCircle, 
  Coins,
  LogIn,
  LogOut,
  Sparkles,
  Cloud,
  FolderLock
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';

import { ConsolidatedTransaction } from './types';
import { auth, signInWithPopup, signOut, googleProvider } from './lib/firebase';
import { 
  testConnection, 
  listenUserTransactions, 
  addUserTransaction, 
  deleteUserTransaction, 
  resetUserTransactionsDemo 
} from './lib/firestoreService';

import FinanceDashboard from './components/FinanceDashboard';
import ConsolidatedHistory from './components/ConsolidatedHistory';
import TransactionForm from './components/TransactionForm';

// Initial client-side local demo fallback transactions
const LOCAL_DEMO_TRANSACTIONS = (): ConsolidatedTransaction[] => {
  const now = Date.now();
  return [
    {
      id: "trans-local-1",
      userId: "guest",
      tipo: "RECEITA",
      valor: 8500.00,
      recebedor: "Empresa Tecnologia S.A.",
      categoria: "Salário & Proventos",
      dataConfirmacao: now - 3600000 * 24 * 3,
      observacoes: "Salário mensal líquido"
    },
    {
      id: "trans-local-2",
      userId: "guest",
      tipo: "RECEITA",
      valor: 450.00,
      recebedor: "Maria Souza",
      categoria: "Investimentos",
      dataConfirmacao: now - 3600000 * 24,
      observacoes: "Rendimento de Dividendos FII"
    },
    {
      id: "trans-local-3",
      userId: "guest",
      tipo: "DESPESA",
      valor: 189.90,
      recebedor: "Supermercado DB",
      categoria: "Supermercado",
      dataConfirmacao: now - 3600000 * 12,
      observacoes: "Compras da semana"
    },
    {
      id: "trans-local-4",
      userId: "guest",
      tipo: "DESPESA",
      valor: 120.00,
      recebedor: "Posto Curitiba",
      categoria: "Transporte",
      dataConfirmacao: now - 3600000 * 6,
      observacoes: "Combustível viagem"
    }
  ];
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [consolidated, setConsolidated] = useState<ConsolidatedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Initial boot-up connectivity check and Firebase auth listener
  useEffect(() => {
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time synchronizer depending on Auth status (Firestore or LocalStorage)
  useEffect(() => {
    if (authLoading) return;

    let unsubscribeFirestore: (() => void) | null = null;

    if (user) {
      // User is logged in: Subscribe to realtime Cloud Firestore updates
      setIsLoading(true);
      setErrorMsg(null);
      
      unsubscribeFirestore = listenUserTransactions(
        user.uid,
        (txs) => {
          setConsolidated(txs);
          setIsLoading(false);
        },
        (err) => {
          setErrorMsg(`Erro de permissão ou sincronização com a Nuvem: ${err.message}`);
          setIsLoading(false);
        }
      );
    } else {
      // Guest mode: load transactions from local storage
      setIsLoading(true);
      const stored = localStorage.getItem('finfin_local_transactions');
      if (stored) {
        try {
          setConsolidated(JSON.parse(stored));
        } catch {
          setConsolidated(LOCAL_DEMO_TRANSACTIONS());
        }
      } else {
        const initial = LOCAL_DEMO_TRANSACTIONS();
        setConsolidated(initial);
        localStorage.setItem('finfin_local_transactions', JSON.stringify(initial));
      }
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [user, authLoading]);

  // Sync to local storage on manual guest additions
  const updateGuestsLocalStorage = (updated: ConsolidatedTransaction[]) => {
    setConsolidated(updated);
    localStorage.setItem('finfin_local_transactions', JSON.stringify(updated));
  };

  // 3. User Login
  const handleLogin = async () => {
    try {
      setErrorMsg(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setErrorMsg(`Erro ao autenticar: ${err.message || err}`);
    }
  };

  // 4. User Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Erro ao deslogar:", err);
    }
  };

  // 5. Clear & Reset Data (Supports both modes)
  const handleResetData = async () => {
    setIsLoading(true);
    try {
      if (user) {
        // Logged in: Reset database with demo metrics
        await resetUserTransactionsDemo(user.uid);
      } else {
        // Guest: Reset local storage
        const initial = LOCAL_DEMO_TRANSACTIONS();
        updateGuestsLocalStorage(initial);
      }
    } catch (err: any) {
      setErrorMsg(`Não foi possível restaurar os dados de demonstração: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Record newly entered transaction
  const handleAddTransaction = async (payload: {
    tipo: 'DESPESA' | 'RECEITA';
    valor: number;
    recebedor: string;
    categoria: string;
    observacoes?: string;
  }) => {
    const newId = `trans-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    if (user) {
      // Cloud Firestore insertion
      await addUserTransaction(user.uid, {
        id: newId,
        tipo: payload.tipo,
        valor: payload.valor,
        recebedor: payload.recebedor,
        categoria: payload.categoria,
        dataConfirmacao: Date.now(),
        observacoes: payload.observacoes
      });
    } else {
      // Guest local-storage insertion
      const newTx: ConsolidatedTransaction = {
        id: newId,
        userId: 'guest',
        tipo: payload.tipo,
        valor: payload.valor,
        recebedor: payload.recebedor,
        categoria: payload.categoria,
        dataConfirmacao: Date.now(),
        observacoes: payload.observacoes
      };
      
      const updated = [newTx, ...consolidated];
      updateGuestsLocalStorage(updated);
    }
  };

  // 7. Remove selected transaction from history logs
  const handleDeleteTransaction = async (id: string) => {
    try {
      if (user) {
        // Cloud Firestore removal
        await deleteUserTransaction(user.uid, id);
      } else {
        // Guest local storage removal
        const filtered = consolidated.filter(t => t.id !== id);
        updateGuestsLocalStorage(filtered);
      }
    } catch (err: any) {
      alert(err.message || "Erro de rede ao remover registro.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-indigo-600 selection:text-white">

      {/* Main Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-17 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-xl shadow-xs text-white">
              <Coins className="w-5.5 h-5.5" />
              <CheckCircle className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-emerald-500 rounded-full border-2 border-white text-white p-0.5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-base text-slate-900 tracking-tight block">Financia</span>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Gestão Financeira Consolidada</span>
            </div>
          </div>

          {/* Core Auth Option and Connection Status Indicators */}
          <div className="flex items-center gap-3">
            
            {/* Mode Indicator Button */}
            {authLoading ? (
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-100 rounded-xl px-3 py-1.5 shadow-2xs">
                {/* Profile Avatar */}
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "Usuário"} 
                    className="w-6 h-6 rounded-full border border-indigo-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
                
                {/* Visual Label */}
                <span className="hidden sm:inline-flex flex-col items-start leading-none">
                  <span className="text-[11px] font-bold text-slate-700 truncate max-w-[110px]">{user.displayName || "Minha Conta"}</span>
                  <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5">
                    <Cloud className="w-2.5 h-2.5 shrink-0" /> Nuvem Ativa
                  </span>
                </span>

                {/* Sign-out button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1 text-slate-400 hover:text-red-500 rounded-md transition hover:bg-slate-100 cursor-pointer"
                  title="Sair da Conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar com o Google</span>
              </button>
            )}

            {/* Offline/Online warning indicator */}
            <span className={`text-[11px] font-semibold border px-3 py-1.5 rounded-xl hidden sm:flex items-center gap-1.5 font-mono ${
              user 
                ? 'bg-emerald-50 border-emerald-150 text-emerald-700' 
                : 'bg-amber-50 border-amber-150 text-amber-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
              {user ? "NUVEM" : "MODO VISITANTE"}
            </span>

          </div>

        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Connection/Authentication warnings */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl text-xs flex items-center gap-2.5 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="flex-1">
              <span className="font-bold block">Alerta de Sincronização</span>
              <p className="text-[11px] text-rose-600">{errorMsg}</p>
            </div>
            <button 
              type="button" 
              onClick={() => setErrorMsg(null)} 
              className="px-3 py-1 bg-white hover:bg-slate-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="space-y-6">
          
          {/* Visual Intro Banner */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md border border-slate-800">
            
            {/* Background ambient mesh */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none select-none" />
            
            <div className="space-y-1.5 relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-300 border border-indigo-400/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                Controle de Gastos & Receitas
              </span>
              <h2 className="font-display font-extrabold text-2xl leading-none tracking-tight flex items-center gap-2">
                Painel Consolidado Financia
                {user && <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-lg">
                Seja bem-vindo{user ? `, ${user.displayName}` : ''}! Use a opção de login com Google no cabeçalho para armazenar com segurança todos os seus dados na nuvem, garantindo que nada se perca ao fechar o navegador.
              </p>
            </div>

            {/* Quick actions for testing / reset */}
            <div className="flex gap-2.5 shrink-0 z-10">
              <button
                type="button"
                onClick={handleResetData}
                disabled={isLoading}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 rounded-xl text-xs font-bold tracking-wide flex items-center gap-1.5 transition text-slate-900 shadow-sm cursor-pointer"
                title="Restaura os dados de receitas e despesas padrões da demonstração"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Restaurar Demo
              </button>
            </div>
          </div>

          {/* Informational Callout regarding cloud synchronization */}
          {!user && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0 h-fit">
                  <FolderLock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-slate-800 text-xs sm:text-sm">Seus dados ainda estão salvos localmente!</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Conecte sua conta do Google para desfrutar de persistência em bancos de dados reais na nuvem, podendo acessar de qualquer dispositivo de forma integrada e segura.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogin}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs text-center cursor-pointer shrink-0"
              >
                Entrar com Google
              </button>
            </div>
          )}

          {/* Split Grid row */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Metrics and History Logs */}
            <div className="xl:col-span-7 space-y-6">
              
              {/* Financial overview statistics & charts */}
              <FinanceDashboard 
                consolidated={consolidated} 
                onReset={handleResetData} 
                onDeleteTransaction={handleDeleteTransaction}
                isLoading={isLoading}
              />

              {/* Main list of consolidated records */}
              <ConsolidatedHistory 
                transactions={consolidated} 
                onDelete={handleDeleteTransaction}
                isLoading={isLoading}
              />

            </div>

            {/* Right Column: Direct manual transaction launch form */}
            <div className="xl:col-span-5">
              <TransactionForm 
                onAddTransaction={handleAddTransaction}
                isLoading={isLoading}
              />
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/60 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center select-none space-y-1">
          <p className="text-xs text-slate-500 font-medium">
            Financia - Sistema Simplificado de Controle e Conciliação Financeira
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            Projetado com suporte a balanceamento de fluxo de caixa, segurança zero-trust e persistência em nuvem.
          </p>
        </div>
      </footer>

    </div>
  );
}
