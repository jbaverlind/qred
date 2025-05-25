import { Hono } from 'hono';
import {
  getCompanies,
  getTransactions,
  activateCompanyCard,
} from './company-repository';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { initDb } from './db';
import { logger } from './logger';
import dotenv from 'dotenv';
import { z } from 'zod';
import {
  CompanySchema,
  CompanySummarySchema,
  TransactionSchema,
} from './types';

dotenv.config();

initDb({
  host: process.env.PG_HOST!,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER!,
  password: process.env.PG_PASSWORD!,
  database: process.env.PG_DATABASE!,
});

export const createApp = () => {
  const app = new Hono();
  const v1 = new Hono();
  v1.get('/users/:userId/companies', async (c) => {
    try {
      const { userId } = c.req.param();
      const companies = await getCompanies({ userId });
      if (!companies) {
        return c.text('User not found', 404);
      }
      const parsedCompanies = z.array(CompanySummarySchema).parse(companies);
      return c.json({ companies: parsedCompanies });
    } catch (error) {
      logger.error(`Failed to get companies, ${JSON.stringify(error)}`);
      return c.text('Internal Server Error', 500);
    }
  });

  v1.get('/companies/:companyId/transactions', async (c) => {
    try {
      const { companyId } = c.req.param();
      const transactions = await getTransactions({ companyId });
      if (!transactions) {
        return c.text('Company not found', 404);
      }
      const parsedTransactions = z.array(TransactionSchema).parse(transactions);
      return c.json({ transactions: parsedTransactions });
    } catch (error) {
      logger.error(`Failed to get transactions, ${error}`);
      return c.text('Internal Server Error', 500);
    }
  });

  v1.patch('/companies/:companyId/activate', async (c) => {
    try {
      const { companyId } = c.req.param();
      const companyData = await activateCompanyCard({ companyId });

      if (!companyData) {
        return c.json({ error: 'Company not found' }, 404);
      }
      const company = CompanySchema.parse(companyData);
      return c.json({ company }, 200);
    } catch (error) {
      logger.error(`Failed to activate company, ${error}`);
      return c.text('Internal Server Error', 500);
    }
  });

  //if i had more time i would have stored it in s3 and redirect to s3 url
  app.use('/logo.jpg', serveStatic({ path: './public/logo.jpg' }));
  app.use('/qred-card.jpg', serveStatic({ path: './public/qred-card.jpg' }));

  app.route('/api/v1', v1);
  return app;
};

serve(createApp(), async (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
