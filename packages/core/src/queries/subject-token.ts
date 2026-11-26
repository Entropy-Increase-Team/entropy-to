import { type CreateSubjectToken, SubjectTokens } from '@logto/schemas';
import { type CommonQueryMethods, sql } from '@silverhand/slonik';

import { buildFindEntityByIdWithPool } from '#src/database/find-entity-by-id.js';
import { buildInsertIntoWithPool } from '#src/database/insert-into.js';
import { buildUpdateWhereWithPool } from '#src/database/update-where.js';
import {
  convertToIdentifiers,
  convertToTimestamp,
  type OmitAutoSetFields,
} from '#src/utils/sql.js';

export const createSubjectTokenQueries = (pool: CommonQueryMethods) => {
  const { table, fields } = convertToIdentifiers(SubjectTokens);

  const insertSubjectToken = buildInsertIntoWithPool(pool)(SubjectTokens, {
    returning: true,
  });

  const findSubjectToken = buildFindEntityByIdWithPool(pool)(SubjectTokens);

  const updateSubjectToken = buildUpdateWhereWithPool(pool)(SubjectTokens, true);

  const updateSubjectTokenById = async (
    id: string,
    set: Partial<OmitAutoSetFields<CreateSubjectToken>>
  ) => updateSubjectToken({ set, where: { id }, jsonbMode: 'merge' });

  const consumeSubjectToken = async (id: string): Promise<boolean> => {
    const { rowCount } = await pool.query(sql`
      update ${table}
      set ${fields.consumedAt}=${convertToTimestamp()}
      where ${fields.id}=${id}
        and ${fields.consumedAt} is null
        and ${fields.expiresAt} > ${convertToTimestamp()}
    `);

    return rowCount > 0;
  };

  return {
    insertSubjectToken,
    findSubjectToken,
    updateSubjectTokenById,
    consumeSubjectToken,
  };
};
