import * as vscode from 'vscode';

export const CODEX_EXTENSION_ID = 'openai.chatgpt';

export type CodexDependencyState = 'missing' | 'disabled' | 'ready';

type ExtensionLike = {
  id?: string;
  isActive?: boolean;
  packageJSON?: unknown;
};

export function getCodexDependencyState(
  extension: ExtensionLike | undefined,
): CodexDependencyState {
  if (!extension) {
    return 'missing';
  }

  return extension.isActive ? 'ready' : 'disabled';
}

export function getInstalledCodexExtension():
  | vscode.Extension<unknown>
  | undefined {
  return vscode.extensions.getExtension(CODEX_EXTENSION_ID);
}

export function getCodexExtensionMarketplaceUri(): vscode.Uri {
  return vscode.Uri.parse(`vscode:extension/${CODEX_EXTENSION_ID}`);
}

export async function openCodexExtensionInstallPage(
  openExternal: (uri: vscode.Uri) => Thenable<unknown>,
): Promise<void> {
  await openExternal(getCodexExtensionMarketplaceUri());
}
