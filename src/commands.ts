import * as vscode from 'vscode';
import {
  type CodexDependencyState,
  getCodexDependencyState,
  getInstalledCodexExtension,
} from './codexDependency';
import { messages } from './messages';
import { type SelectionState, getSelectionState } from './selectionState';

type ResourceLike = { scheme: string; fsPath: string };

type CommandDeps = {
  dependencyState: CodexDependencyState;
  selectionState?: SelectionState;
  resource?: ResourceLike;
  resources?: ResourceLike[];
  wait?: (ms: number) => Promise<void>;
  showErrorMessage: (
    message: string,
    ...items: string[]
  ) => Thenable<string | undefined> | string | undefined;
  executeCommand: (command: string, ...args: unknown[]) => Thenable<unknown>;
};

export type AddResourcesResult = {
  kind: 'success' | 'error' | 'info';
  message: string;
  addedCount: number;
};

async function handleDependencyFailure(
  dependencyState: CodexDependencyState,
  executeCommand: CommandDeps['executeCommand'],
  showErrorMessage: CommandDeps['showErrorMessage'],
): Promise<AddResourcesResult | null> {
  if (dependencyState === 'missing') {
    const choice = await showErrorMessage(
      messages.missingDependency,
      messages.installAction,
    );
    if (choice === messages.installAction) {
      await executeCommand('codexBridge.installCodexDependency');
    }
    return {
      kind: 'error',
      message: messages.missingDependency,
      addedCount: 0,
    };
  }

  if (dependencyState === 'disabled') {
    showErrorMessage(messages.disabledDependency);
    return {
      kind: 'error',
      message: messages.disabledDependency,
      addedCount: 0,
    };
  }

  return null;
}

function getSuccessMessage(count: number): string {
  return count === 1 ? messages.addedSingle : messages.addedMultiple(count);
}

async function waitForCodexReady(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function addSelectionToChat(deps: CommandDeps): Promise<void> {
  const dependencyFailure = await handleDependencyFailure(
    deps.dependencyState,
    deps.executeCommand,
    deps.showErrorMessage,
  );

  if (dependencyFailure) {
    return;
  }

  if (!deps.selectionState || deps.selectionState.kind === 'unsupported') {
    deps.showErrorMessage(messages.unsupportedSelection);
    return;
  }

  if (deps.selectionState.kind === 'empty') {
    deps.showErrorMessage(messages.emptySelection);
    return;
  }

  if (deps.selectionState.kind === 'multi') {
    deps.showErrorMessage(messages.multiSelection);
    return;
  }

  const wait = deps.wait ?? waitForCodexReady;

  try {
    await deps.executeCommand('chatgpt.addToThread');
  } catch {
    try {
      await deps.executeCommand('chatgpt.openSidebar');
      await wait(150);
      await deps.executeCommand('chatgpt.addToThread');
    } catch {
      deps.showErrorMessage(messages.commandFailure);
    }
  }
}

export async function addResourceToChat(deps: CommandDeps): Promise<void> {
  await addResourcesToChat({
    dependencyState: deps.dependencyState,
    resources: deps.resource ? [deps.resource] : undefined,
    showErrorMessage: deps.showErrorMessage,
    executeCommand: deps.executeCommand,
  });
}

export async function addResourcesToChat(
  deps: CommandDeps,
): Promise<AddResourcesResult> {
  const dependencyFailure = await handleDependencyFailure(
    deps.dependencyState,
    deps.executeCommand,
    deps.showErrorMessage,
  );

  if (dependencyFailure) {
    return dependencyFailure;
  }

  if (
    !deps.resources?.length ||
    deps.resources.some((resource) => resource.scheme !== 'file')
  ) {
    deps.showErrorMessage(messages.unsupportedResource);
    return {
      kind: 'error',
      message: messages.unsupportedResource,
      addedCount: 0,
    };
  }

  try {
    for (const resource of deps.resources) {
      await deps.executeCommand('chatgpt.addFileToThread', resource);
    }

    await deps.executeCommand('chatgpt.openSidebar');

    return {
      kind: 'success',
      message: getSuccessMessage(deps.resources.length),
      addedCount: deps.resources.length,
    };
  } catch {
    deps.showErrorMessage(messages.commandFailure);
    return {
      kind: 'error',
      message: messages.commandFailure,
      addedCount: 0,
    };
  }
}

export async function runAddSelectionToChat(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const dependencyState = getCodexDependencyState(getInstalledCodexExtension());
  const selectionState = editor
    ? getSelectionState({
        documentScheme: editor.document.uri.scheme,
        selections: editor.selections.map((selection) => ({
          isEmpty: selection.isEmpty,
          startLine: selection.start.line,
        })),
      })
    : { kind: 'unsupported' as const };

  await addSelectionToChat({
    dependencyState,
    selectionState,
    showErrorMessage: vscode.window.showErrorMessage,
    executeCommand: vscode.commands.executeCommand,
  });
}

export async function runAddResourceToChat(uri?: vscode.Uri): Promise<void> {
  const dependencyState = getCodexDependencyState(getInstalledCodexExtension());

  await addResourceToChat({
    dependencyState,
    resource: uri,
    showErrorMessage: vscode.window.showErrorMessage,
    executeCommand: vscode.commands.executeCommand,
  });
}

export async function runAddResourceUrisToChat(
  uris: vscode.Uri[],
): Promise<AddResourcesResult> {
  const dependencyState = getCodexDependencyState(getInstalledCodexExtension());

  return addResourcesToChat({
    dependencyState,
    resources: uris,
    showErrorMessage: vscode.window.showErrorMessage,
    executeCommand: vscode.commands.executeCommand,
  });
}

export async function runAddCurrentFileToChat(): Promise<AddResourcesResult> {
  const editor = vscode.window.activeTextEditor;

  if (!editor || editor.document.uri.scheme !== 'file') {
    vscode.window.showErrorMessage(messages.currentFileUnavailable);
    return {
      kind: 'error',
      message: messages.currentFileUnavailable,
      addedCount: 0,
    };
  }

  return runAddResourceUrisToChat([editor.document.uri]);
}

export async function runPickFilesOrFoldersToChat(): Promise<AddResourcesResult> {
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: true,
    canSelectMany: true,
    openLabel: 'Add to Codex',
  });

  if (!uris?.length) {
    return {
      kind: 'info',
      message: messages.pickedNothing,
      addedCount: 0,
    };
  }

  return runAddResourceUrisToChat(uris);
}

export async function runOpenCodex(): Promise<AddResourcesResult> {
  try {
    await vscode.commands.executeCommand('chatgpt.openSidebar');
    return {
      kind: 'info',
      message: messages.codexOpened,
      addedCount: 0,
    };
  } catch {
    vscode.window.showErrorMessage(messages.commandFailure);
    return {
      kind: 'error',
      message: messages.commandFailure,
      addedCount: 0,
    };
  }
}
