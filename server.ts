/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { ConsolidatedTransaction } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple In-Memory stores that persist during the server's lifecycle
let consolidatedTransactions: ConsolidatedTransaction[] = [];

// Seed function to pre-populate with mock data
function seedData() {
  const now = Date.now();
  
  // Preseed some consolidated transactions
  consolidatedTransactions = [
    {
      id: "trans-1",
      tipo: "RECEITA",
      valor: 8500.00,
      recebedor: "Empresa Tecnologia S.A.",
      categoria: "Salário & Proventos",
      dataConfirmacao: now - 3600000 * 24 * 3, // 3 days ago
      observacoes: "Salário mensal líquido"
    },
    {
      id: "trans-2",
      tipo: "RECEITA",
      valor: 450.00,
      recebedor: "Maria Souza",
      categoria: "Investimentos",
      dataConfirmacao: now - 3600000 * 24, // 1 day ago
      observacoes: "Rendimento de Dividendos FII"
    },
    {
      id: "trans-3",
      tipo: "DESPESA",
      valor: 189.90,
      recebedor: "Supermercado DB",
      categoria: "Supermercado",
      dataConfirmacao: now - 3600000 * 12, // 12 hours ago
      observacoes: "Compras da semana"
    },
    {
      id: "trans-4",
      tipo: "DESPESA",
      valor: 120.00,
      recebedor: "Posto Curitiba",
      categoria: "Transporte",
      dataConfirmacao: now - 3600000 * 6, // 6 hours ago
      observacoes: "Combustível viagem"
    },
    {
      id: "trans-5",
      tipo: "DESPESA",
      valor: 34.90,
      recebedor: "Netflix Entretenimento",
      categoria: "Assinaturas & Serviços",
      dataConfirmacao: now - 3600000 * 2, // 2 hours ago
      observacoes: "Assinatura mensal padrão"
    },
    {
      id: "trans-6",
      tipo: "DESPESA",
      valor: 15.00,
      recebedor: "Padaria Arapongas",
      categoria: "Alimentação",
      dataConfirmacao: now - 3600000 * 1, // 1 hour ago
      observacoes: "Pão e café da manhã"
    }
  ];
}

// Perform initial seed
seedData();

// --- API ROUTES ---

// 1. GET Consolidated Transactions
app.get('/api/consolidated', (req, res) => {
  res.json(consolidatedTransactions);
});

// 2. POST Create transaction (manual)
app.post('/api/consolidated/manual', (req, res) => {
  const { tipo, valor, recebedor, categoria, observacoes } = req.body;

  if (!tipo || valor === undefined || !recebedor || !categoria) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes para transação." });
  }

  const newTrans: ConsolidatedTransaction = {
    id: `trans-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tipo,
    valor: Number(valor),
    recebedor,
    categoria,
    dataConfirmacao: Date.now(),
    observacoes: observacoes || undefined
  };

  consolidatedTransactions.unshift(newTrans);
  res.status(201).json(newTrans);
});

// 3. DELETE Consolidated Transaction
app.delete('/api/consolidated/:id', (req, res) => {
  const { id } = req.params;
  consolidatedTransactions = consolidatedTransactions.filter(t => t.id !== id);
  res.json({ message: "Transação excluída com sucesso." });
});

// 4. Reset Server Data
app.post('/api/reset', (req, res) => {
  seedData();
  res.json({ message: "Valores restaurados com sucesso para os dados de demonstração." });
});

// Async Vite Setup
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server listening on HTTP://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start custom server:", err);
});
