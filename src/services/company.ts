import { transactionRepo, companyRepo } from '../repositories';
import {
  Company,
  CompanySchema,
  CompanySummary,
  CompanySummarySchema,
} from '../types';
import { z } from 'zod';

export const companyService = {
  getCompaniesSummary: async ({
    userId,
  }: {
    userId: string;
  }): Promise<CompanySummary[]> => {
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
  activateCompanyCard: async ({
    companyId,
  }: {
    companyId: string;
  }): Promise<Company | null> => {
    const company = await companyRepo.activateCompanyCard({ companyId });
    return company ? CompanySchema.parse(company) : company;
  },
};
