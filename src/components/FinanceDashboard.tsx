/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { ConsolidatedTransaction } from '../types';

interface FinanceDashboardProps {
  consolidated: ConsolidatedTransaction[];
  onReset: () => void;
  onDeleteTransaction: (id: string) => void;
  isLoading: boolean;
}

const COLORS = ['#830AD1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#ec4899'];

export default function FinanceDashboard({ consolidated, onReset, onDeleteTransaction, isLoading }: FinanceDashboardProps) {
  
  // 1. Calculate values
  const totalReceitas = consolidated
    .filter(t => t.tipo === 'RECEITA')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalDespesas = consolidated
    .filter(t => t.tipo === 'DESPESA')
    .reduce((acc, t) => acc + t.valor, 0);

  const saldo = totalReceitas - totalDespesas;

  // 2. Map charts dynamic data
  // Group by category for Pie Chart
  const categoryDataMap: Record<string, number> = {};
  consolidated.forEach(t => {
    const val = t.valor;
    const cat = t.categoria || "Outros";
    categoryDataMap[cat] = (categoryDataMap[cat] || 0) + val;
  });

  const pieChartData = Object.keys(categoryDataMap).map(name => ({
    name,
    value: parseFloat(categoryDataMap[name].toFixed(2))
  }));

  // Helper for formatting Brazilian Real currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Receitas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Receitas Consolidadas</span>
            <h3 className="font-display font-bold text-2xl text-emerald-600 mt-1 select-all">
              {formatCurrency(totalReceitas)}
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">Rendas, aportes e PIX recebidos</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Total Despesas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Despesas Consolidadas</span>
            <h3 className="font-display font-bold text-2xl text-rose-600 mt-1 select-all">
              {formatCurrency(totalDespesas)}
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">Aprovadas de cartões, compras e contas</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Saldo Consolidado</span>
            <h3 className={`font-display font-bold text-2xl mt-1 select-all ${saldo >= 0 ? "text-indigo-600" : "text-amber-600"}`}>
              {formatCurrency(saldo)}
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">Balanço total das transações válidas</span>
          </div>
          <div className={`p-3 rounded-xl shrink-0 ${saldo >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}>
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Charts section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h4 className="font-display font-bold text-slate-800 text-sm">Gastos por Categorias</h4>
            <p className="text-[11px] text-slate-500">Conciliação integrada de gastos</p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition flex items-center gap-1 text-[11px] font-medium"
            title="Restaurar dados iniciais"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Resetar Demo
          </button>
        </div>

        {/* Categories composition Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          
          {/* Left: Recharts Pie chart */}
          <div className="sm:col-span-5 h-48 relative flex items-center justify-center">
            {isLoading ? (
              <div className="text-slate-400 font-mono text-xs flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : pieChartData.length === 0 ? (
              <div className="text-slate-400 text-xs py-10 text-center bg-slate-50 rounded-xl w-full">
                Não há dados de categorias
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {/* Direct center values label indicator */}
            {!isLoading && pieChartData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total</span>
                <span className="text-sm font-bold text-slate-700 font-display">{consolidated.length} itens</span>
              </div>
            )}
          </div>

          {/* Right: Rich lists components metrics list items with individual progress indicator values */}
          <div className="sm:col-span-7 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Composição de Gastos</span>
            
            {pieChartData.length === 0 && !isLoading ? (
              <div className="text-slate-450 text-xs py-6 text-center italic bg-slate-50 rounded-xl">
                Realize um lançamento manual para visualizar detalhes aqui!
              </div>
            ) : (
              <div className="max-h-[160px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                {pieChartData.map((d, index) => (
                  <div key={index} className="flex items-center justify-between text-xs text-slate-600 pb-1.5 border-b border-dashed border-slate-100 last:border-0">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate font-semibold text-slate-700">{d.name}</span>
                    </div>
                    <span className="font-mono text-slate-800 font-bold shrink-0">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
