import { pool } from '../db';
import { Transaction } from '../types';

export const transactionRepo = {
  getTransactions: async ({
    companyId,
    limit = 3,
  }: {
    companyId: string;
    limit?: number;
  }): Promise<Transaction[]> => {
    const result = await pool.query(
      `SELECT t.id, t.company_id, t.user_id, t.amount, t.currency, t.counterparty, t.created_at from transactions t where company_id = $1 ORDER BY created_at DESC LIMIT $2;`,
      [companyId, limit],
    );

    const transactions = result.rows.map((t) => {
      return {
        id: t.id,
        amount: t.amount,
        currency: t.currency,
        counterparty: t.counterparty,
        createdAt: t.created_at,
      };
    });
    return transactions;
  },
  getTransactionCount: async ({ companyId }: { companyId: string }) => {
    const transactionsCount = await pool.query(
      `SELECT COUNT(*) as t_count from transactions where company_id = $1`,
      [companyId],
    );
    return Number(transactionsCount.rows[0].t_count);
  },
};
