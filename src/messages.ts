export const messages = {
  missingDependency:
    "This action requires the Codex – OpenAI's coding agent extension.",
  disabledDependency:
    'Codex is installed but disabled. Enable it and try again.',
  unsupportedResource:
    'Add to Codex only supports local files and folders.',
  unsupportedSelection:
    'Add to Codex only supports selections from local files, untitled documents, or VS Code JSON settings editors.',
  emptySelection: 'Select some text before adding it to chat.',
  emptyTerminalSelection: 'Select some terminal text before adding it to Codex.',
  multiSelection: 'Add to Codex supports a single selection.',
  commandFailure:
    'Unable to send context to Codex. Open the Codex sidebar and try again.',
  installAction: 'Install Codex',
  currentFileUnavailable: 'Open a local file before adding it to Codex.',
  pickedNothing: 'No files or folders were selected.',
  codexOpened: 'Codex opened.',
  dropHint:
    'Use Pick Files or Folder to reliably add resources to Codex.',
  addedSingle: 'Added 1 item to Codex.',
  addedMultiple: (count: number) => `Added ${count} items to Codex.`,
} as const;
