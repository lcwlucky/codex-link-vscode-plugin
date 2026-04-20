import * as vscode from 'vscode';

const MIN_SINGLE_LINE_SELECTION_LENGTH = 50;
const CONFIGURATION_SECTION = 'codexLink';
const MIN_LENGTH_CONFIGURATION_KEY = 'minSingleLineSelectionLength';

function getMinSingleLineSelectionLength(): number {
  const configuredValue = vscode.workspace
    .getConfiguration(CONFIGURATION_SECTION)
    .get<number>(
      MIN_LENGTH_CONFIGURATION_KEY,
      MIN_SINGLE_LINE_SELECTION_LENGTH,
    );

  return typeof configuredValue === 'number' && configuredValue >= 1
    ? configuredValue
    : MIN_SINGLE_LINE_SELECTION_LENGTH;
}

export function shouldShowSelectionAction(
  document: vscode.TextDocument,
  selection: vscode.Selection,
): boolean {
  if (selection.isEmpty) {
    return false;
  }

  if (selection.start.line !== selection.end.line) {
    return true;
  }

  const selectedText = document.getText(selection).trim();

  if (!selectedText) {
    return false;
  }

  return (
    /\s/.test(selectedText) ||
    selectedText.length >= getMinSingleLineSelectionLength()
  );
}
