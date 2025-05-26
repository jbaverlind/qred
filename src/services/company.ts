import { transactionRepo, companyRepo } from '../repositories';
import { CompanySummarySchema } from '../types';
import { z } from 'zod';

export const companyService = {
  getCompaniesSummary: async ({ userId }: { userId: string }) => {
    const companies = await companyRepo.getCompanies({ userId });
    const companiesSummary = await Promise.all(
      companies.map(async (c) => {
        const transactionsCount = await transactionRepo.getTransactionCount({
          companyId: c.id,
        });
        const transactions = await transactionRepo.getTransactions({
          companyId: c.id,
        });
        return {
          ...c,
          transactionsCount,
          latestTransactions: transactions,
        };
      }),
    );
    const parsed = z.array(CompanySummarySchema).parse(companiesSummary);
    return parsed;
  },
};
