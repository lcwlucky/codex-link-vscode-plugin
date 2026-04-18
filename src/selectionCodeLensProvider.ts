import * as vscode from 'vscode';
import { getSelectionState } from './selectionState';

export class SelectionCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  private readonly selectionLabel: string;

  readonly onDidChangeCodeLenses = this.onDidChangeEmitter.event;

  constructor(platform = process.platform) {
    this.selectionLabel =
      platform === 'darwin'
        ? 'Add to Codex (⌥⌘L)'
        : 'Add to Codex (Ctrl+Alt+L)';
  }

  refresh(): void {
    this.onDidChangeEmitter.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const editor = vscode.window.activeTextEditor;

    if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
      return [];
    }

    const state = getSelectionState({
      documentScheme: document.uri.scheme,
      selections: editor.selections.map((selection) => ({
        isEmpty: selection.isEmpty,
        startLine: selection.start.line,
      })),
    });

    if (state.kind !== 'valid') {
      return [];
    }

    const position = new vscode.Position(state.startLine, 0);

    return [
      new vscode.CodeLens(new vscode.Range(position, position), {
        command: 'codexBridge.addSelectionToChat',
        title: this.selectionLabel,
      }),
    ];
  }
}
