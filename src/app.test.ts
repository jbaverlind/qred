import { describe, it, expect, vi, Mock } from 'vitest';
import { v4 } from 'uuid';
import * as api from './app';
import { Transaction } from './types';
vi.mock('./company-repository', () => ({
  getCompanies: vi.fn(),
  getTransactions: vi.fn(),
  activateCompanyCard: vi.fn(),
}));

import {
  getCompanies,
  getTransactions,
  activateCompanyCard,
} from './company-repository';

describe('GET /users/:userId/companies', () => {
  it('should return a list of companies', async () => {
    const userId = v4();
    const companyId = v4();
    const companyName = 'abc';
    const createdAt = new Date();
    const transactionsCount = 1;
    const transaction = {
      amount: 100,
      currency: 'SEK',
      counterparty: 'test AB',
      createdAt,
      id: v4(),
    };
    const latestTransactions = [transaction];
    (getCompanies as Mock).mockReturnValue([
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
    ]);

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
          createdAt: createdAt.toISOString(),
          latestTransactions: [
            { ...transaction, createdAt: transaction.createdAt.toISOString() },
          ],
        }),
      ],
    });
  });

  it('should return an empty list of companies', async () => {
    const userId = v4();
    (getCompanies as Mock).mockReturnValue([]);
    const app = api.createApp();

    const response = await app.request(`/api/v1/users/${userId}/companies`, {
      method: 'GET',
    });

    expect(response.ok).toBe(true);
    const body = await response.json();

    expect(body).toEqual({ companies: [] });
  });

  it('should return 404 when user not exists', async () => {
    const userId = v4();
    (getCompanies as Mock).mockReturnValue(null);
    const app = api.createApp();

    const response = await app.request(`/api/v1/users/${userId}/companies`, {
      method: 'GET',
    });

    expect(response.status).toBe(404);
  });

  it('should return 500 for server error', async () => {
    const companyId = v4();
    (getTransactions as Mock).mockImplementation(() => {
      throw new Error('Something went wrong');
    });
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/transactions`,
      { method: 'GET' },
    );

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
    (getTransactions as Mock).mockReturnValue([transaction]);

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
    (getTransactions as Mock).mockReturnValue([] as Transaction[]);
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/transactions`,
      { method: 'GET' },
    );
    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({ transactions: [] });
  });

  it('should return 404 when company not exists', async () => {
    const companyId = v4();
    (getTransactions as Mock).mockReturnValue(null);
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/transactions`,
      {
        method: 'GET',
      },
    );

    expect(response.status).toBe(404);
  });

  it('should return 500 for server error', async () => {
    const companyId = v4();
    (getTransactions as Mock).mockImplementation(() => {
      throw new Error('Something went wrong');
    });
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/transactions`,
      { method: 'GET' },
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
  });
});

describe('PATCH /api/v1/companies/:companyId/activate', () => {
  it('should update company with ACTIVE status', async () => {
    const companyId = v4();
    const companyName = 'abc';
    const createdAt = new Date();
    const company = {
      id: companyId,
      name: companyName,
      creditLimit: 1000,
      usedCredit: 500,
      createdAt,
      status: 'ACTIVE',
    };
    (activateCompanyCard as Mock).mockReturnValue(company);
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/activate`,
      { method: 'PATCH' },
    );
    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({
      company: {
        id: companyId,
        name: companyName,
        creditLimit: 1000,
        usedCredit: 500,
        createdAt: createdAt.toISOString(),
        status: 'ACTIVE',
      },
    });
  });
  it('should return 404 when company not exists', async () => {
    const companyId = v4();
    const company = null;
    (activateCompanyCard as Mock).mockReturnValue(company);
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/activate`,
      { method: 'PATCH' },
    );

    expect(response.status).toBe(404);
  });

  it('should return 404 for when company not exists', async () => {
    const companyId = v4();
    (activateCompanyCard as Mock).mockReturnValue(null);
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/activate`,
      { method: 'PATCH' },
    );

    expect(response.status).toBe(404);
  });

  it('should return 500 for server error', async () => {
    const companyId = v4();
    (activateCompanyCard as Mock).mockImplementation(() => {
      throw new Error('Something went wrong');
    });
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/activate`,
      { method: 'PATCH' },
    );

    expect(response.status).toBe(500);
  });
});
