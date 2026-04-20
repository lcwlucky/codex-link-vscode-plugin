export type SelectionSnapshot = {
  isEmpty: boolean;
  startLine: number;
  activeLine: number;
  activeCharacter: number;
};

export type SelectionContext = {
  documentScheme: string;
  selections: SelectionSnapshot[];
};

export type SelectionState =
  | {
      kind: 'valid';
      startLine: number;
      activeLine: number;
      activeCharacter: number;
    }
  | { kind: 'empty' }
  | { kind: 'multi' }
  | { kind: 'unsupported' };

const supportedSelectionDocumentSchemes = new Set([
  'file',
  'untitled',
  'vscode-userdata',
]);

export function getSelectionState(context: SelectionContext): SelectionState {
  if (!supportedSelectionDocumentSchemes.has(context.documentScheme)) {
    return { kind: 'unsupported' };
  }

  if (context.selections.length !== 1) {
    return { kind: 'multi' };
  }

  const [selection] = context.selections;

  if (!selection || selection.isEmpty) {
    return { kind: 'empty' };
  }

  return {
    kind: 'valid',
    startLine: selection.startLine,
    activeLine: selection.activeLine,
    activeCharacter: selection.activeCharacter,
  };
}
