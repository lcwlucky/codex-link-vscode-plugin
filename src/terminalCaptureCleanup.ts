import { readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as vscode from 'vscode';
import {
  defaultTerminalCaptureCleanupSettings,
  getTerminalCaptureCleanupTargets,
  type TerminalCaptureFileEntry,
} from './terminalCaptureCleanupCore';

const TERMINAL_CAPTURE_DIRECTORY_PREFIX = 'codex-link-terminal-selection-';

export function getTerminalCaptureCleanupSettings(): {
  retentionHours: number;
  maxFiles: number;
} {
  const config = vscode.workspace.getConfiguration('codexLink');

  return {
    retentionHours: config.get<number>(
      'terminalCaptureRetentionHours',
      defaultTerminalCaptureCleanupSettings.retentionHours,
    ),
    maxFiles: config.get<number>(
      'terminalCaptureMaxFiles',
      defaultTerminalCaptureCleanupSettings.maxFiles,
    ),
  };
}

export async function cleanupTerminalCaptureFiles(): Promise<void> {
  const { retentionHours, maxFiles } = getTerminalCaptureCleanupSettings();
  const tempRoot = tmpdir();
  const directoryNames = await readdir(tempRoot).catch(() => []);
  const terminalCaptureDirectories = directoryNames
    .filter((name) => name.startsWith(TERMINAL_CAPTURE_DIRECTORY_PREFIX))
    .map((name) => join(tempRoot, name));
  const files = (
    await Promise.all(
      terminalCaptureDirectories.map(async (directoryPath) => {
        const fileNames = await readdir(directoryPath).catch(() => []);

        return Promise.all(
          fileNames.map(async (fileName) => {
            const filePath = join(directoryPath, fileName);
            const fileStat = await stat(filePath).catch(() => undefined);

            if (!fileStat?.isFile()) {
              return undefined;
            }

            return {
              path: filePath,
              modifiedTimeMs: fileStat.mtimeMs,
            } satisfies TerminalCaptureFileEntry;
          }),
        );
      }),
    )
  )
    .flat()
    .filter((file): file is TerminalCaptureFileEntry => !!file);
  const targets = getTerminalCaptureCleanupTargets(files, {
    nowMs: Date.now(),
    retentionHours,
    maxFiles,
  });

  await Promise.all(
    targets.map(async (filePath) => {
      await rm(filePath, { force: true });
      await rm(join(filePath, '..'), { recursive: true, force: true });
    }),
  );
}
