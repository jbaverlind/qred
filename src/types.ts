import { z } from 'zod';

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  amount: z.number(),
  currency: z.string(),
  counterparty: z.string(),
  createdAt: z.date().transform((val) => val.toISOString()),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  creditLimit: z.number(),
  usedCredit: z.number(),
  createdAt: z.date().transform((val) => val.toISOString()),
  status: z.string(),
});

export const CompanySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  creditLimit: z.number(),
  usedCredit: z.number(),
  createdAt: z.string(),
  status: z.string(),
  transactionsCount: z.number(),
  latestTransactions: z.array(TransactionSchema),
});
export type CompanySummary = z.infer<typeof CompanySummarySchema>;
export type Company = z.infer<typeof CompanySchema>;
