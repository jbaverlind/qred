import { Hono } from 'hono';
import { companyService, transactionService } from './services';
import { serveStatic } from '@hono/node-server/serve-static';
import { initDb } from './db';
import { logger } from './logger';
import dotenv from 'dotenv';
import { z } from 'zod';
import { TransactionSchema } from './types';

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
    console.log(c);
    try {
      const { userId } = c.req.param();
      const companies = await companyService.getCompaniesSummary({ userId });
      return c.json({ companies });
    } catch (error) {
      logger.error(`Failed to get companies, ${JSON.stringify(error)}`);
      return c.text('Internal Server Error', 500);
    }
  });

  v1.get('/companies/:companyId/transactions', async (c) => {
    try {
      const { companyId } = c.req.param();
      const transactions = await transactionService.getTransactions({
        companyId,
      });
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
      const company = await companyService.activateCompanyCard({ companyId });

      if (!company) {
        return c.json({ error: 'Company not found' }, 404);
      }

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

// serve(createApp(), async (info) => {
//   console.log(`Listening on http://localhost:${info.port}`);
// });
