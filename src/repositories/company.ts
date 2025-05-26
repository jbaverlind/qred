import { pool } from '../db';
import { Company, CompanySchema } from '../types';
import { z } from 'zod';
export const companyRepo = {
  getCompanies: async ({ userId }: { userId: string }): Promise<Company[]> => {
    const client = pool;
    const userCompanies = await client.query(
      `
        SELECT c.id, c.name, c.credit_limit, c.used_credit, c.created_at, c.status from companies c 
        JOIN user_company_access uca 
        ON c.id = uca.company_id
        WHERE uca.user_id = $1
      `,
      [userId],
    );
    return z.array(CompanySchema).parse(
      userCompanies.rows.map((c) => {
        return {
          id: c.id,
          name: c.name,
          createdAt: c.created_at,
          creditLimit: c.credit_limit,
          usedCredit: c.used_credit,
          status: c.status,
        };
      }),
    );
  },

  activateCompanyCard: async ({
    companyId,
  }: {
    companyId: string;
  }): Promise<Company | null> => {
    const updatedCompanyResult = await pool.query(
      `UPDATE companies SET status = 'ACTIVE', activated_at = now() where id = $1
      RETURNING id, name, status, credit_limit, used_credit, activated_at, created_at;`,
      [companyId],
    );
    if (updatedCompanyResult.rowCount === 0) {
      return null;
    }
    const updatedCompany = updatedCompanyResult.rows[0];
    const company = {
      id: updatedCompany.id,
      name: updatedCompany.name,
      creditLimit: updatedCompany.credit_limit,
      usedCredit: updatedCompany.used_credit,
      createdAt: updatedCompany.created_at,
      status: updatedCompany.status,
    };
    return company;
  },
};
