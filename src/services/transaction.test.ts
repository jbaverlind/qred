import { describe, it, expect, vi } from 'vitest';
import { v4 } from 'uuid';
import { transactionRepo } from '../repositories/transaction';
import { transactionService } from './transaction';

describe('transaction service', async () => {
  it('should return list of transactions', () => {});
  const companyId = v4();
  vi.spyOn(transactionRepo, 'getTransactions').mockResolvedValueOnce([
    {
      id: v4(),
      createdAt: new Date().toISOString(),
      amount: 100,
      counterparty: 'test',
      currency: 'SEK',
    },
  ]);
  const companySummary = await transactionService.getTransactions({
    companyId,
  });
  expect(companySummary).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        amount: 100,
        counterparty: 'test',
        currency: 'SEK',
      }),
    ]),
  );
});
