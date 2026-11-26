import { SubjectTokens } from '@logto/schemas';
import { createMockPool, createMockQueryResult, sql } from '@silverhand/slonik';

import { convertToIdentifiers } from '#src/utils/sql.js';
import type { QueryType } from '#src/utils/test-utils.js';
import { expectSqlAssert } from '#src/utils/test-utils.js';

const { jest } = import.meta;

const mockQuery: jest.MockedFunction<QueryType> = jest.fn();

const pool = createMockPool({
  query: async (sql, values) => mockQuery(sql, values),
});

const { createSubjectTokenQueries } = await import('./subject-token.js');
const { consumeSubjectToken } = createSubjectTokenQueries(pool);

describe('subject-token queries', () => {
  const { table, fields } = convertToIdentifiers(SubjectTokens);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(100_000);
  });

  afterEach(() => {
    mockQuery.mockReset();
    jest.useRealTimers();
  });

  it('consumes a subject token atomically only when unconsumed and unexpired', async () => {
    const expectSql = sql`
      update ${table}
      set ${fields.consumedAt}=to_timestamp($1)
      where ${fields.id}=$2
        and ${fields.consumedAt} is null
        and ${fields.expiresAt} > to_timestamp($3)
    `;

    mockQuery.mockImplementationOnce(async (sql, values) => {
      expectSqlAssert(sql, expectSql.sql);
      expect(values).toEqual([100, 'sub_tok_1', 100]);
      return { ...createMockQueryResult([]), rowCount: 1 };
    });

    await expect(consumeSubjectToken('sub_tok_1')).resolves.toBe(true);

    mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
    await expect(consumeSubjectToken('sub_tok_1')).resolves.toBe(false);
  });
});
