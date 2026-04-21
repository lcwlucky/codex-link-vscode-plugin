export type TerminalCaptureFileEntry = {
  path: string;
  modifiedTimeMs: number;
};

type CleanupPolicy = {
  nowMs: number;
  retentionHours: number;
  maxFiles: number;
};

export const defaultTerminalCaptureCleanupSettings = {
  retentionHours: 24,
  maxFiles: 100,
} as const;

export function getTerminalCaptureCleanupTargets(
  files: TerminalCaptureFileEntry[],
  policy: CleanupPolicy,
): string[] {
  const retentionCutoffMs =
    policy.nowMs - policy.retentionHours * 60 * 60 * 1000;
  const expiredFiles = files.filter(
    (file) => file.modifiedTimeMs < retentionCutoffMs,
  );
  const retainedFiles = files
    .filter((file) => file.modifiedTimeMs >= retentionCutoffMs)
    .sort((left, right) => right.modifiedTimeMs - left.modifiedTimeMs);
  const overflowFiles = retainedFiles.slice(policy.maxFiles);

  return [...expiredFiles, ...overflowFiles].map((file) => file.path);
}
