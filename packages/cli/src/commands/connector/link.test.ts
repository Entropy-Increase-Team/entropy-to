import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const symlinkMock = vi.spyOn(fs, 'symlink').mockResolvedValue();
vi.spyOn(fs, 'mkdir').mockResolvedValue('');
vi.spyOn(fs, 'rm').mockResolvedValue();

vi.mock('../../utils.js', () => ({
  consoleLog: {
    warn: vi.fn(),
    succeed: vi.fn(),
  },
  inquireInstancePath: vi.fn(async (inputPath?: string) => inputPath ?? '.'),
}));

vi.mock('./utils.js', () => ({
  getConnectorDirectory: (instancePath: string) =>
    path.join(instancePath, 'packages', 'core', 'connectors'),
  getLocalConnectorPackages: vi.fn(async (instancePath: string) => [
    ['connector-oauth2', path.join(instancePath, 'packages', 'connectors', 'connector-oauth2')],
    [
      'connector-mock-social',
      path.join(instancePath, 'packages', 'connectors', 'connector-mock-social'),
    ],
    [
      'connector-logto-email',
      path.join(instancePath, 'packages', 'connectors', 'connector-logto-email'),
    ],
  ]),
}));

const { default: linkCommand } = await import('./link.js');

describe('cli connector link command', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves relative instancePath without duplicating segments and skips mock/cloud connectors by default', async () => {
    await linkCommand.handler({
      path: './my-instance',
      cloud: false,
      mock: false,
      _: [],
      $0: 'logto',
    });

    expect(symlinkMock).toHaveBeenCalledTimes(1);
    const [targetArgument] = symlinkMock.mock.calls[0] ?? [];
    expect(String(targetArgument)).not.toContain(path.join('my-instance', 'my-instance'));
  });
});
