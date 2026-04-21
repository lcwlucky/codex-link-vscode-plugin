import { beforeEach, describe, expect, it, vi } from 'vitest';

const vscodeMocks = vi.hoisted(() => ({
  registerCommand: vi.fn(),
  registerCodeLensProvider: vi.fn(),
  registerWebviewViewProvider: vi.fn(),
  onDidChangeTextEditorSelection: vi.fn(),
  onDidChangeActiveTextEditor: vi.fn(),
}));

vi.mock('vscode', () => ({
  commands: {
    registerCommand: vscodeMocks.registerCommand,
  },
  languages: {
    registerCodeLensProvider: vscodeMocks.registerCodeLensProvider,
  },
  window: {
    registerWebviewViewProvider: vscodeMocks.registerWebviewViewProvider,
    onDidChangeTextEditorSelection: vscodeMocks.onDidChangeTextEditorSelection,
    onDidChangeActiveTextEditor: vscodeMocks.onDidChangeActiveTextEditor,
  },
  env: {
    openExternal: vi.fn(),
  },
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn();
  },
}));

import { activate } from '../src/extension';

describe('extension activation', () => {
  beforeEach(() => {
    vscodeMocks.registerCommand.mockReset().mockReturnValue({ dispose: vi.fn() });
    vscodeMocks.registerCodeLensProvider
      .mockReset()
      .mockReturnValue({ dispose: vi.fn() });
    vscodeMocks.registerWebviewViewProvider
      .mockReset()
      .mockReturnValue({ dispose: vi.fn() });
    vscodeMocks.onDidChangeTextEditorSelection
      .mockReset()
      .mockReturnValue({ dispose: vi.fn() });
    vscodeMocks.onDidChangeActiveTextEditor
      .mockReset()
      .mockReturnValue({ dispose: vi.fn() });
  });

  it('registers the selection code lenses for file-like text documents', () => {
    const context = { subscriptions: [] as { dispose(): void }[] };

    activate(context as never);

    expect(vscodeMocks.registerCodeLensProvider).toHaveBeenCalledWith(
      [
        { scheme: 'file' },
        { scheme: 'untitled' },
        { scheme: 'vscode-userdata' },
      ],
      expect.anything(),
    );
  });

  it('registers the terminal selection command on activation', () => {
    const context = { subscriptions: [] as { dispose(): void }[] };

    activate(context as never);

    expect(vscodeMocks.registerCommand).toHaveBeenCalledWith(
      'codexBridge.addTerminalSelectionToChat',
      expect.any(Function),
    );
  });
});
