/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ConsolidatedTransaction } from '../types';
import { TrendingDown, TrendingUp, Trash2, Calendar } from 'lucide-react';

interface ConsolidatedHistoryProps {
  transactions: ConsolidatedTransaction[];
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
}

export default function ConsolidatedHistory({ transactions, onDelete, isLoading }: ConsolidatedHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-display font-bold text-lg text-slate-800">Histórico Consolidado</h3>
          <p className="text-xs text-slate-500">Transações validadas, prontas para as contas e exportação</p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 font-semibold select-none">
          {transactions.length} registros
        </span>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400 font-mono text-xs">
          Carregando histórico...
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center">
          <Calendar className="w-8 h-8 text-slate-350 mb-2" />
          <h4 className="font-display font-semibold text-slate-600 text-xs">Nenhum Registro Salvo</h4>
          <p className="text-[11px] text-slate-400 max-w-[240px] mt-1 leading-normal">
            Faça registros de despesas ou receitas pelo formulário acima para visualizar suas movimentações salvas aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {transactions.map((trans) => {
            const isDespesa = trans.tipo === 'DESPESA';

            return (
              <div 
                key={trans.id}
                className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Indicator icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isDespesa ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {isDespesa ? (
                      <TrendingDown className="w-5 h-5" />
                    ) : (
                      <TrendingUp className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700 truncate">{trans.recebedor}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-200/70 text-slate-600 rounded-full font-medium">
                        {trans.categoria}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                      <span className="font-medium">{formatDate(trans.dataConfirmacao)}</span>
                      {trans.observacoes && (
                        <>
                          <span>•</span>
                          <span className="truncate italic max-w-[150px] sm:max-w-[280px]" title={trans.observacoes}>
                            Obs: "{trans.observacoes}"
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-bold font-mono ${
                    isDespesa ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {isDespesa ? '-' : '+'} {formatCurrency(trans.valor)}
                  </span>

                  <button
                    type="button"
                    disabled={deletingId === trans.id}
                    onClick={() => handleDelete(trans.id)}
                    className="p-1.5 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg opacity-80 group-hover:opacity-100 transition disabled:opacity-50"
                    title="Excluir transação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
