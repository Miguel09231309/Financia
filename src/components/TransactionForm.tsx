/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlusCircle, DollarSign, Calendar, ListFilter, Clipboard, Check, AlertCircle } from 'lucide-react';

interface TransactionFormProps {
  onAddTransaction: (payload: {
    tipo: 'DESPESA' | 'RECEITA';
    valor: number;
    recebedor: string;
    categoria: string;
    observacoes?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const CATEGORIES = {
  DESPESA: [
    'Alimentação',
    'Transporte',
    'Saúde',
    'Lazer & Viagens',
    'Assinaturas & Serviços',
    'Contas & Utilidades',
    'Supermercado',
    'Educação',
    'Moradia',
    'Impostos & Taxas',
    'Outros'
  ],
  RECEITA: [
    'Salário & Proventos',
    'Freelance',
    'Investimentos',
    'Vendas',
    'Reembolsos',
    'Transferência Recebida',
    'Outros'
  ]
};

export default function TransactionForm({ onAddTransaction, isLoading }: TransactionFormProps) {
  const [tipo, setTipo] = useState<'DESPESA' | 'RECEITA'>('DESPESA');
  const [valor, setValor] = useState<string>('');
  const [recebedor, setRecebedor] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Auto-update first category when shifting type
  const handleTypeChange = (newTipo: 'DESPESA' | 'RECEITA') => {
    setTipo(newTipo);
    setCategoria('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);

    const numericValue = parseFloat(valor);
    if (isNaN(numericValue) || numericValue <= 0) {
      setFormError("Insira um valor numérico válido maior que zero.");
      return;
    }

    if (!recebedor.trim()) {
      setFormError("Informe o favorecido, recebedor ou estabelecimento.");
      return;
    }

    const selectedCategory = categoria || CATEGORIES[tipo][0];

    try {
      await onAddTransaction({
        tipo,
        valor: numericValue,
        recebedor: recebedor.trim(),
        categoria: selectedCategory,
        observacoes: observacoes.trim() || undefined
      });

      // Clear form on success
      setValor('');
      setRecebedor('');
      setCategoria('');
      setObservacoes('');
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (err: any) {
      setFormError(err.message || "Ocorreu um erro ao registrar a transação.");
    }
  };

  const availableCategories = CATEGORIES[tipo];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
          <PlusCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-base text-slate-800">Novo Lançamento</h3>
          <p className="text-xs text-slate-500">Adicione uma receita ou despesa manual sob sua conta consolidada</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Despesa / Receita */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Tipo de Registro
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
            <button
              type="button"
              onClick={() => handleTypeChange('DESPESA')}
              className={`py-2 px-3 text-center text-xs font-bold rounded-lg transition-all ${
                tipo === 'DESPESA'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              Despesa (-)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('RECEITA')}
              className={`py-2 px-3 text-center text-xs font-bold rounded-lg transition-all ${
                tipo === 'RECEITA'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              Receita (+)
            </button>
          </div>
        </div>

        {/* Currency Val */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            Valor (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">R$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 font-mono"
              placeholder="0,00"
              required
            />
          </div>
        </div>

        {/* Payee establishment / Category & Observations based on type */}
        {tipo === 'DESPESA' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Favorecido / Estabelecedor / Origem
                </label>
                <input
                  type="text"
                  value={recebedor}
                  onChange={(e) => setRecebedor(e.target.value)}
                  className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  placeholder="Ex: Padaria, Uber, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <ListFilter className="w-3.5 h-3.5 text-slate-400" />
                  Categoria
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                >
                  <option value="" disabled>Selecione uma categoria</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                Observações (Opcional)
              </label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                placeholder="Ex: Almoço de domingo com a família, etc."
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Recebido
            </label>
            <input
              type="text"
              value={recebedor}
              onChange={(e) => setRecebedor(e.target.value)}
              className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
              placeholder="Ex: Empregador, Cliente, João, etc."
              required
            />
          </div>
        )}

        {/* Notifications and Responses message */}
        {formError && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-1.5 border border-emerald-100">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Lançamento registrado com sucesso no painel!</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm text-white ${
            tipo === 'DESPESA'
              ? 'bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300'
              : 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300'
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Gravar no Saldo Consolidado</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
