import * as vscode from 'vscode';

export const CODEX_EXTENSION_ID = 'openai.chatgpt';

export type CodexDependencyState = 'missing' | 'ready';

type ExtensionLike = {
  id?: string;
  isActive?: boolean;
  packageJSON?: unknown;
  activate?: () => Thenable<unknown>;
};

export function getCodexDependencyState(
  extension: ExtensionLike | undefined,
): CodexDependencyState {
  if (!extension) {
    return 'missing';
  }

  return 'ready';
}

export async function activateCodexExtension(
  extension: ExtensionLike | undefined,
): Promise<void> {
  if (!extension || extension.isActive || !extension.activate) {
    return;
  }

  await extension.activate();
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
