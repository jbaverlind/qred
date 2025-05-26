import { describe, it, expect, vi } from 'vitest';
import { v4 } from 'uuid';
import { companyService } from './company';
import { companyRepo } from '../repositories/company';
import { transactionRepo } from '../repositories/transaction';
import { afterEach } from 'node:test';

describe('company service', async () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it('should return company summary', () => {});
  const userId = v4();
  vi.spyOn(companyRepo, 'getCompanies').mockResolvedValueOnce([
    {
      id: v4(),
      createdAt: new Date().toISOString(),
      name: 'test',
      status: 'ACTIVE',
      usedCredit: 100,
      creditLimit: 200,
    },
  ]);
  vi.spyOn(transactionRepo, 'getTransactionCount').mockResolvedValueOnce(1);
  vi.spyOn(transactionRepo, 'getTransactions').mockResolvedValueOnce([]);
  const companySummary = await companyService.getCompaniesSummary({ userId });
  expect(companySummary).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'test',
        creditLimit: 200,
        usedCredit: 100,
        status: 'ACTIVE',
        transactionsCount: 1,
        latestTransactions: [],
      }),
    ]),
  );
});
