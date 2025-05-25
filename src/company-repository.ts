import { pool } from './db';
import {
  Company,
  CompanySummary,
  CompanySummarySchema,
  Transaction,
} from './types';

export const getCompanies = async ({
  userId,
}: {
  userId: string;
}): Promise<CompanySummary[] | null> => {
  const client = pool;
  const userCheck = await pool.query(`SELECT 1 FROM users WHERE id = $1`, [
    userId,
  ]);
  if (userCheck.rowCount === 0) {
    return null;
  }
  const userCompanies = await client.query(
    `
      SELECT c.id, c.name, c.credit_limit, c.used_credit, c.created_at, c.status from companies c 
      JOIN user_company_access uca 
      ON c.id = uca.company_id
      WHERE uca.user_id = $1
    `,
    [userId],
  );
  const companies = await Promise.all(
    userCompanies.rows.map(async (company) => {
      const transactions = await client.query(
        `SELECT amount, currency, counterparty, created_at, id from transactions where company_id = $1 ORDER BY created_at DESC LIMIT 3`,
        [company.id],
      );
      const transactionsCount = await client.query(
        `SELECT COUNT(*) as t_count from transactions where company_id = $1`,
        [company.id],
      );
      return {
        id: company.id,
        name: company.name,
        creditLimit: company.credit_limit,
        usedCredit: company.used_credit,
        createdAt: company.created_at,
        status: company.status,
        transactionsCount: Number(transactionsCount.rows[0].t_count),
        latestTransactions: transactions.rows.map((t) => {
          return {
            id: t.id,
            amount: t.amount,
            currency: t.currency,
            counterparty: t.counterparty,
            createdAt: t.created_at,
          };
        }),
      };
    }),
  );
  return companies;
};

export const getTransactions = async ({
  companyId,
}: {
  companyId: string;
}): Promise<Transaction[] | null> => {
  const companyCheck = await pool.query(
    `SELECT 1 FROM companies WHERE id = $1`,
    [companyId],
  );
  if (companyCheck.rowCount === 0) {
    return null;
  }
  const result = await pool.query(
    `SELECT t.id, t.company_id, t.user_id, t.amount, t.currency, t.counterparty, t.created_at from transactions t where company_id = $1;`,
    [companyId],
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
};

export const activateCompanyCard = async ({
  companyId,
}: {
  companyId: string;
}): Promise<Company | null> => {
  const updatedCompanyResult = await pool.query(
    `UPDATE companies SET status = 'ACTIVE', activated_at = now() where id = $1
    RETURNING id, name, status, credit_limit, used_credit, activated_at, created_at;`,
    [companyId],
  );
  if (updatedCompanyResult.rowCount === 0) {
    return null;
  }
  const updatedCompany = updatedCompanyResult.rows[0];
  const company = {
    id: updatedCompany.id,
    name: updatedCompany.name,
    creditLimit: updatedCompany.credit_limit,
    usedCredit: updatedCompany.used_credit,
    createdAt: updatedCompany.created_at,
    status: updatedCompany.status,
  };
  return company;
};
