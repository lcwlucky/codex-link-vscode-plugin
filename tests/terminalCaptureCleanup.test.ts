import { describe, expect, it } from 'vitest';
import {
  getTerminalCaptureCleanupTargets,
  type TerminalCaptureFileEntry,
} from '../src/terminalCaptureCleanupCore';

describe('terminal capture cleanup', () => {
  it('deletes files older than the retention window first', () => {
    const now = new Date('2026-04-21T12:00:00Z').getTime();
    const files: TerminalCaptureFileEntry[] = [
      {
        path: '/tmp/codex-link-terminal-selection-a/fish-1',
        modifiedTimeMs: now - 25 * 60 * 60 * 1000,
      },
      {
        path: '/tmp/codex-link-terminal-selection-b/fish-2',
        modifiedTimeMs: now - 2 * 60 * 60 * 1000,
      },
    ];

    expect(
      getTerminalCaptureCleanupTargets(files, {
        nowMs: now,
        retentionHours: 24,
        maxFiles: 100,
      }),
    ).toEqual(['/tmp/codex-link-terminal-selection-a/fish-1']);
  });

  it('deletes oldest remaining files when count exceeds maxFiles', () => {
    const now = new Date('2026-04-21T12:00:00Z').getTime();
    const files: TerminalCaptureFileEntry[] = [
      {
        path: '/tmp/codex-link-terminal-selection-a/fish-1',
        modifiedTimeMs: now - 3_000,
      },
      {
        path: '/tmp/codex-link-terminal-selection-b/fish-2',
        modifiedTimeMs: now - 2_000,
      },
      {
        path: '/tmp/codex-link-terminal-selection-c/fish-3',
        modifiedTimeMs: now - 1_000,
      },
    ];

    expect(
      getTerminalCaptureCleanupTargets(files, {
        nowMs: now,
        retentionHours: 24,
        maxFiles: 2,
      }),
    ).toEqual(['/tmp/codex-link-terminal-selection-a/fish-1']);
  });

  it('does not delete recent files when within maxFiles', () => {
    const now = new Date('2026-04-21T12:00:00Z').getTime();
    const files: TerminalCaptureFileEntry[] = [
      {
        path: '/tmp/codex-link-terminal-selection-a/fish-1',
        modifiedTimeMs: now - 2_000,
      },
      {
        path: '/tmp/codex-link-terminal-selection-b/fish-2',
        modifiedTimeMs: now - 1_000,
      },
    ];

    expect(
      getTerminalCaptureCleanupTargets(files, {
        nowMs: now,
        retentionHours: 24,
        maxFiles: 2,
      }),
    ).toEqual([]);
  });
});
