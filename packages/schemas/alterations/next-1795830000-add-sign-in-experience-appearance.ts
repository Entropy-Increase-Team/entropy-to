import { sql } from '@silverhand/slonik';

import type { AlterationScript } from '../lib/types/alteration.js';

/** Add structured `appearance` JSONB column to sign-in experience, application, and organization tables. */
const alteration: AlterationScript = {
  up: async (pool) => {
    await pool.query(sql`
      alter table sign_in_experiences
        add column appearance jsonb not null default '{}'::jsonb;
    `);
    await pool.query(sql`
      alter table application_sign_in_experiences
        add column appearance jsonb not null default '{}'::jsonb;
    `);
    await pool.query(sql`
      alter table organizations
        add column appearance jsonb not null default '{}'::jsonb;
    `);
  },
  down: async (pool) => {
    await pool.query(sql`
      alter table organizations
        drop column appearance;
    `);
    await pool.query(sql`
      alter table application_sign_in_experiences
        drop column appearance;
    `);
    await pool.query(sql`
      alter table sign_in_experiences
        drop column appearance;
    `);
  },
};

export default alteration;
