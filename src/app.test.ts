import { describe, it, expect, vi, Mock } from 'vitest';
import { v4 } from 'uuid';
import { Transaction } from './types';

vi.mock('./services', () => ({
  companyService: {
    getCompaniesSummary: vi.fn(),
  },
  transactionService: {
    getTransactions: vi.fn(),
  },
}));
import * as services from './services';
import * as api from './app';

// vi.mock('./repositories/transaction', () => ({
//   getTransactions: vi.fn(),
//   getTransactionCount: vi.fn(),
// }));

describe('GET /users/:userId/companies', () => {
  // afterEach(()=>{

  //   vi.resetAllMocks()})
  it('should return a list of companies', async () => {
    const userId = v4();
    const companyId = v4();
    const companyName = 'abc';
    const createdAt = new Date().toISOString();
    const transactionsCount = 1;
    const transaction = {
      amount: 100,
      currency: 'SEK',
      counterparty: 'test AB',
      createdAt,
      id: v4(),
    };
    const latestTransactions = [transaction];
    (services.companyService.getCompaniesSummary as Mock).mockResolvedValueOnce(
      [
        {
          id: companyId,
          name: companyName,
          creditLimit: 1000,
          usedCredit: 500,
          createdAt,
          latestTransactions,
          transactionsCount,
          status: 'ACTIVE',
        },
      ],
    );

    const app = api.createApp();

    const response = await app.request(`/api/v1/users/${userId}/companies`, {
      method: 'GET',
    });

    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(body).toEqual({
      companies: [
        expect.objectContaining({
          id: companyId,
          name: companyName,
          creditLimit: 1000,
          usedCredit: 500,
          createdAt: createdAt,
          latestTransactions: [
            { ...transaction, createdAt: transaction.createdAt },
          ],
        }),
      ],
    });
  });

  it('should return an empty list of companies', async () => {
    const userId = v4();
    (services.companyService.getCompaniesSummary as Mock).mockResolvedValueOnce(
      [],
    );
    const createApp = (await import('./app')).createApp;
    const app = createApp();

    const response = await app.request(`/api/v1/users/${userId}/companies`, {
      method: 'GET',
    });

    expect(response.ok).toBe(true);
    const body = await response.json();

    expect(body).toEqual({ companies: [] });
  });

  it('should return 500 for server error', async () => {
    const userId = v4();
    (services.companyService.getCompaniesSummary as Mock).mockRejectedValueOnce(
      new Error('Something went wrong'),
    );
    const app = api.createApp();

    const response = await app.request(`/api/v1/users/${userId}/companies`, {
      method: 'GET',
    });

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
  });
});

describe('GET /api/v1/companies/:companyId/transactions', () => {
  it('should return a list of transactions', async () => {
    const companyId = v4();
    const createdAt = new Date();
    const transaction = {
      id: v4(),
      amount: 1000,
      currency: 'SEK',
      counterparty: 'test1 AB',
      createdAt,
    };
    (services.transactionService.getTransactions as Mock).mockReturnValue([
      transaction,
    ]);

    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/transactions`,
      { method: 'GET' },
    );
    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({
      transactions: [{ ...transaction, createdAt: createdAt.toISOString() }],
    });
  });

  it('should return an empty list of transactions', async () => {
    const companyId = v4();
    (services.transactionService.getTransactions as Mock).mockReturnValue(
      [] as Transaction[],
    );
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/transactions`,
      { method: 'GET' },
    );
    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({ transactions: [] });
  });

  it('should return 500 for server error', async () => {
    const companyId = v4();
    (services.transactionService.getTransactions as Mock).mockImplementation(
      () => {
        throw new Error('Something went wrong');
      },
    );
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/transactions`,
      { method: 'GET' },
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
  });
});

// describe('PATCH /api/v1/companies/:companyId/activate', () => {
//   it('should update company with ACTIVE status', async () => {
//     const companyId = v4();
//     const companyName = 'abc';
//     const createdAt = new Date();
//     const company = {
//       id: companyId,
//       name: companyName,
//       creditLimit: 1000,
//       usedCredit: 500,
//       createdAt,
//       status: 'ACTIVE',
//     };
//     (services.companyService.activateCompany as Mock).mockReturnValue(company);
//     const app = api.createApp();

//     const response = await app.request(
//       `/api/v1/companies/${companyId}/activate`,
//       { method: 'PATCH' },
//     );
//     expect(response.ok).toBe(true);
//     expect(await response.json()).toEqual({
//       company: {
//         id: companyId,
//         name: companyName,
//         creditLimit: 1000,
//         usedCredit: 500,
//         createdAt: createdAt.toISOString(),
//         status: 'ACTIVE',
//       },
//     });
//   });
//   it('should return 404 when company not exists', async () => {
//     const companyId = v4();
//     const company = null;
//     (services.companyService.getCompaniesSummary as Mock).mockReturnValue(company);
//     const app = api.createApp();

//     const response = await app.request(
//       `/api/v1/companies/${companyId}/activate`,
//       { method: 'PATCH' },
//     );

//     expect(response.status).toBe(404);
//   });

//   it('should return 404 for when company not exists', async () => {
//     const companyId = v4();
//     (services.companyService.activateCompany as Mock).mockReturnValue(null);
//     const app = api.createApp();

//     const response = await app.request(
//       `/api/v1/companies/${companyId}/activate`,
//       { method: 'PATCH' },
//     );

//     expect(response.status).toBe(404);
//   });

//   it('should return 500 for server error', async () => {
//     const companyId = v4();
//     (services.companyService.activateCompany as Mock).mockImplementation(() => {
//       throw new Error('Something went wrong');
//     });
//     const app = api.createApp();

//     const response = await app.request(
//       `/api/v1/companies/${companyId}/activate`,
//       { method: 'PATCH' },
//     );

//     expect(response.status).toBe(500);
//   });
// });
