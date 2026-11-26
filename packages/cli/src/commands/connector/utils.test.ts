import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

const execFileMock = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

const { addConnectorsToPath, normalizePackageName } = await import('./utils.js');

describe('connector CLI utils', () => {
  it('normalizes unscoped and scoped connector package names', () => {
    expect(normalizePackageName('github')).toBe('connector-github');
    expect(normalizePackageName('connector-github')).toBe('connector-github');
    expect(normalizePackageName('@logto/apple')).toBe('@logto/connector-apple');
    expect(normalizePackageName('@logto/connector-apple@~1.6.0')).toBe(
      '@logto/connector-apple@~1.6.0'
    );
  });

  it('rejects malformed or flag-like package specifiers before invoking npm pack', async () => {
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'logto-cli-conn-'));
    try {
      execFileMock.mockClear();
      await addConnectorsToPath(temporaryDirectory, ['@-bad/connector-foo', '@logto/apple;whoami']);
      expect(execFileMock).not.toHaveBeenCalled();
    } finally {
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
