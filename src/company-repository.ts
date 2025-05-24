import { Client } from 'pg';
import { Company, Transaction } from './company';

const client = new Client({
  user: process.env.USER,
  password: process.env.PASSWORD,
  host: process.env.HOST,
  port: Number(process.env.PORT),
  database: process.env.DATABASE,
});

export const getCompanies = async ({
  userId,
}: {
  userId: string;
}): Promise<Company[]> => {
  await client.connect();

  const result = await client.query(`
        SELECT c.id, c.name, c.credit_limit, c.used_credit, c.created_at from companies c 
        JOIN user_company_access uca 
        ON c.id = uca.company_id
        WHERE uca.user_id = '${userId}'
    `);
  const companies = await Promise.all(
    result.rows.map(async (company) => {
      const transactions = await client.query(
        `SELECT amount, currency, counterparty from transactions where company_id = '${company.id}' ORDER BY created_at DESC LIMIT 3`,
      );
      return {
        id: company.id,
        name: company.name,
        creditLimit: company.credit_limit,
        usedCredit: company.used_credit,
        createdAt: company.create_at,
        latestTransactions: transactions.rows.map((t) => {
          return {
            amount: t.amount,
            currency: t.currency,
            counterparty: t.counterparty,
            id: t.id,
            createdAt: t.created_at,
          };
        }),
      };
    }),
  );

  await client.end();

  return companies;
};

export const getTransactions = async ({
  companyId,
}: {
  companyId: string;
}): Promise<Transaction[]> => {
  await client.connect();
  const result = await client.query(
    `SELECT t.id, t.company_id, t.user_id, t.amount, t.currency, t.counterparty transactions where company_id = '${companyId}';`,
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
  await client.end();
  return transactions;
};
