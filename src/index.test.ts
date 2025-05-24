import { describe, it, expect, vi, Mock } from 'vitest';
import { v4 } from 'uuid';
import * as api from '.';

vi.mock('./company-repository', () => ({
  getCompanies: vi.fn(() => 'mocked data'),
  getTransactions: vi.fn(),
}));

import { getCompanies, getTransactions } from './company-repository';

describe('GET /users/:userId/companies', () => {
  it('returns a list of companies', async () => {
    const userId = v4();
    const companyId = v4();
    const companyName = 'abc';
    const createdAt = new Date().toISOString();
    const latestTransactions = [{ amount: 100, currency: 'SEK' }];
    (getCompanies as Mock).mockReturnValue([
      {
        id: companyId,
        name: companyName,
        creditLimit: 1000,
        usedCredit: 500,
        createdAt,
        latestTransactions,
      },
    ]);

    const app = api.createApp();

    const response = await app.request(`/api/v1/users/${userId}/companies`, {
      method: 'GET',
    });

    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(body).toEqual([
      {
        id: companyId,
        name: companyName,
        creditLimit: 1000,
        usedCredit: 500,
        createdAt,
        latestTransactions,
      },
    ]);
  });

  it('returns an empty list of companies', async () => {
    const userId = v4();
    (getCompanies as Mock).mockReturnValue([]);
    const app = api.createApp();

    const response = await app.request(`/api/v1/users/${userId}/companies`, {
      method: 'GET',
    });

    expect(response.ok).toBe(true);
    const body = await response.json();

    expect(body).toEqual([]);
  });

  it('internal server error', async () => {
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
  it('returns a list of transactions', async () => {
    const companyId = v4();
    const transaction = {
      id: v4(),
      amount: 1000,
      currency: 'SEK',
      counterparty: 'test1 AB',
      createdAt: new Date().toISOString(),
    };
    (getTransactions as Mock).mockReturnValue([transaction]);

    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/transactions`,
      { method: 'GET' },
    );

    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual([transaction]);
  });

  it('returns an empty list of transactions', async () => {
    const companyId = v4();
    (getTransactions as Mock).mockReturnValue([]);
    const app = api.createApp();

    const response = await app.request(
      `/api/v1/companies/${companyId}/transactions`,
      { method: 'GET' },
    );

    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual([]);
  });

  it('internal server error', async () => {
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
