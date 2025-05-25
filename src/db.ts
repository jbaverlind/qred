import { Pool } from 'pg';

export let pool: Pool;

export const initDb = (config: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}) => {
  pool = new Pool(config);
  return pool;
};
