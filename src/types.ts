/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConsolidatedTransaction {
  id: string;
  userId?: string;
  tipo: 'DESPESA' | 'RECEITA';
  valor: number;
  recebedor: string;
  categoria: string;
  dataConfirmacao: number; // timestamp
  observacoes?: string;
}

