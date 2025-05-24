import { Hono } from 'hono';
import { getCompanies, getTransactions } from './company-repository';

export const createApp = () => {
  const app = new Hono();
  const v1 = new Hono();
  v1.get('/users/:userId/companies', async (c) => {
    const { userId } = c.req.param();
    const companies = await getCompanies({ userId });
    return c.json(companies);
  });

  v1.get('/companies/:companyId/transactions', async (c) => {
    const { companyId } = c.req.param();
    const transactions = await getTransactions({ companyId });
    return c.json(transactions);
  });
  app.route('/api/v1', v1);
  return app;
};
// const dbClient = new DynamoDBClient({})
// serve(createApp({dbClient, pqClient}), async (info) => {
//     console.log(`Listening on http://localhost:3001`);
// });
