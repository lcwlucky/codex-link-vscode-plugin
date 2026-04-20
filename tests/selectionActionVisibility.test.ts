import { describe, expect, it, vi } from 'vitest';

const configurationState = vi.hoisted(() => ({
  minSingleLineSelectionLength: 50,
}));

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, fallback?: number) =>
        key === 'minSingleLineSelectionLength'
          ? configurationState.minSingleLineSelectionLength
          : fallback,
      ),
    })),
  },
}));

import { shouldShowSelectionAction } from '../src/selectionActionVisibility';

describe('selection action visibility', () => {
  it('shows for multiline selections', () => {
    const document = {
      getText: () => 'short',
    };
    const selection = {
      isEmpty: false,
      start: { line: 1, character: 0 },
      end: { line: 2, character: 2 },
    };

    expect(shouldShowSelectionAction(document as never, selection as never)).toBe(
      true,
    );
  });

  it('hides short single-token selections using the default threshold', () => {
    configurationState.minSingleLineSelectionLength = 50;
    const document = {
      getText: () => 'identifier',
    };
    const selection = {
      isEmpty: false,
      start: { line: 1, character: 0 },
      end: { line: 1, character: 10 },
    };

    expect(shouldShowSelectionAction(document as never, selection as never)).toBe(
      false,
    );
  });

  it('uses the configured threshold for long single-line expressions', () => {
    configurationState.minSingleLineSelectionLength = 8;
    const document = {
      getText: () => 'identifier',
    };
    const selection = {
      isEmpty: false,
      start: { line: 1, character: 0 },
      end: { line: 1, character: 10 },
    };

    expect(shouldShowSelectionAction(document as never, selection as never)).toBe(
      true,
    );
  });

  it('falls back to the default threshold when configuration is invalid', () => {
    configurationState.minSingleLineSelectionLength = 0;
    const document = {
      getText: () => 'identifier',
    };
    const selection = {
      isEmpty: false,
      start: { line: 1, character: 0 },
      end: { line: 1, character: 10 },
    };

    expect(shouldShowSelectionAction(document as never, selection as never)).toBe(
      false,
    );
  });
});
