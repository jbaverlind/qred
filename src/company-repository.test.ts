import {
  describe,
  it,
  beforeAll,
  afterAll,
  expect,
  vi,
  beforeEach,
} from 'vitest';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import pg from 'pg';
import { initDb } from './db';

const setupTables = async (client: pg.Client) => {
  const createTransactions = `CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL,
  counterparty TEXT NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);`;
  const createUsers = `CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);`;
  const createCompanies = `CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credit_limit INTEGER NOT NULL,
  used_credit INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'INACTIVE',
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);`;
  const createUserCompanyAccess = `CREATE TABLE user_company_access (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  PRIMARY KEY (user_id, company_id)
);`;
  await client.query(createCompanies);
  await client.query(createUsers);
  await client.query(createUserCompanyAccess);
  await client.query(createTransactions);
};

let client: pg.Client;
let pool: pg.Pool;
let container: StartedPostgreSqlContainer;

describe('company repository tests', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    client = new pg.Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });
    pool = initDb({
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    });
    await client.connect();
    await setupTables(client);

    vi.stubEnv('USER', container.getUsername());
    vi.stubEnv('PORT', container.getPort().toString());
    vi.stubEnv('PASSWORD', container.getPassword());
    vi.stubEnv('HOST', container.getHost());
    vi.stubEnv('DATABASE', container.getDatabase());
  });

  beforeEach(async () => {
    await client.query(`TRUNCATE TABLE
      transactions,
      user_company_access,
      companies,
      users
      RESTART IDENTITY CASCADE`);
  });
  afterAll(async () => {
    await client.end();
    await pool.end();
    await container.stop();
  });
  describe('getCompanies', () => {
    it('should return companies for user', async () => {
      const tasks = [
        client.query(`INSERT INTO users (id, email, name)
          VALUES
          ('00000000-0000-0000-0000-000000000001', 'alice@example.com', 'Alice'),
          ('00000000-0000-0000-0000-000000000002', 'bob@example.com', 'Bob');`),
        client.query(`INSERT INTO companies (id, name, credit_limit, used_credit, status, activated_at)
          VALUES
          ('11111111-1111-1111-1111-111111111111', 'ACME Inc', 10000, 2000, 'ACTIVE', now() - interval '3 days'),
          ('22222222-2222-2222-2222-222222222222', 'Umbrella Corp', 5000, 0, 'INACTIVE', null);`),
        client.query(`INSERT INTO user_company_access (user_id, company_id, role)
          VALUES
          ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin'),
          ('00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'viewer'),
          ('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'admin');`),
        client.query(`INSERT INTO transactions (company_id, user_id, amount, currency, counterparty, created_at)
          VALUES
          ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 1500,'SEK', 'test1', now() - interval '2 days'),
          ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 300,'SEK', 'test2', now() - interval '1 day'),
          ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 200,'SEK', 'test3', now() - interval '6 hours'),
          ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 800, 'SEK' ,'test4', now() - interval '12 hours');`),
      ];
      await Promise.all(tasks);

      const getCompanies = (await import('./company-repository')).getCompanies;
      const companies = await getCompanies({
        userId: '00000000-0000-0000-0000-000000000001',
      });

      expect(companies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: '11111111-1111-1111-1111-111111111111',
            name: 'ACME Inc',
            creditLimit: 10000,
            usedCredit: 2000,
            latestTransactions: expect.arrayContaining([
              expect.objectContaining({
                amount: 1500,
                currency: 'SEK',
                counterparty: 'test1',
              }),
              expect.objectContaining({
                amount: 300,
                currency: 'SEK',
                counterparty: 'test2',
              }),
              expect.objectContaining({
                amount: 200,
                currency: 'SEK',
                counterparty: 'test3',
              }),
            ]),
          }),
          expect.objectContaining({
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Umbrella Corp',
            status: 'INACTIVE',
            creditLimit: 5000,
            usedCredit: 0,
            latestTransactions: [
              expect.objectContaining({
                amount: 800,
                currency: 'SEK',
                counterparty: 'test4',
              }),
            ],
          }),
        ]),
      );
    });

    it('should return empty list when no companies exists for user', async () => {
      const accountId = '00000000-0000-0000-0000-000000000001';
      const tasks = [
        client.query(`INSERT INTO users (id, email, name)
          VALUES
          ('${accountId}', 'alice@example.com', 'Alice'),
          ('00000000-0000-0000-0000-000000000002', 'bob@example.com', 'Bob');`),
      ];
      await Promise.all(tasks);
      const getCompanies = (await import('./company-repository')).getCompanies;
      const companies = await getCompanies({
        userId: accountId,
      });
      expect(companies).toEqual([]);
    });
    it('should return empty transactions list when no transactions exists for company', async () => {
      const accountId = '00000000-0000-0000-0000-000000000001';
      const tasks = [
        client.query(`INSERT INTO users (id, email, name)
          VALUES
          ('${accountId}', 'alice@example.com', 'Alice');`),
        client.query(`INSERT INTO companies (id, name, credit_limit, used_credit, status, activated_at)
          VALUES
          ('11111111-1111-1111-1111-111111111111', 'ACME Inc', 10000, 2000, 'ACTIVE', now() - interval '3 days');`),
        client.query(`INSERT INTO user_company_access (user_id, company_id, role)
          VALUES
          ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin');`),
      ];

      await Promise.all(tasks);
      const getCompanies = (await import('./company-repository')).getCompanies;
      const companies = await getCompanies({
        userId: accountId,
      });
      expect(companies).toMatchObject([
        {
          usedCredit: 2000,
          creditLimit: 10000,
          name: 'ACME Inc',
          latestTransactions: [],
          id: '11111111-1111-1111-1111-111111111111',
          status: 'ACTIVE',
        },
      ]);
    });
  });

  describe('transactions', () => {
    it('should return list of transactions for company', async () => {
      const companyId = '22222222-2222-2222-2222-222222222222';
      const tasks = [
        client.query(`INSERT INTO users (id, email, name)
          VALUES
          ('00000000-0000-0000-0000-000000000001', 'alice@example.com', 'Alice'),
          ('00000000-0000-0000-0000-000000000002', 'bob@example.com', 'Bob');`),
        client.query(`INSERT INTO companies (id, name, credit_limit, used_credit, status, activated_at)
          VALUES
          ('11111111-1111-1111-1111-111111111111', 'ACME Inc', 10000, 2000, 'ACTIVE', now() - interval '3 days'),
          ('22222222-2222-2222-2222-222222222222', 'Umbrella Corp', 5000, 0, 'INACTIVE', null);`),
        client.query(`INSERT INTO user_company_access (user_id, company_id, role)
          VALUES
          ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin'),
          ('00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'viewer'),
          ('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'admin');`),
        client.query(`INSERT INTO transactions (company_id, user_id, amount, currency, counterparty, created_at)
          VALUES
          ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 1500,'SEK', 'test1', now() - interval '2 days'),
          ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 300,'SEK', 'test2', now() - interval '1 day'),
          ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 200,'SEK', 'test3', now() - interval '6 hours'),
          ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 800, 'SEK' ,'test4', now() - interval '12 hours');`),
      ];
      await Promise.all(tasks);

      const getTransactions = (await import('./company-repository'))
        .getTransactions;

      const transactions = await getTransactions({
        companyId,
      });
      expect(transactions?.length).toEqual(1);
      expect(transactions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            amount: 800,
            currency: 'SEK',
            counterparty: 'test4',
          }),
        ]),
      );
    });

    it('should return empty list when no transactions exists for company', async () => {
      const companyId = '22222222-2222-2222-2222-222222222222';
      const tasks = [
        client.query(`INSERT INTO users (id, email, name)
          VALUES
          ('00000000-0000-0000-0000-000000000001', 'alice@example.com', 'Alice'),
          ('00000000-0000-0000-0000-000000000002', 'bob@example.com', 'Bob');`),
        client.query(`INSERT INTO companies (id, name, credit_limit, used_credit, status, activated_at)
          VALUES
          ('11111111-1111-1111-1111-111111111111', 'ACME Inc', 10000, 2000, 'ACTIVE', now() - interval '3 days'),
          ('22222222-2222-2222-2222-222222222222', 'Umbrella Corp', 5000, 0, 'INACTIVE', null);`),
        client.query(`INSERT INTO user_company_access (user_id, company_id, role)
          VALUES
          ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin'),
          ('00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'viewer'),
          ('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'admin');`),
        client.query(`INSERT INTO transactions (company_id, user_id, amount, currency, counterparty, created_at)
          VALUES
          ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 1500,'SEK', 'test1', now() - interval '2 days'),
          ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 300,'SEK', 'test2', now() - interval '1 day'),
          ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 200,'SEK', 'test3', now() - interval '6 hours');`),
      ];
      await Promise.all(tasks);

      const getTransactions = (await import('./company-repository'))
        .getTransactions;

      const transactions = await getTransactions({
        companyId,
      });
      expect(transactions?.length).toEqual(0);
    });
  });

  describe('activateCompany', () => {
    it('should activate company', async () => {
      const companyId = '22222222-2222-2222-2222-222222222222';
      const tasks = [
        client.query(`INSERT INTO users (id, email, name)
          VALUES
          ('00000000-0000-0000-0000-000000000002', 'bob@example.com', 'Bob');`),
        client.query(`INSERT INTO companies (id, name, credit_limit, used_credit, status, activated_at)
          VALUES
          ('22222222-2222-2222-2222-222222222222', 'Umbrella Corp', 5000, 0, 'INACTIVE', null);`),
        client.query(`INSERT INTO user_company_access (user_id, company_id, role)
          VALUES
          ('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'admin');`),
      ];
      await Promise.all(tasks);

      const activateCompanyCard = (await import('./company-repository'))
        .activateCompanyCard;

      const company = await activateCompanyCard({
        companyId,
      });
      expect(company?.status).toEqual('ACTIVE');
    });

    it('should return null when account not exists', async () => {
      const companyId = '22222222-2222-2222-2222-222222222222';
      const activateCompanyCard = (await import('./company-repository'))
        .activateCompanyCard;

      const company = await activateCompanyCard({
        companyId,
      });

      expect(company).toBeNull();
    });
  });
});
