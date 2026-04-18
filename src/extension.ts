import * as vscode from 'vscode';
import {
  runAddCurrentFileToChat,
  runAddResourceToChat,
  runAddSelectionToChat,
  runOpenCodex,
  runPickFilesOrFoldersToChat,
} from './commands';
import { CodexLinkViewProvider } from './codexLinkViewProvider';
import { openCodexExtensionInstallPage } from './codexDependency';
import { SelectionCodeLensProvider } from './selectionCodeLensProvider';

export function activate(context: vscode.ExtensionContext): void {
  const codeLensProvider = new SelectionCodeLensProvider();
  const codexLinkViewProvider = new CodexLinkViewProvider();

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codexBridge.addSelectionToChat',
      runAddSelectionToChat,
    ),
    vscode.commands.registerCommand(
      'codexBridge.addSelectionToChatShortcut',
      runAddSelectionToChat,
    ),
    vscode.commands.registerCommand(
      'codexBridge.addResourceToChat',
      runAddResourceToChat,
    ),
    vscode.commands.registerCommand('codexBridge.installCodexDependency', () =>
      openCodexExtensionInstallPage(vscode.env.openExternal),
    ),
    vscode.commands.registerCommand('codexBridge.openCodex', runOpenCodex),
    vscode.commands.registerCommand(
      'codexBridge.addCurrentFileToChat',
      runAddCurrentFileToChat,
    ),
    vscode.commands.registerCommand(
      'codexBridge.pickFilesOrFoldersToChat',
      runPickFilesOrFoldersToChat,
    ),
    vscode.languages.registerCodeLensProvider(
      [
        { scheme: 'file' },
        { scheme: 'untitled' },
        { scheme: 'vscode-userdata' },
      ],
      codeLensProvider,
    ),
    vscode.window.registerWebviewViewProvider(
      CodexLinkViewProvider.viewType,
      codexLinkViewProvider,
    ),
    vscode.window.onDidChangeTextEditorSelection(() =>
      codeLensProvider.refresh(),
    ),
    vscode.window.onDidChangeActiveTextEditor(() => codeLensProvider.refresh()),
  );
}

export function deactivate(): void {}
