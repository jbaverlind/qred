import { transactionRepo } from '../repositories';
import { Transaction } from '../types';

export const transactionService = {
  getTransactions: async ({
    companyId,
  }: {
    companyId: string;
  }): Promise<Transaction[]> => {
    const transactions = await transactionRepo.getTransactions({ companyId });
    return transactions;
  },
};
