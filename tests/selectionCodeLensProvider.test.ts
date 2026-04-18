import { describe, expect, it, vi } from 'vitest';

const mockActiveTextEditor = vi.hoisted(() => ({ current: undefined }));

vi.mock('vscode', () => {
  class Position {
    constructor(
      public line: number,
      public character: number,
    ) {}
  }

  class Range {
    constructor(
      public start: Position,
      public end: Position,
    ) {}
  }

  class CodeLens {
    constructor(
      public range: Range,
      public command?: { command: string; title: string },
    ) {}
  }

  class EventEmitter {
    event = vi.fn();
    fire = vi.fn();
  }

  return {
    window: {
      get activeTextEditor() {
        return mockActiveTextEditor.current;
      },
    },
    Position,
    Range,
    CodeLens,
    EventEmitter,
  };
});

import { SelectionCodeLensProvider } from '../src/selectionCodeLensProvider';

describe('selection code lens provider', () => {
  it('shows the mac shortcut in the Add to Codex label', () => {
    const provider = new SelectionCodeLensProvider('darwin');
    const document = {
      uri: { toString: () => 'file:///tmp/example.ts', scheme: 'file' },
    };

    mockActiveTextEditor.current = {
      document,
      selections: [{ isEmpty: false, start: { line: 3 } }],
    };

    const lenses = provider.provideCodeLenses(document as never);

    expect(lenses[0]?.command?.title).toBe('Add to Codex (⌥⌘L)');
  });

  it('shows the non-mac shortcut in the Add to Codex label', () => {
    const provider = new SelectionCodeLensProvider('linux');
    const document = {
      uri: { toString: () => 'file:///tmp/example.ts', scheme: 'file' },
    };

    mockActiveTextEditor.current = {
      document,
      selections: [{ isEmpty: false, start: { line: 3 } }],
    };

    const lenses = provider.provideCodeLenses(document as never);

    expect(lenses[0]?.command?.title).toBe('Add to Codex (Ctrl+Alt+L)');
  });
});
