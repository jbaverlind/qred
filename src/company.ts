import { z } from 'zod';

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  amount: z.number(),
  currency: z.string(),
  counterparty: z.string(),
  createdAt: z.string().datetime(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  creditLimit: z.number(),
  usedCredit: z.number(),
  createdAt: z.string().datetime(),
  latestTransactions: z.array(TransactionSchema),
});
export type Company = z.infer<typeof CompanySchema>;
