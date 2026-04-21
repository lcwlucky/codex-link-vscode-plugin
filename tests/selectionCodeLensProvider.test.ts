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
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn((_: string, fallback?: number) => fallback),
      })),
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
      getText: () => 'const result = value;',
    };

    mockActiveTextEditor.current = {
      document,
      selections: [
        {
          isEmpty: false,
          anchor: { line: 3, character: 2 },
          active: { line: 4, character: 18 },
          start: { line: 3, character: 2 },
          end: { line: 4, character: 18 },
        },
      ],
    };

    const lenses = provider.provideCodeLenses(document as never);

    expect(lenses[0]?.command?.title).toBe('Add to Codex (⌥⌘L)');
  });

  it('shows the non-mac shortcut in the Add to Codex label', () => {
    const provider = new SelectionCodeLensProvider('linux');
    const longSingleLineToken = 'x'.repeat(120);
    const document = {
      uri: { toString: () => 'file:///tmp/example.ts', scheme: 'file' },
      getText: () => longSingleLineToken,
    };

    mockActiveTextEditor.current = {
      document,
      selections: [
        {
          isEmpty: false,
          anchor: { line: 1, character: 0 },
          active: { line: 1, character: 120 },
          start: { line: 1, character: 0 },
          end: { line: 1, character: 120 },
        },
      ],
    };

    const lenses = provider.provideCodeLenses(document as never);

    expect(lenses[0]?.command?.title).toBe('Add to Codex (Ctrl+Alt+L)');
  });

  it('hides the code lens for short single-token selections', () => {
    const provider = new SelectionCodeLensProvider('linux');
    const document = {
      uri: { toString: () => 'file:///tmp/example.ts', scheme: 'file' },
      getText: () => 'variable',
    };

    mockActiveTextEditor.current = {
      document,
      selections: [
        {
          isEmpty: false,
          anchor: { line: 1, character: 0 },
          active: { line: 1, character: 8 },
          start: { line: 1, character: 0 },
          end: { line: 1, character: 8 },
        },
      ],
    };

    expect(provider.provideCodeLenses(document as never)).toEqual([]);
  });
});
