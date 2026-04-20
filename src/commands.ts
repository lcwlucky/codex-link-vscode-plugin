import * as vscode from 'vscode';
import {
  activateCodexExtension,
  type CodexDependencyState,
  getCodexDependencyState,
  getInstalledCodexExtension,
} from './codexDependency';
import { messages } from './messages';
import { type SelectionState, getSelectionState } from './selectionState';

type ResourceLike = { scheme: string; fsPath: string };

export type SelectionCommandSnapshot = {
  anchorLine: number;
  anchorCharacter: number;
  activeLine: number;
  activeCharacter: number;
};

export type AddSelectionToChatArgs = {
  documentUri: string;
  selections: SelectionCommandSnapshot[];
};

type CommandDeps = {
  dependencyState: CodexDependencyState;
  selectionState?: SelectionState;
  restoreSelections?: () => Thenable<void> | void;
  resource?: ResourceLike;
  resources?: ResourceLike[];
  initialSidebarReadyMs?: number;
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

  return null;
}

function getSuccessMessage(count: number): string {
  return count === 1 ? messages.addedSingle : messages.addedMultiple(count);
}

async function waitForCodexReady(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function toSelectionStateSnapshot(
  selection: SelectionCommandSnapshot,
): SelectionState {
  const startLine = Math.min(selection.anchorLine, selection.activeLine);

  return {
    kind: 'valid',
    startLine,
    activeLine: selection.activeLine,
    activeCharacter: selection.activeCharacter,
  };
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
  const initialSidebarReadyMs = deps.initialSidebarReadyMs ?? 150;

  try {
    await deps.executeCommand('chatgpt.openSidebar');
    await wait(initialSidebarReadyMs);
    await deps.restoreSelections?.();
    await wait(0);
    await deps.executeCommand('chatgpt.addToThread');
  } catch {
    try {
      await deps.executeCommand('chatgpt.openSidebar');
      await wait(150);
      await deps.restoreSelections?.();
      await wait(0);
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

export async function runAddSelectionToChat(
  args?: AddSelectionToChatArgs,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const codexExtension = getInstalledCodexExtension();
  const wasInactiveBeforeCommand = !!codexExtension && !codexExtension.isActive;
  const dependencyState = getCodexDependencyState(codexExtension);
  await activateCodexExtension(codexExtension);
  const shouldRestoreSelection =
    !!editor &&
    !!args &&
    editor.document.uri.toString() === args.documentUri &&
    args.selections.length > 0;
  const selectionState =
    shouldRestoreSelection && args.selections.length === 1
      ? toSelectionStateSnapshot(args.selections[0])
      : editor
        ? getSelectionState({
            documentScheme: editor.document.uri.scheme,
            selections: editor.selections.map((selection) => ({
              isEmpty: selection.isEmpty,
              startLine: selection.start.line,
              activeLine: selection.active.line,
              activeCharacter: selection.active.character,
            })),
          })
        : { kind: 'unsupported' as const };

  await addSelectionToChat({
    dependencyState,
    selectionState,
    initialSidebarReadyMs: wasInactiveBeforeCommand ? 1000 : 150,
    restoreSelections:
      shouldRestoreSelection && editor
        ? async () => {
            const focusedEditor = await vscode.window.showTextDocument(
              editor.document,
              {
                viewColumn: editor.viewColumn,
                preserveFocus: false,
              },
            );
            const restoredSelections = args.selections.map(
              (selection) =>
                new vscode.Selection(
                  selection.anchorLine,
                  selection.anchorCharacter,
                  selection.activeLine,
                  selection.activeCharacter,
                ),
            );
            focusedEditor.selections = restoredSelections;
            focusedEditor.selection = restoredSelections[0];
          }
        : undefined,
    showErrorMessage: vscode.window.showErrorMessage,
    executeCommand: vscode.commands.executeCommand,
  });
}

export async function runAddResourceToChat(uri?: vscode.Uri): Promise<void> {
  const codexExtension = getInstalledCodexExtension();
  const dependencyState = getCodexDependencyState(codexExtension);
  await activateCodexExtension(codexExtension);

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
  const codexExtension = getInstalledCodexExtension();
  const dependencyState = getCodexDependencyState(codexExtension);
  await activateCodexExtension(codexExtension);

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
    await activateCodexExtension(getInstalledCodexExtension());
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
