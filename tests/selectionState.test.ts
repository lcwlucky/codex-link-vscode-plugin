import { describe, expect, it } from 'vitest';
import { getSelectionState } from '../src/selectionState';

describe('selection state', () => {
  it('returns valid for a single non-empty selection in a file', () => {
    expect(
      getSelectionState({
        documentScheme: 'file',
        selections: [{ isEmpty: false, startLine: 9 }],
      }),
    ).toEqual({ kind: 'valid', startLine: 9 });
  });

  it('returns valid for a single non-empty selection in VS Code JSON settings', () => {
    expect(
      getSelectionState({
        documentScheme: 'vscode-userdata',
        selections: [{ isEmpty: false, startLine: 2 }],
      }),
    ).toEqual({ kind: 'valid', startLine: 2 });
  });

  it('returns valid for a single non-empty selection in an untitled document', () => {
    expect(
      getSelectionState({
        documentScheme: 'untitled',
        selections: [{ isEmpty: false, startLine: 4 }],
      }),
    ).toEqual({ kind: 'valid', startLine: 4 });
  });

  it('rejects empty selections', () => {
    expect(
      getSelectionState({
        documentScheme: 'file',
        selections: [{ isEmpty: true, startLine: 0 }],
      }),
    ).toEqual({ kind: 'empty' });
  });

  it('rejects multiple selections', () => {
    expect(
      getSelectionState({
        documentScheme: 'file',
        selections: [
          { isEmpty: false, startLine: 1 },
          { isEmpty: false, startLine: 3 },
        ],
      }),
    ).toEqual({ kind: 'multi' });
  });

  it('rejects non-file documents', () => {
    expect(
      getSelectionState({
        documentScheme: 'git',
        selections: [{ isEmpty: false, startLine: 1 }],
      }),
    ).toEqual({ kind: 'unsupported' });
  });
});
